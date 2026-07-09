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

# Dynamically populated voice registry on startup
VOICE_REGISTRY = {}


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
    Uploads the audio via Google GenAI Files API, processes it with a robust prompt,
    and cleans up the uploaded file securely.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY missing from settings and environment.")

    client = genai.Client(api_key=api_key)






    logger.info(f"Uploading audio file {audio_path.name} to Gemini Files API...")
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
        logger.info("Generating content using gemini-3.1-flash-lite...")

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
        logger.info(f"Cleaning up uploaded audio file {audio_file.name} from Gemini storage...")
        try:
            await asyncio.to_thread(client.files.delete, name=audio_file.name)
            logger.info("Gemini file cleanup completed successfully.")
        except Exception as cleanup_err:
            logger.warning(f"Failed to delete file {audio_file.name}: {cleanup_err}")

# -----------------------------
# PIPER TTS
# -----------------------------

async def get_piper_voice_by_path(model_path: str):
    from piper.voice import PiperVoice
    global _piper_models
    
    async with _model_lock:
        if model_path not in _piper_models:
            logger.info(f"Loading Piper model: {model_path}")
            _piper_models[model_path] = PiperVoice.load(model_path)
            
    return _piper_models[model_path]

def scan_voices():
    global VOICE_REGISTRY
    from piper.voice import PiperVoice
    
    base_dir = Path(__file__).parent.parent / "models"
    logger.info(f"Scanning directory for Piper voices: {base_dir.resolve()}")
    if not base_dir.exists():
        logger.warning(f"Models directory not found: {base_dir.resolve()}")
        return

    # Find all .onnx files recursively
    onnx_files = list(base_dir.glob("**/*.onnx"))
    logger.info(f"Found {len(onnx_files)} potential voice files during scan.")
    
    for onnx_path in onnx_files:
        json_path = onnx_path.with_suffix(".onnx.json")
        if not json_path.exists():
            logger.warning(f"Skipping voice {onnx_path.name}: missing config file {json_path.name}")
            continue
            
        base_name = onnx_path.stem
        parts = base_name.split("-")
        if len(parts) < 3:
            logger.warning(f"Skipping voice {onnx_path.name}: filename does not match expected format {{locale}}-{{name}}-{{quality}}")
            continue
            
        locale = parts[0]
        voice_name = parts[1]
        quality = parts[2]
        lang_family = locale.split("_")[0].lower()
        
        try:
            logger.info(f"Validating model load for: {base_name}")
            test_voice = PiperVoice.load(str(onnx_path))
            
            # Perform basic synthesis test
            chunks = list(test_voice.synthesize("test"))
            if not chunks:
                raise ValueError("Synthesizer returned no chunks")
                
            lang_names = {
                "en": "English", "hi": "Hindi", "te": "Telugu", "ta": "Tamil", "kn": "Kannada",
                "ml": "Malayalam", "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati",
                "pa": "Punjabi", "or": "Odia", "as": "Assamese", "ur": "Urdu",
                "es": "Spanish", "fr": "French", "de": "German", "it": "Italian",
                "pt": "Portuguese", "zh": "Chinese", "ko": "Korean", "ru": "Russian",
                "ar": "Arabic", "tr": "Turkish", "id": "Indonesian", "vi": "Vietnamese",
                "nl": "Dutch", "pl": "Polish"
            }
            
            genders = {
                "rohan": "Male", "pratham": "Male", "priyamvada": "Female",
                "maya": "Female", "padmavathi": "Female", "venkatesh": "Male",
                "arjun": "Male", "meera": "Female", "fasih": "Male",
                "lessac": "Male", "amy": "Female", "ryan": "Male", "alan": "Male", "cori": "Female",
                "davefx": "Male", "ald": "Male", "daniela": "Female", "siwis": "Female", "tom": "Male",
                "thorsten": "Male", "paola": "Female", "jeff": "Male", "tugão": "Male", "huayan": "Female",
                "chaowen": "Male", "irina": "Female", "denis": "Male", "kareem": "Male", "dfki": "Male",
                "news_tts": "Male", "vais1000": "Male", "alex": "Male", "nathalie": "Female", "gosia": "Female"
            }
            gender = genders.get(voice_name.lower(), "Unknown")
            lang_name = lang_names.get(lang_family, lang_family.upper())
            
            if lang_family not in VOICE_REGISTRY:
                VOICE_REGISTRY[lang_family] = {
                    "default": base_name,
                    "voices": {}
                }
                
            preferred_defaults = {
                "en": "en_US-lessac-medium",
                "hi": "hi_IN-rohan-medium",
                "te": "te_IN-maya-medium",
                "ml": "ml_IN-meera-medium",
                "ur": "ur_PK-fasih-medium",
                "es": "es_ES-davefx-medium",
                "fr": "fr_FR-siwis-medium",
                "de": "de_DE-thorsten-medium",
                "it": "it_IT-paola-medium",
                "pt": "pt_BR-jeff-medium",
                "zh": "zh_CN-huayan-medium",
                "ru": "ru_RU-irina-medium",
                "ar": "ar_JO-kareem-medium",
                "tr": "tr_TR-dfki-medium",
                "id": "id_ID-news_tts-medium",
                "vi": "vi_VN-vais1000-medium",
                "nl": "nl_NL-alex-medium",
                "pl": "pl_PL-gosia-medium"
            }
            
            is_default = preferred_defaults.get(lang_family) == base_name
            if is_default or not VOICE_REGISTRY[lang_family]["default"]:
                VOICE_REGISTRY[lang_family]["default"] = base_name

            VOICE_REGISTRY[lang_family]["voices"][base_name] = {
                "language": lang_name,
                "locale": locale,
                "display_name": f"{voice_name.capitalize()} ({gender})",
                "gender": gender,
                "quality": quality,
                "default": is_default,
                "model_path": str(onnx_path),
                "config_path": str(json_path)
            }
            logger.info(f"Registered voice: {base_name} successfully.")
        except Exception as e:
            logger.warning(f"Failed to register voice {base_name}: model load or synthesis test failed: {e}")

# Run voice scanning on module import
scan_voices()

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

    # Dynamic Voice Resolution
    voice_key = voice.lower()
    found_voice = None
    
    # 1. Check direct voice key match (e.g. en_US-lessac-medium)
    for lang, lang_entry in VOICE_REGISTRY.items():
        for v_key, v_meta in lang_entry["voices"].items():
            if v_key.lower() == voice_key:
                found_voice = v_meta
                break
        if found_voice:
            break
            
    # 2. Check language default fallback (e.g. "en", "hi", "te")
    if not found_voice:
        lang_family = voice.split("-")[0].split("_")[0].lower()
        if lang_family in VOICE_REGISTRY:
            default_key = VOICE_REGISTRY[lang_family]["default"]
            found_voice = VOICE_REGISTRY[lang_family]["voices"][default_key]
            
    # 3. Last-resort English fallback
    if not found_voice:
        logger.error(f"Requested voice/language '{voice}' is not supported. Checking default fallback.")
        if "en" in VOICE_REGISTRY:
            default_key = VOICE_REGISTRY["en"]["default"]
            found_voice = VOICE_REGISTRY["en"]["voices"][default_key]
            
    if not found_voice:
        raise ValueError(f"Language or voice '{voice}' is not supported by the server, and no English fallback is available.")
        
    voice_model = await get_piper_voice_by_path(found_voice["model_path"])

    loop = asyncio.get_event_loop()

    valid_segments = []
    for seg in segments:
        text = seg.get("translated") or seg.get("text", "")
        text = text.strip()
        if text:
            valid_segments.append({
                "text": text,
                "start": float(seg.get("start", 0.0))
            })

    if not valid_segments:
        raise RuntimeError("No text available for TTS")

    logger.info(
        f"Piper segment count: {len(valid_segments)}"
    )

    temp_wavs = []

    def _generate_segment_audio():
        for i, seg in enumerate(valid_segments):
            text = seg["text"]
            logger.info(
                f"Synthesizing segment {i+1}/{len(valid_segments)}"
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

                chunks = voice_model.synthesize(text)
                wrote_audio = False

                for chunk in chunks:
                    if hasattr(chunk, "audio_int16_bytes"):
                        wav_file.writeframes(chunk.audio_int16_bytes)
                        wrote_audio = True
                    elif hasattr(chunk, "audio"):
                        wav_file.writeframes(chunk.audio)
                        wrote_audio = True
                    elif isinstance(chunk, bytes):
                        wav_file.writeframes(chunk)
                        wrote_audio = True

                if wrote_audio:
                    temp_wavs.append({
                        "path": temp_path,
                        "start": seg["start"]
                    })
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
        raise RuntimeError("No valid audio segments generated")

    # TIMELINE RECONSTRUCTION & MIXING VIA FFMPEG
    from core.utils import run_subprocess

    # Get total video/audio duration
    total_duration = kwargs.get("total_duration")
    if not total_duration:
        total_duration = max([float(seg.get("end", 0.0)) for seg in segments]) if segments else 1.0
    total_duration = max(1.0, float(total_duration))

    cmd = ["ffmpeg", "-y"]
    
    # 1. Add each synthesized segment file as input
    for wav in temp_wavs:
        cmd.extend(["-i", str(wav["path"])])

    # 2. Add anullsrc as background padding input to preserve duration
    cmd.extend([
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t", f"{total_duration:.4f}"
    ])

    filter_parts = []
    num_segments = len(temp_wavs)

    # 3. Normalize format to stereo 44.1kHz s16, then delay each segment
    for i in range(num_segments):
        start_time = temp_wavs[i]["start"]
        delay_ms = int(start_time * 1000)
        filter_parts.append(
            f"[{i}:a]aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo,adelay={delay_ms}|{delay_ms}[a{i}]"
        )

    # 4. Mix delayed inputs + silent background track (input index num_segments)
    mix_inputs = "".join(f"[a{i}]" for i in range(num_segments)) + f"[{num_segments}:a]"
    # normalize=0 prevents volume scaling drops; dropout_transition=99999 is a safety fallback for volume stability
    filter_parts.append(
        f"{mix_inputs}amix=inputs={num_segments+1}:normalize=0:dropout_transition=99999[mixed]"
    )
    # alimiter prevents digital clipping in overlapping dialogue regions
    filter_parts.append(
        f"[mixed]alimiter=limit=0.95[out_boost]"
    )

    cmd.extend(["-filter_complex", ";".join(filter_parts)])
    cmd.extend(["-map", "[out_boost]"])

    if output_path.suffix.lower() == ".wav":
        cmd.extend([
            "-vn",
            "-c:a", "pcm_s16le",
            str(output_path),
        ])
    else:
        cmd.extend([
            "-vn",
            "-ar", "44100",
            "-ac", "2",
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            str(output_path),
        ])

    returncode, stdout, stderr = await run_subprocess(cmd)

    # Cleanup temp segment wav files
    for wav in temp_wavs:
        path = wav["path"]
        if path.exists():
            try:
                path.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete temp wav {path}: {e}")

    if returncode != 0:
        raise RuntimeError(
            f"FFmpeg timeline mixing failed: {stderr}"
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
    global VOICE_REGISTRY
    voices_list = []
    
    # 1. Add legacy/default language codes for backward compatibility (e.g. "en", "hi", "te")
    for lang, lang_entry in VOICE_REGISTRY.items():
        default_key = lang_entry["default"]
        default_voice = lang_entry["voices"][default_key]
        voices_list.append({
            "name": lang,
            "display_name": f"{default_voice['language']} (Default)",
            "locale": default_voice["locale"],
            "language": lang,
            "gender": default_voice["gender"],
            "neural": True,
            "default": True,
            "quality": default_voice["quality"],
            "model_path": default_voice["model_path"],
            "config_path": default_voice["config_path"]
        })
        
        # 2. Add each individual registered voice specifically
        for v_key, v_meta in lang_entry["voices"].items():
            voices_list.append({
                "name": v_key,
                "display_name": f"{v_meta['language']} - {v_meta['display_name']}",
                "locale": v_meta["locale"],
                "language": lang,
                "gender": v_meta["gender"],
                "neural": True,
                "default": v_meta["default"],
                "quality": v_meta["quality"],
                "model_path": v_meta["model_path"],
                "config_path": v_meta["config_path"]
            })
            
    return voices_list