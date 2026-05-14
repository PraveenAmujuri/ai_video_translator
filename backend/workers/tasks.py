import asyncio
import logging
from pathlib import Path

from core.database import (
    AsyncSessionLocal,
    update_job,
    get_job,
)

from core.config import settings
from models.schemas import JobStatus

logger = logging.getLogger(__name__)

_running_tasks = {}


async def process_translation_job(job_id: str):

    async with AsyncSessionLocal() as db:

        job = await get_job(db, job_id)

        if not job:
            return

    try:

        await _run_pipeline(job_id)

    except Exception as e:

        logger.exception(e)

        async with AsyncSessionLocal() as db:

            await update_job(
                db,
                job_id,
                status=JobStatus.FAILED,
                error=str(e),
                progress=0,
            )


async def _run_pipeline(job_id: str):

    from services.media_service import (
        extract_youtube_streams,
        download_audio_only,
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

        source_language = (
            job.source_language or "auto"
        )

        target_language = (
            job.target_language or "en"
        )

        voice = (
            job.voice or settings.DEFAULT_VOICE
        )

    async with AsyncSessionLocal() as db:

        await update_job(
            db,
            job_id,
            status=JobStatus.DOWNLOADING,
            progress=10,
            message="Extracting streams...",
        )

    streams = await extract_youtube_streams(
        job.youtube_url
    )

    video_stream_url = streams[
        "video_url"
    ]

    audio_stream_url = streams[
        "audio_url"
    ]

    async with AsyncSessionLocal() as db:

        await update_job(
            db,
            job_id,
            video_stream_url=video_stream_url,
            progress=20,
            message="Downloading audio only...",
        )

    audio_path = await download_audio_only(
        audio_stream_url,
        job_id,
    )

    async with AsyncSessionLocal() as db:

        await update_job(
            db,
            job_id,
            status=JobStatus.TRANSCRIBING,
            progress=35,
            message="Transcribing audio...",
        )

    transcription = await transcribe_audio(
        audio_path,
        source_language,
    )

    segments = transcription[
        "segments"
    ]

    detected_language = transcription[
        "language"
    ]

    async with AsyncSessionLocal() as db:

        await update_job(
            db,
            job_id,
            status=JobStatus.TRANSLATING,
            progress=55,
            message="Localizing subtitles...",
        )

    translated_segments = await translate_segments(
        segments,
        detected_language,
        target_language,
    )

    async with AsyncSessionLocal() as db:

        await update_job(
            db,
            job_id,
            status=JobStatus.GENERATING_TTS,
            progress=75,
            message="Generating dubbed audio...",
        )

    dubbed_audio_path = (
        settings.UPLOAD_DIR
        / job_id
        / "dubbed_audio.mp3"
    )

    await generate_tts_audio(
        translated_segments,
        voice=voice,
        output_path=dubbed_audio_path,
    )

    subtitle_dir = (
        settings.OUTPUT_DIR / job_id
    )

    subtitle_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    srt_path = subtitle_dir / "subtitles.srt"

    vtt_path = subtitle_dir / "subtitles.vtt"

    generate_srt(
        translated_segments,
        srt_path,
    )

    generate_vtt(
        translated_segments,
        vtt_path,
    )

    async with AsyncSessionLocal() as db:

        job = await get_job(db, job_id)

        job.set_segments(
            translated_segments
        )

        await db.commit()

    async with AsyncSessionLocal() as db:

        await update_job(
            db,
            job_id,
            dubbed_audio_path=str(
                mp3_path
            ),
            subtitle_path=str(vtt_path),
            status=JobStatus.COMPLETED,
            progress=100,
            message="Dub complete!",
        )


def start_job(job_id: str):

    task = asyncio.create_task(
        process_translation_job(job_id)
    )

    _running_tasks[job_id] = task

    return task