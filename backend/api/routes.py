from pathlib import Path
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.database import AsyncSessionLocal, create_job, get_job
from models.schemas import JobCreate, UploadResponse, MediaType
from services.ai_service import get_available_voices
from workers.tasks import start_job
from core.utils import LANGUAGE_MAP

router = APIRouter()


@router.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "running"
    }


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())

    upload_dir = settings.UPLOAD_DIR / job_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    media_type = MediaType.VIDEO

    if file.content_type:
        if file.content_type.startswith("audio"):
            media_type = MediaType.AUDIO

    async with AsyncSessionLocal() as db:
        await create_job(
            db,
            id=job_id,
            file_path=str(file_path),
            original_filename=file.filename,
        )

    return UploadResponse(
        job_id=job_id,
        filename=file.filename,
        media_type=media_type,
    )

@router.get("/job/{job_id}/streams")
async def get_job_streams(job_id: str):

    async with AsyncSessionLocal() as db:

        job = await get_job(
            db,
            job_id,
        )

    return {
        "video_url": job.video_stream_url,
        "dubbed_audio_url": f"/uploads/{job_id}/dubbed_audio.mp3",
        "subtitle_url": f"/outputs/{job_id}/subtitles.vtt",
    }
@router.post("/translate")
async def translate(payload: JobCreate):
    job_id = str(uuid.uuid4())

    async with AsyncSessionLocal() as db:
        await create_job(
            db,
            id=job_id,
            youtube_url=payload.youtube_url,
            source_language=payload.source_language,
            target_language=payload.target_language,
            voice=payload.voice,
            tts_rate=payload.tts_rate,
            tts_pitch=payload.tts_pitch,
            tts_volume=payload.tts_volume,
            preserve_background_audio=payload.preserve_background_audio,
            background_audio_volume=payload.background_audio_volume,
        )

    start_job(job_id)

    return {
        "job_id": job_id,
        "status": "processing"
    }


@router.get("/progress/{job_id}")
async def progress(job_id: str):
    async with AsyncSessionLocal() as db:
        job = await get_job(db, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "message": job.message,
        "error": job.error,
        "source_language": job.source_language,
        "target_language": job.target_language,
        "stream_url": f"/stream/{job.id}" if job.hls_path else None,
        "subtitle_url": f"/subtitles/{job.id}" if job.subtitle_path else None,
    }


@router.get("/stream/{job_id}")
async def stream(job_id: str):
    playlist = settings.HLS_DIR / job_id / "playlist.m3u8"

    if not playlist.exists():
        raise HTTPException(status_code=404, detail="HLS stream not ready")

    return FileResponse(
        playlist,
        media_type="application/vnd.apple.mpegurl"
    )


@router.get("/subtitles/{job_id}")
async def subtitles(job_id: str):
    subtitle_path = settings.OUTPUT_DIR / job_id / "subtitles.srt"

    if not subtitle_path.exists():
        raise HTTPException(status_code=404, detail="Subtitles not found")

    return FileResponse(
        subtitle_path,
        media_type="application/x-subrip"
    )


@router.get("/download/{job_id}")
async def download(job_id: str):
    video_path = settings.OUTPUT_DIR / job_id / "output.mp4"

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Output video not found")

    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"{job_id}.mp4"
    )


@router.get("/voices")
async def voices():
    return await get_available_voices()


@router.get("/languages")
async def languages():
    return LANGUAGE_MAP