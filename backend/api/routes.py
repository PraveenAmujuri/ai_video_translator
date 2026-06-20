from pathlib import Path
from typing import Optional
import shutil
import uuid
import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from core.config import settings
from core.database import AsyncSessionLocal, create_job, get_job
from models.schemas import JobCreate, UploadResponse, MediaType
from services.ai_service import get_available_voices
from workers.tasks import start_job
from core.utils import LANGUAGE_MAP

router = APIRouter()


def validate_media_file(filename: str, content_type: Optional[str]) -> str:
    """
    Validates file extension and content type.
    Returns 'video' or 'audio' if valid, raises HTTPException otherwise.
    """
    ext = os.path.splitext(filename)[1].lower()
    allowed_video_exts = {".mp4", ".webm", ".avi", ".mkv", ".mov"}
    allowed_audio_exts = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"}
    
    is_video = ext in allowed_video_exts or (content_type and content_type in settings.ALLOWED_VIDEO_TYPES)
    is_audio = ext in allowed_audio_exts or (content_type and content_type in settings.ALLOWED_AUDIO_TYPES)
    
    if not (is_video or is_audio):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type. "
                f"Allowed video extensions: {', '.join(allowed_video_exts)}. "
                f"Allowed audio extensions: {', '.join(allowed_audio_exts)}."
            )
        )
        
    return "video" if is_video else "audio"


@router.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "running"
    }


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    # Validate MIME type and file extension first
    detected_type = validate_media_file(file.filename, file.content_type)
    media_type = MediaType.AUDIO if detected_type == "audio" else MediaType.VIDEO

    job_id = str(uuid.uuid4())

    upload_dir = settings.UPLOAD_DIR / job_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename

    # Enforce 200MB size limit
    max_size = 200 * 1024 * 1024
    file_size = getattr(file, "size", None)
    if file_size is not None and file_size > max_size:
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the maximum upload limit of 200MB."
        )

    try:
        # Stream chunks to check size on the fly
        total_bytes = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    raise ValueError("File size exceeds the maximum upload limit of 200MB.")
                buffer.write(chunk)
    except Exception as stream_err:
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(status_code=400, detail=str(stream_err))

    async with AsyncSessionLocal() as db:
        await create_job(
            db,
            id=job_id,
            file_path=str(file_path),
            original_filename=file.filename,
            media_type=media_type,
        )

    return UploadResponse(
        job_id=job_id,
        filename=file.filename,
        media_type=media_type,
    )


# api/routes.py

@router.post("/translate-stream")
async def translate_binary_stream(
    file: UploadFile = File(...),
    youtube_url: Optional[str] = Form(None),
    target_language: str = Form(...),
    source_language: str = Form("auto"),
    voice: str = Form(...),
    tts_rate: str = Form("+0%"),
    tts_pitch: str = Form("+0Hz"),
    tts_volume: str = Form("+0%"),
    preserve_background_audio: str = Form("false"),
    background_audio_volume: str = Form("0.3")
):
    # Validate MIME type and file extension first
    detected_type = validate_media_file(file.filename, file.content_type)
    media_type = MediaType.AUDIO if detected_type == "audio" else MediaType.VIDEO

    # 1. Align seamlessly with your unique uuid generation standard
    job_id = str(uuid.uuid4())

    # 2. Map file targets straight to your configured setting variables (settings.UPLOAD_DIR)
    upload_dir = settings.UPLOAD_DIR / job_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / file.filename

    # Enforce 200MB size limit
    max_size = 200 * 1024 * 1024
    file_size = getattr(file, "size", None)
    if file_size is not None and file_size > max_size:
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the maximum upload limit of 200MB."
        )

    try:
        # 3. Stream the raw binary bytes coming from the client tab onto disk blocks
        total_bytes = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    raise ValueError("File size exceeds the maximum upload limit of 200MB.")
                buffer.write(chunk)

        # Reconcile validation using JobCreate
        payload_dict = {
            "source_language": source_language,
            "target_language": target_language,
            "voice": voice,
            "youtube_url": youtube_url,
            "tts_rate": tts_rate,
            "tts_pitch": tts_pitch,
            "tts_volume": tts_volume,
            "preserve_background_audio": preserve_background_audio,
            "background_audio_volume": background_audio_volume,
        }
        
        try:
            validated_data = JobCreate(**payload_dict)
        except Exception as validation_err:
            raise HTTPException(status_code=422, detail=str(validation_err))

        # 4. Initialize database row fields using your core create_job pipeline wrapper
        async with AsyncSessionLocal() as db:
            await create_job(
                db,
                id=job_id,
                file_path=str(file_path),
                youtube_url=validated_data.youtube_url,
                media_type=media_type,
                original_filename=file.filename,
                source_language=validated_data.source_language,
                target_language=validated_data.target_language,
                voice=validated_data.voice,
                tts_rate=validated_data.tts_rate,
                tts_pitch=validated_data.tts_pitch,
                tts_volume=validated_data.tts_volume,
                preserve_background_audio=validated_data.preserve_background_audio,
                background_audio_volume=validated_data.background_audio_volume,
            )

        # 5. Hand the file path straight down your existing tasks pipeline framework loop
        start_job(job_id)

        return {
            "job_id": job_id,
            "status": "processing"
        }

    except HTTPException:
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise
    except Exception as server_err:
        # Prevent broken disk block allocation spaces if connection drops mid-flight
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(status_code=500, detail=f"Streaming extraction error: {str(server_err)}")


@router.get("/job/{job_id}/streams")
async def get_job_streams(job_id: str):

    async with AsyncSessionLocal() as db:

        job = await get_job(
            db,
            job_id,
        )

    return {
        "video_url": job.video_stream_url,
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
            media_type=MediaType.YOUTUBE,
            video_stream_url=getattr(payload, "video_stream_url", None),
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