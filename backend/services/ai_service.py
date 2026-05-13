import asyncio
import logging
import wave
from pathlib import Path
from typing import List, Optional, Dict, Any

from core.config import settings

logger = logging.getLogger(__name__)

# -----------------------------
# GLOBAL MODEL CACHE
# -----------------------------

_whisper_model = None
_piper_models = {}
_model_lock = asyncio.Lock()

MODEL_REGISTRY = {
    "en": "models/en_US-lessac-medium.onnx",
    "hi": "models/hi_IN-rohan-medium.onnx",
    "te": "models/te_IN-maya-medium.onnx",
}


# -----------------------------
# WHISPER
# -----------------------------

async def get_whisper_model():

    global _whisper_model

    async with _model_lock:

        if _whisper_model is None:

            from faster_whisper import WhisperModel

            logger.info(
                f"Loading Whisper model: {settings.WHISPER_MODEL}"
            )

            _whisper_model = WhisperModel(
                settings.WHISPER_MODEL,
                device=settings.WHISPER_DEVICE,
            )

    return _whisper_model


async def transcribe_audio(
    audio_path: Path,
    source_language: Optional[str] = None,
) -> Dict[str, Any]:

    model = await get_whisper_model()

    loop = asyncio.get_event_loop()

    def _transcribe():

        segments_iter, info = model.transcribe(
            str(audio_path),
            language=source_language if source_language != "auto" else None,
            vad_filter=True,
        )

        segments = []

        for seg in segments_iter:

            segments.append({
                "id": seg.id,
                "start": seg.start,
                "end": seg.end,
                "text": seg.text.strip(),
            })

        return {
            "segments": segments,
            "language": info.language,
        }

    return await loop.run_in_executor(
        None,
        _transcribe,
    )


# -----------------------------
# TRANSLATION
# -----------------------------
async def translate_segments(
    segments: List[Dict],
    source_lang: str,
    target_lang: str,
) -> List[Dict]:

    import requests
    import asyncio
    import json

    LANGUAGE_NAMES = {
        "en": "English",
        "hi": "Hindi",
        "te": "Telugu",
        "ta": "Tamil",
        "ja": "Japanese",
    }

    target_language_name = LANGUAGE_NAMES.get(
        target_lang,
        target_lang,
    )

    source_language_name = LANGUAGE_NAMES.get(
        source_lang,
        source_lang,
    )

    api_key = settings.GEMINI_API_KEY
    
    model_name = settings.GEMINI_MODEL

    if not api_key:
        raise RuntimeError(
            "Gemini API key missing"
        )

    if source_lang == target_lang:

        for seg in segments:
            seg["translated"] = seg["text"]

        return segments

    translated_segments = []

    loop = asyncio.get_event_loop()

    for seg in segments:

        original = seg["text"].strip()

        if not original:

            seg["translated"] = ""
            translated_segments.append(seg)
            continue

        prompt = f"""
You are a professional subtitle localizer.

Translate the following spoken {source_language_name}
into natural conversational {target_language_name}
for AI video dubbing.

RULES:
- Keep meaning accurate
- Keep subtitles short and natural
- Do NOT translate word-by-word
- Preserve tone and conversational flow
- Return ONLY valid JSON
- Do NOT add markdown
- Do NOT explain anything
- Do NOT add extra keys

RESPONSE FORMAT:
{{
  "translated": "translated text here"
}}

TEXT:
{original}
"""

        url = (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{model_name}:generateContent?key={api_key}"
        )

        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "topP": 0.8,
                "topK": 20,
                "maxOutputTokens": 256,
            }
        }

        def _translate():

            response = requests.post(
                url,
                json=body,
                timeout=40,
            )

            response.raise_for_status()

            data = response.json()

            text = data["candidates"][0]["content"]["parts"][0]["text"]

            text = text.strip()

            if text.startswith("```json"):
                text = text.replace("```json", "")
                text = text.replace("```", "")
                text = text.strip()

            parsed = json.loads(text)

            translated = parsed.get(
                "translated",
                original,
            )

            return translated.strip()

        try:

            translated = await loop.run_in_executor(
                None,
                _translate,
            )

            logger.info(
                f"{original} -> {translated}"
            )

            seg["translated"] = translated

        except Exception as e:

            logger.exception(e)

            seg["translated"] = original

        translated_segments.append(seg)

    return translated_segments

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
        "-c",
        "copy",
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