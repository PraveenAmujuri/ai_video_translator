import asyncio
import logging
import wave
from pathlib import Path
from typing import List, Optional, Dict, Any

from core.config import settings

logger = logging.getLogger(__name__)

# -----------------------------
# GLOBAL MODEL CACHE & GEMINI CLIENT
# -----------------------------

import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

_piper_models = {}
_model_lock = asyncio.Lock()

MODEL_REGISTRY = {
    "en": "models/en_US-lessac-medium.onnx",
    "hi": "models/hi_IN-rohan-medium.onnx",
    "te": "models/te_IN-maya-medium.onnx",
}


class Segment(BaseModel):
    id: int = Field(description="Segment sequence number starting from 0")
    start: float = Field(description="Start time of the segment in seconds")
    end: float = Field(description="End time of the segment in seconds")
    text: str = Field(description="Original transcription text in the language spoken in the audio")
    translated: str = Field(description="Translation of the transcription text into the target language")


class TranscriptionTranslationResponse(BaseModel):
    segments: List[Segment] = Field(description="List of transcription segments with timestamps and translations")
    language: str = Field(description="Detected language code (e.g. 'en', 'es', 'hi', 'te') of the original spoken audio")


# -----------------------------
# MULTIMODAL TRANSCRIBE AND TRANSLATE
# -----------------------------

async def transcribe_and_translate_audio(
    audio_path: Path,
    source_language: Optional[str] = None,
    target_language: str = "en"
) -> Dict[str, Any]:
    """
    Transcribes and translates audio in one step using the gemini-3.1-flash-lite multimodal model.
    Routes requests through a custom Cloudflare Worker to bypass East Asia geo-restrictions
    and safely streams large media payloads.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY missing from settings and environment.")

    CLOUDFLARE_PROXY_URL = "https://solitary-frog-c60a.saipraveenamujuri.workers.dev/"
    
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(base_url=CLOUDFLARE_PROXY_URL)
    )

    logger.info(f"Uploading audio file {audio_path.name} to Gemini Files API via Cloudflare Proxy...")
    audio_file = await asyncio.to_thread(client.files.upload, file=audio_path)

    LANGUAGE_NAMES = {
        "en": "English",
        "hi": "Hindi",
        "te": "Telugu",
        "ta": "Tamil",
        "ja": "Japanese",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
    }
    target_language_name = LANGUAGE_NAMES.get(target_language, target_language)

    prompt = f"""
You are a state-of-the-art multimodal audio transcription and translation system.
Listen to the entire audio file provided and perform the following actions:
1. Detect the main spoken language in the audio (e.g. 'en', 'hi', 'te', 'es', etc.).
2. Segment the audio naturally, ensuring each segment represents a complete phrase or clause of 2 to 7 seconds duration. Do not skip any words or parts of the audio.
3. Transcribe the spoken audio verbatim inside the segment. Place the transcription of the original spoken language in the `"text"` field of the segment.
4. Translate the segment text directly into "{target_language_name}". Place the translated text in the `"translated"` field of the segment. Keep the translation natural and conversational.
5. Provide accurate start and end timestamps in seconds for each segment.

Be extremely precise. The timestamps must align perfectly with the audio events.
Return the result strictly as a JSON object matching the requested schema.
"""

    try:
        logger.info("Generating content using gemini-3.1-flash-lite via proxy...")

        def _generate():
            return client.models.generate_content(
                model='gemini-3.1-flash-lite',
                contents=[audio_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=TranscriptionTranslationResponse,
                    temperature=0.2,
                )
            )

        response = await asyncio.to_thread(_generate)

        import json
        logger.info("Successfully received response from Gemini API.")

        try:
            if response.text:
                parsed_data = json.loads(response.text)
            else:
                raise ValueError("Response text is empty.")
        except Exception as parse_err:
            logger.error(f"Failed to parse Gemini response text: {response.text}. Error: {parse_err}")
            raise RuntimeError(f"JSON parsing error from Gemini model: {parse_err}")

        segments = parsed_data.get("segments", [])
        formatted_segments = []
        for i, seg in enumerate(segments):
            formatted_segments.append({
                "id": seg.get("id", i),
                "start": float(seg.get("start", 0.0)),
                "end": float(seg.get("end", 0.0)),
                "text": seg.get("text", "").strip(),
                "translated": seg.get("translated", "").strip(),
            })

        return {
            "segments": formatted_segments,
            "language": parsed_data.get("language", source_language or "en")
        }

    finally:
        logger.info(f"Cleaning up uploaded audio file {audio_file.name} from Gemini storage via proxy...")
        try:
            await asyncio.to_thread(client.files.delete, name=audio_file.name)
            logger.info("Gemini file cleanup completed successfully.")
        except Exception as cleanup_err:
            logger.warning(f"Failed to delete file {audio_file.name}: {cleanup_err}")
# -----------------------------
# PIPER TTS
# -----------------------------

async def get_piper_voice(lang_code: str):

    from piper.voice import PiperVoice

    global _piper_models

    async with _model_lock:

        if lang_code not in _piper_models:

            model_path = MODEL_REGISTRY.get(
                lang_code,
                MODEL_REGISTRY["en"],
            )

            if not Path(model_path).exists():

                logger.warning(
                    f"Model not found: {model_path}"
                )

                model_path = MODEL_REGISTRY["en"]

            logger.info(
                f"Loading Piper model: {model_path}"
            )

            _piper_models[lang_code] = PiperVoice.load(
                model_path
            )

    return _piper_models[lang_code]

async def generate_tts_audio(
    segments,
    voice,
    output_path,
    **kwargs
):

    import wave
    import tempfile

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    lang_code = voice.split("-")[0].lower()

    voice_model = await get_piper_voice(
        lang_code
    )

    loop = asyncio.get_event_loop()

    texts = []

    for seg in segments:

        text = seg.get("translated") or seg.get("text", "")

        text = text.strip()

        if text:
            texts.append(text)

    if not texts:

        raise RuntimeError(
            "No text available for TTS"
        )

    logger.info(
        f"Piper segment count: {len(texts)}"
    )

    temp_wavs = []

    def _generate_segment_audio():

        for i, text in enumerate(texts):

            logger.info(
                f"Synthesizing segment {i+1}/{len(texts)}"
            )

            temp_file = tempfile.NamedTemporaryFile(
                suffix=".wav",
                delete=False,
            )

            temp_path = Path(temp_file.name)

            temp_file.close()

            with wave.open(
                str(temp_path),
                "wb",
            ) as wav_file:

                wav_file.setnchannels(1)

                wav_file.setsampwidth(2)

                wav_file.setframerate(
                    voice_model.config.sample_rate
                )

                chunks = voice_model.synthesize(
                    text
                )

                wrote_audio = False

                for chunk in chunks:

                    if hasattr(
                        chunk,
                        "audio_int16_bytes"
                    ):

                        wav_file.writeframes(
                            chunk.audio_int16_bytes
                        )

                        wrote_audio = True

                    elif hasattr(chunk, "audio"):

                        wav_file.writeframes(
                            chunk.audio
                        )

                        wrote_audio = True

                    elif isinstance(chunk, bytes):

                        wav_file.writeframes(
                            chunk
                        )

                        wrote_audio = True

                if wrote_audio:

                    temp_wavs.append(temp_path)

                else:

                    logger.warning(
                        f"No audio written for segment {i}"
                    )

    await asyncio.wait_for(
        loop.run_in_executor(
            None,
            _generate_segment_audio
        ),
        timeout=300,
    )

    if not temp_wavs:

        raise RuntimeError(
            "No valid audio segments generated"
        )

    # CONCAT WAV FILES

    concat_txt = (
        output_path.parent / "concat.txt"
    )

    with open(
        concat_txt,
        "w",
        encoding="utf-8"
    ) as f:

        for wav in temp_wavs:

            f.write(
                f"file '{wav.as_posix()}'\n"
            )

    from core.utils import run_subprocess
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_txt),

        "-vn",

        "-ar",
        "44100",

        "-ac",
        "2",

        "-c:a",
        "libmp3lame",

        "-b:a",
        "192k",

        str(output_path),
    ]

    returncode, stdout, stderr = await run_subprocess(
        cmd
    )

    for wav in temp_wavs:

        if wav.exists():
            wav.unlink()

    if concat_txt.exists():
        concat_txt.unlink()

    if returncode != 0:

        raise RuntimeError(
            f"FFmpeg concat failed: {stderr}"
        )

    if not output_path.exists():

        raise RuntimeError(
            "Final TTS output missing"
        )

    if output_path.stat().st_size == 0:

        raise RuntimeError(
            "Final TTS file empty"
        )

    logger.info(
        f"Piper TTS completed: {output_path}"
    )

    return output_path

# -----------------------------
# AVAILABLE VOICES
# -----------------------------

async def get_available_voices() -> List[Dict]:

    return [
        {
            "name": "en",
            "display_name": "English",
            "locale": "en-US",
            "language": "en",
            "gender": "Female",
            "neural": True,
        },
        {
            "name": "hi",
            "display_name": "Hindi",
            "locale": "hi-IN",
            "language": "hi",
            "gender": "Male",
            "neural": True,
        },
        {
            "name": "te",
            "display_name": "Telugu",
            "locale": "te-IN",
            "language": "te",
            "gender": "Female",
            "neural": True,
        },
    ]