import asyncio
import logging
import uuid
from pathlib import Path
from typing import Optional

from core.database import AsyncSessionLocal, update_job, get_job
from core.config import settings
from models.schemas import JobStatus

logger = logging.getLogger(__name__)

_running_tasks: dict = {}


async def process_translation_job(job_id: str):
    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return

    try:
        await _run_pipeline(job_id)
    except Exception as e:
        logger.exception(f"Job {job_id} failed: {e}")
        async with AsyncSessionLocal() as db:
            await update_job(db, job_id, status=JobStatus.FAILED, error=str(e), progress=0)
    finally:
        _running_tasks.pop(job_id, None)


async def _run_pipeline(job_id: str):
    from services.media_service import  (
        download_youtube, extract_audio, extract_background_audio,
        merge_video_audio_subtitles, generate_hls, get_media_duration,
    )
    from services.ai_service import (
    transcribe_audio,
    translate_segments,
    generate_tts_audio,
    )

    from services.subtitle_service import (
        generate_srt,
        generate_vtt,
    )

    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        if not job:
            raise RuntimeError(f"Job {job_id} not found")

        source_language = job.source_language or "auto"
        target_language = job.target_language or "en"
        voice = job.voice or settings.DEFAULT_VOICE

    video_path = None

    if job.youtube_url:
        async with AsyncSessionLocal() as db:
            await update_job(db, job_id,
                status=JobStatus.DOWNLOADING,
                progress=5,
                message="Downloading from YouTube..."
            )

        video_path, title, duration = await download_youtube(job.youtube_url, job_id)

        async with AsyncSessionLocal() as db:
            await update_job(db, job_id,
                file_path=str(video_path),
                original_filename=title,
                duration=duration,
                progress=15,
                message="Download complete"
            )
    else:
        async with AsyncSessionLocal() as db:
            job = await get_job(db, job_id)
            video_path = Path(job.file_path) if job.file_path else None
            if not video_path or not video_path.exists():
                raise RuntimeError("Input file not found")

            duration = await get_media_duration(video_path)
            await update_job(db, job_id, duration=duration)

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            status=JobStatus.EXTRACTING_AUDIO,
            progress=20,
            message="Extracting audio..."
        )

    audio_path = await extract_audio(video_path, job_id)

    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        preserve_bg = job.preserve_background_audio

    bg_audio_path = None
    if preserve_bg:
        bg_audio_path = await extract_background_audio(video_path, job_id)

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            audio_path=str(audio_path),
            status=JobStatus.TRANSCRIBING,
            progress=30,
            message=f"Transcribing audio..."
        )

    transcription = await transcribe_audio(audio_path, source_language if source_language != "auto" else None)
    segments = transcription["segments"]
    detected_language = transcription["language"]

    if not segments:
        raise RuntimeError("No speech detected in the audio")

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            source_language=detected_language,
            status=JobStatus.TRANSLATING,
            progress=50,
            message=f"Translating {len(segments)} segments from {detected_language} to {target_language}..."
        )

    translated_segments = await translate_segments(segments, detected_language, target_language)

    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        tts_rate = job.tts_rate or "+0%"
        tts_pitch = job.tts_pitch or "+0Hz"
        tts_volume = job.tts_volume or "+0%"
        bg_volume = job.background_audio_volume or 0.3

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            status=JobStatus.GENERATING_TTS,
            progress=60,
            message=f"Generating dubbed audio with voice {voice}..."
        )

    tts_output = settings.UPLOAD_DIR / job_id / "dubbed_audio.mp3"
    dubbed_audio_path = await generate_tts_audio(
        translated_segments,
        voice=voice,
        output_path=tts_output,
        rate=tts_rate,
        pitch=tts_pitch,
        volume=tts_volume,
    )

    subtitle_dir = settings.OUTPUT_DIR / job_id
    subtitle_dir.mkdir(parents=True, exist_ok=True)
    srt_path = subtitle_dir / "subtitles.srt"
    vtt_path = subtitle_dir / "subtitles.vtt"

    generate_srt(translated_segments, srt_path)
    generate_vtt(translated_segments, vtt_path)

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            subtitle_path=str(srt_path),
            status=JobStatus.MERGING,
            progress=75,
            message="Merging video, audio, and subtitles..."
        )

    output_video = await merge_video_audio_subtitles(
        video_path=video_path,
        dubbed_audio_path=dubbed_audio_path,
        subtitle_path=srt_path,
        job_id=job_id,
        background_audio_path=bg_audio_path,
        background_volume=bg_volume,
    )

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            output_path=str(output_video),
            status=JobStatus.GENERATING_HLS,
            progress=88,
            message="Generating streaming format..."
        )

    hls_playlist = await generate_hls(output_video, job_id)

    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        job_data = {
            "id": job.id,
            "segments": translated_segments,
        }

    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        job.set_segments(translated_segments)
        await db.commit()

    async with AsyncSessionLocal() as db:
        await update_job(db, job_id,
            hls_path=str(hls_playlist),
            status=JobStatus.COMPLETED,
            progress=100,
            message="Translation complete!"
        )

    logger.info(f"Job {job_id} completed successfully")


def start_job(job_id: str) -> asyncio.Task:
    task = asyncio.create_task(process_translation_job(job_id))
    _running_tasks[job_id] = task
    return task


def cancel_job(job_id: str) -> bool:
    task = _running_tasks.get(job_id)
    if task and not task.done():
        task.cancel()
        return True
    return False


def get_running_jobs() -> list:
    return list(_running_tasks.keys())