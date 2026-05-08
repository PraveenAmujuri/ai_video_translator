import asyncio
import logging
import os
from pathlib import Path
from typing import List, Optional, Dict, Any

from core.config import settings

logger = logging.getLogger(__name__)

_whisper_model = None
_model_lock = asyncio.Lock()


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
                translated_text = await loop.run_in_executor(
                    None, translator.translate, text
                )
                seg["translated"] = translated_text or text
            except Exception as e:
                logger.warning(f"Translation failed for segment: {e}")
                seg["translated"] = text
            result_segments.append(seg)

        return result_segments

    except ImportError:
        logger.warning("deep_translator not available, using argostranslate fallback")
        return await _translate_with_argos(segments, source_lang, target_lang)


async def _translate_with_argos(segments: List[Dict], source_lang: str, target_lang: str) -> List[Dict]:
    try:
        import argostranslate.package
        import argostranslate.translate

        loop = asyncio.get_event_loop()

        def _do_translate():
            installed_languages = argostranslate.translate.get_installed_languages()
            from_lang = next((l for l in installed_languages if l.code == source_lang[:2]), None)
            to_lang = next((l for l in installed_languages if l.code == target_lang[:2]), None)

            if not from_lang or not to_lang:
                return None

            translation = from_lang.get_translation(to_lang)
            return translation

        translation = await loop.run_in_executor(None, _do_translate)

        for seg in segments:
            if translation and seg.get("text"):
                try:
                    seg["translated"] = await loop.run_in_executor(
                        None, translation.translate, seg["text"]
                    )
                except Exception:
                    seg["translated"] = seg["text"]
            else:
                seg["translated"] = seg.get("text", "")

    except Exception as e:
        logger.error(f"Argos translation failed: {e}")
        for seg in segments:
            seg["translated"] = seg.get("text", "")

    return segments


async def generate_tts_audio(
    segments: List[Dict],
    voice: str,
    output_path: Path,
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
) -> Path:
    import edge_tts
    import tempfile

    output_path.parent.mkdir(parents=True, exist_ok=True)

    segment_files = []
    temp_dir = output_path.parent / "tts_segments"
    temp_dir.mkdir(exist_ok=True)

    for i, seg in enumerate(segments):
        text = seg.get("translated") or seg.get("text", "")
        if not text.strip():
            continue

        seg_path = temp_dir / f"seg_{i:04d}.mp3"

        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            pitch=pitch,
            volume=volume,
        )

        try:
            await communicate.save(str(seg_path))
            segment_files.append((seg["start"], seg["end"], seg_path))
        except Exception as e:
            logger.warning(f"TTS failed for segment {i}: {e}")

    if not segment_files:
        raise RuntimeError("No TTS segments generated")

    await _concat_tts_segments(segment_files, output_path)

    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

    return output_path


async def _concat_tts_segments(
    segments: List[tuple],
    output_path: Path,
) -> None:
    from utils import run_subprocess
    import tempfile

    if not segments:
        return

    total_duration = segments[-1][1] if segments else 0
    total_duration = max(total_duration + 2.0, 1.0)

    filter_parts = []
    inputs = []

    silence_path = output_path.parent / "silence.mp3"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"anullsrc=r=24000:cl=mono",
        "-t", str(total_duration),
        "-c:a", "libmp3lame",
        "-q:a", "4",
        str(silence_path),
    ]
    await run_subprocess(cmd)

    filter_parts = [f"[0:a]adelay=0:all=1[base]"]
    inputs = ["-i", str(silence_path)]

    for i, (start, end, seg_path) in enumerate(segments):
        delay_ms = int(start * 1000)
        inputs.extend(["-i", str(seg_path)])
        filter_parts.append(f"[{i+1}:a]adelay={delay_ms}:all=1[s{i}]")

    mix_inputs = "[base]" + "".join(f"[s{i}]" for i in range(len(segments)))
    filter_parts.append(f"{mix_inputs}amix=inputs={len(segments)+1}:duration=first:dropout_transition=0[out]")

    filter_complex = ";".join(filter_parts)

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:a", "libmp3lame",
        "-q:a", "4",
        str(output_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode != 0:
        logger.error(f"TTS concatenation failed: {stderr}")
        if segments:
            from utils import run_subprocess as rs
            concat_list = output_path.parent / "concat.txt"
            with open(concat_list, "w") as f:
                for _, _, seg_path in segments:
                    f.write(f"file '{seg_path}'\n")
            cmd2 = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list),
                "-c:a", "libmp3lame",
                str(output_path),
            ]
            await run_subprocess(cmd2)

    silence_path.unlink(missing_ok=True)


async def get_available_voices() -> List[Dict]:
    try:
        import edge_tts
        voices = await edge_tts.list_voices()
        result = []
        for v in voices:
            result.append({
                "name": v["Name"],
                "display_name": v.get("FriendlyName", v["Name"]),
                "locale": v["Locale"],
                "language": v["Locale"].split("-")[0],
                "gender": v.get("Gender", "Unknown"),
                "neural": "Neural" in v.get("VoiceType", ""),
            })
        return result
    except Exception as e:
        logger.error(f"Failed to get voices: {e}")
        return _get_default_voices()


def _get_default_voices() -> List[Dict]:
    return [
        {"name": "en-US-AriaNeural", "display_name": "Aria (US Female)", "locale": "en-US", "language": "en", "gender": "Female", "neural": True},
        {"name": "en-US-GuyNeural", "display_name": "Guy (US Male)", "locale": "en-US", "language": "en", "gender": "Male", "neural": True},
        {"name": "en-GB-SoniaNeural", "display_name": "Sonia (UK Female)", "locale": "en-GB", "language": "en", "gender": "Female", "neural": True},
        {"name": "es-ES-ElviraNeural", "display_name": "Elvira (ES Female)", "locale": "es-ES", "language": "es", "gender": "Female", "neural": True},
        {"name": "fr-FR-DeniseNeural", "display_name": "Denise (FR Female)", "locale": "fr-FR", "language": "fr", "gender": "Female", "neural": True},
        {"name": "de-DE-KatjaNeural", "display_name": "Katja (DE Female)", "locale": "de-DE", "language": "de", "gender": "Female", "neural": True},
        {"name": "zh-CN-XiaoxiaoNeural", "display_name": "Xiaoxiao (CN Female)", "locale": "zh-CN", "language": "zh", "gender": "Female", "neural": True},
        {"name": "ja-JP-NanamiNeural", "display_name": "Nanami (JP Female)", "locale": "ja-JP", "language": "ja", "gender": "Female", "neural": True},
        {"name": "ko-KR-SunHiNeural", "display_name": "SunHi (KR Female)", "locale": "ko-KR", "language": "ko", "gender": "Female", "neural": True},
        {"name": "pt-BR-FranciscaNeural", "display_name": "Francisca (BR Female)", "locale": "pt-BR", "language": "pt", "gender": "Female", "neural": True},
        {"name": "ru-RU-SvetlanaNeural", "display_name": "Svetlana (RU Female)", "locale": "ru-RU", "language": "ru", "gender": "Female", "neural": True},
        {"name": "hi-IN-SwaraNeural", "display_name": "Swara (IN Female)", "locale": "hi-IN", "language": "hi", "gender": "Female", "neural": True},
        {"name": "ar-SA-ZariyahNeural", "display_name": "Zariyah (SA Female)", "locale": "ar-SA", "language": "ar", "gender": "Female", "neural": True},
        {"name": "it-IT-ElsaNeural", "display_name": "Elsa (IT Female)", "locale": "it-IT", "language": "it", "gender": "Female", "neural": True},
    ]