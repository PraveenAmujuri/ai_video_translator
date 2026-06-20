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
import base64
import httpx
import json

async def transcribe_and_translate_audio(
    audio_path: Path,
    source_language: Optional[str] = None,
    target_language: str = "en"
) -> Dict[str, Any]:
    """
    Transcribes and translates audio in one step using the Gemini 2.5 Flash Lite free model via OpenRouter.
    Encodes raw audio file as Inline Base64 data to entirely bypass chunked file routing limits and regional geo-blocks.
    """
    # 1. Gather OpenRouter API Authentication Credentials
    api_key = getattr(settings, "OPENROUTER_API_KEY", None) or os.environ.get("OPENROUTER_API_KEY")
    
    if not api_key:
        # Fallback to check if it's stored under GEMINI_API_KEY in lingering cached files
        api_key = getattr(settings, "GEMINI_API_KEY", None) or os.environ.get("GEMINI_API_KEY")

    if not api_key or api_key == "":
        raise RuntimeError("OpenRouter API Key (OPENROUTER_API_KEY) missing from active environment configuration pools.")

    # 2. Extract extension format and convert your file track to a Base64 context string
    file_extension = audio_path.suffix.lower().replace(".", "")
    if file_extension not in ["wav", "mp3", "m4a", "aac", "ogg", "flac"]:
        file_extension = "wav"  # Default fallback handling bounds

    logger.info(f"Encoding {audio_path.name} to base64 for OpenRouter pipeline...")
    try:
        audio_bytes = audio_path.read_bytes()
        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to read/encode raw audio tracking files: {e}")
        raise RuntimeError(f"Audio file conversion bottleneck: {e}")

    LANGUAGE_NAMES = {
        "en": "English", "hi": "Hindi", "te": "Telugu", "ta": "Tamil",
        "ja": "Japanese", "es": "Spanish", "fr": "French", "de": "German"
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
Return the result strictly as a valid, single JSON object containing a "language" string and a "segments" array matching this exact schema:
{{
  "language": "string",
  "segments": [
     {{"id": 0, "start": 0.0, "end": 2.5, "text": "original text", "translated": "translated text"}}
  ]
}}
"""

    # 3. Assemble standard OpenAI-compatible Multi-modal Payload Block targeting OpenRouter
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://praveenai.tech/echox",  # Optional: For OpenRouter ranking data tracking panels
        "X-Title": "EchoX Desktop Workflow Engine"
    }

    # OpenRouter parses audio payloads seamlessly via standard user messages with content lists
    payload = {
        "model": "google/gemini-2.5-flash-lite:free",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": base64_audio,
                            "format": file_extension
                        }
                    }
                ]
            }
        ],
        "response_format": {"type": "json_object"},  # Enforces a valid json response layout format
        "temperature": 0.2
    }

    try:
        logger.info("Forwarding translation data payload directly to OpenRouter API (google/gemini-2.5-flash-lite:free)...")
        
        # Increase connection timeouts to allow for file uploads and analytical generation tracking processing periods
        async with httpx.AsyncClient(timeout=360.0) as http_client:
            response = await http_client.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                logger.error(f"OpenRouter transaction failure: Status {response.status_code} - Context: {response.text}")
                raise RuntimeError(f"OpenRouter API returned error state code {response.status_code}")
                
            response_data = response.json()

        # 4. Extract generated model text text strings cleanly
        raw_llm_text = response_data["choices"][0]["message"]["content"]
        logger.info("Successfully received structural payload content back from OpenRouter.")

        try:
            parsed_data = json.loads(raw_llm_text)
        except Exception as parse_err:
            logger.error(f"Failed to parse text payload from model response container: {raw_llm_text}. Error: {parse_err}")
            raise RuntimeError(f"JSON parsing error from OpenRouter endpoint mapping: {parse_err}")

        # 5. Normalize response properties to match your pipeline's downstream expectations
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

    except Exception as exc:
        logger.error(f"Pipeline error encountered during execution loop: {exc}")
        raise exc
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