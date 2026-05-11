import asyncio
import logging
import os
import wave
from pathlib import Path
from typing import List, Optional, Dict, Any

from core.config import settings

logger = logging.getLogger(__name__)

# --- GLOBAL MODELS CACHE ---
_whisper_model = None
_piper_models = {}
_model_lock = asyncio.Lock()

# Define paths to your local .onnx models
# Download and place these in /backend/models/
MODEL_REGISTRY = {
    "en": "models/en_US-lessac-medium.onnx",
    "hi": "models/hi_IN-rohan-medium.onnx",
    "te": "models/te_IN-maya-medium.onnx"
}

# --- WHISPER LOGIC ---

async def get_whisper_model():
    global _whisper_model
    async with _model_lock:
        if _whisper_model is None:
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
            try:
                from faster_whisper import WhisperModel
                _whisper_model = WhisperModel(
                    settings.WHISPER_MODEL,
                    device=settings.WHISPER_DEVICE,
                    compute_type=settings.WHISPER_COMPUTE_TYPE,
                )
                logger.info("faster-whisper model loaded successfully")
            except ImportError:
                import whisper
                _whisper_model = whisper.load_model(settings.WHISPER_MODEL)
                logger.info("whisper model loaded successfully")
    return _whisper_model

async def transcribe_audio(
    audio_path: Path,
    source_language: Optional[str] = None,
) -> Dict[str, Any]:
    model = await get_whisper_model()
    loop = asyncio.get_event_loop()

    def _transcribe():
        try:
            from faster_whisper import WhisperModel
            if isinstance(model, WhisperModel):
                kwargs = {
                    "beam_size": 5,
                    "vad_filter": True,
                    "vad_parameters": {"min_silence_duration_ms": 500},
                }
                if source_language and source_language != "auto":
                    kwargs["language"] = source_language

                segments_iter, info = model.transcribe(str(audio_path), **kwargs)
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
                    "language_probability": info.language_probability,
                }
        except (ImportError, TypeError):
            pass

        import whisper
        kwargs = {}
        if source_language and source_language != "auto":
            kwargs["language"] = source_language
        result = model.transcribe(str(audio_path), **kwargs)
        segments = []
        for i, seg in enumerate(result.get("segments", [])):
            segments.append({
                "id": i,
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
            })
        return {
            "segments": segments,
            "language": result.get("language", "unknown"),
            "language_probability": 1.0,
        }

    result = await loop.run_in_executor(None, _transcribe)
    logger.info(f"Transcribed {len(result['segments'])} segments, detected language: {result['language']}")
    return result

# --- TRANSLATION LOGIC ---

async def translate_segments(
    segments: List[Dict],
    source_language: str,
    target_language: str,
) -> List[Dict]:
    if source_language == target_language:
        for seg in segments:
            seg["translated"] = seg["text"]
        return segments

    translated = []
    batch_size = 20
    for i in range(0, len(segments), batch_size):
        batch = segments[i:i + batch_size]
        batch_translated = await _translate_batch(batch, source_language, target_language)
        translated.extend(batch_translated)
    return translated

async def _translate_batch(segments: List[Dict], source_lang: str, target_lang: str) -> List[Dict]:
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        loop = asyncio.get_event_loop()
        result_segments = []

        for seg in segments:
            text = seg["text"]
            if not text.strip():
                seg["translated"] = text
                result_segments.append(seg)
                continue
            try:
                translated_text = await loop.run_in_executor(None, translator.translate, text)
                seg["translated"] = translated_text or text
            except Exception as e:
                logger.warning(f"Translation failed for segment: {e}")
                seg["translated"] = text
            result_segments.append(seg)
        return result_segments
    except ImportError:
        return await _translate_with_argos(segments, source_lang, target_lang)

async def _translate_with_argos(segments: List[Dict], source_lang: str, target_lang: str) -> List[Dict]:
    # Placeholder for argos fallback if needed
    for seg in segments:
        seg["translated"] = seg.get("text", "")
    return segments

# --- LOCAL TTS (PIPER) LOGIC ---

async def get_piper_voice(lang_code: str):
    """Lazy loader for Piper models."""
    from piper.voice import PiperVoice
    global _piper_models
    async with _model_lock:
        if lang_code not in _piper_models:
            model_path = MODEL_REGISTRY.get(lang_code, MODEL_REGISTRY["en"])
            if not Path(model_path).exists():
                logger.error(f"TTS Model file missing at {model_path}. Defaulting to EN.")
                model_path = MODEL_REGISTRY["en"]
            
            _piper_models[lang_code] = PiperVoice.load(model_path)
    return _piper_models[lang_code]

async def generate_tts_audio(
    segments: List[Dict],
    voice: str,  # Passed as lang code (e.g., 'hi' or 'en') from pipeline
    output_path: Path,
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Determine lang code
    lang_code = voice.split("-")[0].lower() if "-" in voice else voice.lower()
    
    texts = [seg.get("translated", seg.get("text", "")).strip() for seg in segments if seg]
    full_text = " ".join(texts)

    if not full_text:
        raise RuntimeError("No text available for TTS")

    try:
        voice_model = await get_piper_voice(lang_code)
        loop = asyncio.get_event_loop()

        def _synthesize():
            with wave.open(str(output_path), "wb") as wav_file:
                voice_model.synthesize(full_text, wav_file)
            return output_path

        await loop.run_in_executor(None, _synthesize)
        logger.info(f"Local Piper TTS generated: {output_path}")
        return output_path

    except Exception as e:
        logger.error(f"Local TTS failed: {str(e)}")
        raise RuntimeError(f"Piper generation failed: {str(e)}")

async def get_available_voices() -> List[Dict]:
    """Provides consistent voice options for the UI."""
    return [
        {"name": "en", "display_name": "English (Local)", "locale": "en-US", "language": "en", "gender": "Female", "neural": True},
        {"name": "hi", "display_name": "Hindi (Local)", "locale": "hi-IN", "language": "hi", "gender": "Female", "neural": True},
        {"name": "te", "display_name": "Telugu (Local)", "locale": "te-IN", "language": "te", "gender": "Male", "neural": True},
    ]