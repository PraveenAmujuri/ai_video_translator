import asyncio
import logging
import shutil
from pathlib import Path
from typing import Optional, Tuple

from yt_dlp import YoutubeDL

from core.config import settings
from core.utils import run_subprocess

logger = logging.getLogger(__name__)


async def extract_youtube_streams(url: str):

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
    }

    with YoutubeDL(ydl_opts) as ydl:

        info = ydl.extract_info(
            url,
            download=False,
        )

    video_url = None
    audio_url = None

    formats = info.get("formats", [])

    for f in formats:

        vcodec = f.get("vcodec")
        acodec = f.get("acodec")

        if (
            vcodec != "none"
            and acodec == "none"
            and not video_url
        ):

            video_url = f.get("url")

        if (
            acodec != "none"
            and vcodec == "none"
            and not audio_url
        ):

            audio_url = f.get("url")

    return {
        "title": info.get("title"),
        "video_url": video_url,
        "audio_url": audio_url,
        "duration": info.get("duration"),
    }


async def download_audio_only(
    url: str,
    job_id: str,
) -> Path:

    output_dir = settings.UPLOAD_DIR / job_id

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = output_dir / "audio.wav"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        url,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(output_path),
    ]

    returncode, stdout, stderr = (
        await run_subprocess(cmd)
    )

    if returncode != 0:

        raise RuntimeError(
            f"Audio download failed: {stderr}"
        )

    return output_path


async def get_media_duration(file_path: Path) -> float:

    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        str(file_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)

    if returncode == 0:

        import json

        try:

            data = json.loads(stdout)

            return float(
                data.get(
                    "format",
                    {},
                ).get(
                    "duration",
                    0,
                )
            )

        except Exception:
            pass

    return 0.0


def cleanup_job_files(job_id: str):

    upload_dir = settings.UPLOAD_DIR / job_id

    if upload_dir.exists():

        shutil.rmtree(
            upload_dir,
            ignore_errors=True,
        )