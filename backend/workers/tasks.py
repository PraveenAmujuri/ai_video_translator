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
        download_youtube_video,
        download_audio_only,
        download_video_only,
        merge_video_audio,
        generate_audio_output,
        create_static_video,
        get_media_duration,
    )

    from services.ai_service import (
        transcribe_and_translate_audio,
        generate_tts_audio,
    )

    from services.subtitle_service import (
        generate_srt,
        generate_vtt,
    )

    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)
        if not job:
            raise RuntimeError(f"Job {job_id} not found in database.")

        source_language = job.source_language or "auto"
        target_language = job.target_language or "en"
        voice = job.voice or settings.DEFAULT_VOICE
        preserve_background = job.preserve_background_audio or False
        background_volume = job.background_audio_volume or 0.3
        media_type = job.media_type

    # Determine if input is audio
    is_audio_file = False
    if not job.youtube_url:
        if media_type == "audio":
            is_audio_file = True
        else:
            file_ext = Path(job.file_path).suffix.lower()
            allowed_audio_exts = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"}
            if file_ext in allowed_audio_exts:
                is_audio_file = True

    if job.youtube_url:
        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                status=JobStatus.DOWNLOADING,
                progress=10,
                message="Checking stream bypass...",
            )

        # Explicitly catch both None values and empty string overrides safely
        job_stream_url = getattr(job, "video_stream_url", None)
        
        if job_stream_url and str(job_stream_url).strip():
            video_stream_bypass = str(job_stream_url).strip()
            logger.info(f"Extension link detected. Using client bypass track: {video_stream_bypass[:50]}...")
        else:
            video_stream_bypass = None
            logger.info("No extension link found. Falling back to native server-side extraction track.")

        if video_stream_bypass:
            async with AsyncSessionLocal() as db:
                await update_job(
                    db,
                    job_id,
                    progress=20,
                    message="Downloading video via bypass track...",
                )
            video_path = await download_video_only(
                video_stream_bypass,
                job_id,
            )
            audio_path = await download_audio_only(
                video_stream_bypass,
                job_id,
            )
        else:
            async with AsyncSessionLocal() as db:
                await update_job(
                    db,
                    job_id,
                    progress=15,
                    message="Acquiring YouTube video stream...",
                )
            video_path = await download_youtube_video(job.youtube_url, job_id)
            
            async with AsyncSessionLocal() as db:
                await update_job(
                    db,
                    job_id,
                    progress=20,
                    message="Extracting audio track locally...",
                )
            audio_path = await download_audio_only(
                str(video_path),
                job_id,
            )
    elif is_audio_file:
        # Direct Audio Upload Pathway
        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                status=JobStatus.TRANSCRIBING,
                progress=25,
                message="Preparing audio file...",
            )

        audio_path = Path(job.file_path)
        video_path = None
    else:
        # Direct Video File Upload Pathway
        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                status=JobStatus.EXTRACTING_AUDIO,
                progress=15,
                message="Extracting audio from uploaded video...",
            )

        video_path = Path(job.file_path)
        audio_path = await download_audio_only(
            str(video_path),
            job_id,
        )

    # Measure and store media duration in database
    try:
        duration = await get_media_duration(audio_path)
        if duration > 0:
            async with AsyncSessionLocal() as db:
                job = await update_job(db, job_id, duration=duration)
    except Exception as e:
        logger.warning(f"Failed to measure media duration: {e}")

    async with AsyncSessionLocal() as db:
        await update_job(
            db,
            job_id,
            status=JobStatus.TRANSCRIBING,
            progress=35,
            message="Transcribing and translating audio...",
        )

    result = await transcribe_and_translate_audio(
        audio_path=audio_path,
        source_language=source_language,
        target_language=target_language,
    )

    translated_segments = result["segments"]

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
        total_duration=job.duration,
    )

    subtitle_dir = settings.OUTPUT_DIR / job_id
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
        job.set_segments(translated_segments)
        await db.commit()

    if is_audio_file:
        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                status=JobStatus.MERGING,
                progress=90,
                message="Generating final audio outputs...",
            )

        original_ext = Path(job.file_path).suffix.lower()
        if not original_ext:
            original_ext = ".mp3"
            
        translated_audio_dir = settings.OUTPUT_DIR / job_id
        translated_audio_dir.mkdir(parents=True, exist_ok=True)
        translated_audio_path = translated_audio_dir / f"translated_audio{original_ext}"
        
        await generate_audio_output(
            original_audio_path=audio_path,
            dubbed_audio_path=dubbed_audio_path,
            output_audio_path=translated_audio_path,
            preserve_background=preserve_background,
            background_volume=background_volume,
        )
        
        # Additionally generate static cover video for desktop client consistency
        output_path = settings.OUTPUT_DIR / job_id / "output.mp4"
        await create_static_video(
            audio_path=translated_audio_path,
            output_video_path=output_path,
            subtitle_path=srt_path if job.embed_subtitles else None,
            language=job.target_language,
        )
        
        # Cleanup intermediate temp files to save space
        for temp_file_name in ["audio.wav", "dubbed_audio.mp3"]:
            temp_file_path = settings.UPLOAD_DIR / job_id / temp_file_name
            if temp_file_path.exists():
                try:
                    temp_file_path.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete intermediate temp file {temp_file_path}: {e}")
        
        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                video_stream_url=f"/outputs/{job_id}/output.mp4",
                dubbed_audio_path=str(translated_audio_path),
                subtitle_path=str(vtt_path),
                status=JobStatus.COMPLETED,
                progress=100,
                message="Dub complete!",
            )
    else:
        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                status=JobStatus.MERGING,
                progress=90,
                message="Merging video and audio...",
            )

        output_path = settings.OUTPUT_DIR / job_id / "output.mp4"
        await merge_video_audio(
            video_path=video_path,
            audio_path=dubbed_audio_path,
            output_path=output_path,
            preserve_background=preserve_background,
            background_volume=background_volume,
            subtitle_path=srt_path if job.embed_subtitles else None,
            language=job.target_language,
        )

        # Cleanup intermediate temp files to save space
        for temp_file_name in ["audio.wav", "dubbed_audio.mp3", "video.mp4"]:
            temp_file_path = settings.UPLOAD_DIR / job_id / temp_file_name
            if temp_file_path.exists():
                try:
                    temp_file_path.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete intermediate temp file {temp_file_path}: {e}")

        async with AsyncSessionLocal() as db:
            await update_job(
                db,
                job_id,
                video_stream_url=f"/outputs/{job_id}/output.mp4",
                dubbed_audio_path=str(dubbed_audio_path),
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