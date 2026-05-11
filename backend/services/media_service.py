import asyncio
import logging
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple

from core.config import settings
from core.utils import run_subprocess

logger = logging.getLogger(__name__)


async def download_youtube(url: str, job_id: str) -> Tuple[Path, str, float]:
    output_dir = settings.UPLOAD_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_template = str(output_dir / "%(title)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "--js-runtimes",
        "node",
        "-f",
        "mp4",
        "-o",
        str(output_template),
        url,
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {stderr}")

    video_files = list(output_dir.glob("*.mp4")) + list(output_dir.glob("*.webm")) + list(output_dir.glob("*.mkv"))
    if not video_files:
        raise RuntimeError("No video file found after download")

    video_path = video_files[0]
    title = video_path.stem.replace("_", " ")

    duration = await get_media_duration(video_path)
    return video_path, title, duration


async def get_media_duration(file_path: Path) -> float:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        str(file_path),
    ]
    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode == 0:
        import json
        try:
            data = json.loads(stdout)
            return float(data.get("format", {}).get("duration", 0))
        except Exception:
            pass
    return 0.0


async def extract_audio(video_path: Path, job_id: str) -> Path:
    audio_path = settings.UPLOAD_DIR / job_id / "audio.wav"
    audio_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(audio_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {stderr}")

    return audio_path


async def extract_background_audio(video_path: Path, job_id: str) -> Path:
    bg_path = settings.UPLOAD_DIR / job_id / "background.mp3"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "libmp3lame",
        "-q:a", "4",
        str(bg_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode != 0:
        raise RuntimeError(f"Background audio extraction failed: {stderr}")

    return bg_path

async def merge_video_audio_subtitles(
    video_path,
    audio_path,
    subtitle_path,
    output_path,
):
    from core.utils import run_subprocess

    output_path.parent.mkdir(parents=True, exist_ok=True)

    subtitle_path = str(subtitle_path).replace("\\", "/").replace(":", "\\:")

    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(video_path),
        "-i", str(audio_path),

        "-map", "0:v:0",
        "-map", "1:a:0",

        "-c:v", "copy",
        "-c:a", "aac",

        "-vf",
        f"subtitles='{subtitle_path}'",

        "-shortest",

        str(output_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)

    if returncode != 0:
        raise RuntimeError(stderr)

    return output_path
async def generate_hls(video_path: Path, job_id: str) -> Path:
    hls_dir = settings.HLS_DIR / job_id
    hls_dir.mkdir(parents=True, exist_ok=True)
    playlist_path = hls_dir / "playlist.m3u8"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-hls_time", str(settings.HLS_SEGMENT_TIME),
        "-hls_list_size", str(settings.HLS_LIST_SIZE),
        "-hls_segment_filename", str(hls_dir / "segment_%03d.ts"),
        "-hls_flags", "independent_segments",
        str(playlist_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode != 0:
        raise RuntimeError(f"HLS generation failed: {stderr}")

    return playlist_path


async def get_video_info(file_path: Path) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        str(file_path),
    ]
    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode == 0:
        import json
        try:
            return json.loads(stdout)
        except Exception:
            pass
    return {}


def cleanup_job_files(job_id: str, keep_output: bool = True):
    upload_dir = settings.UPLOAD_DIR / job_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)

    if not keep_output:
        output_dir = settings.OUTPUT_DIR / job_id
        if output_dir.exists():
            shutil.rmtree(output_dir, ignore_errors=True)
        hls_dir = settings.HLS_DIR / job_id
        if hls_dir.exists():
            shutil.rmtree(hls_dir, ignore_errors=True)