import asyncio
import os
import logging
import shutil
from pathlib import Path
from typing import Optional, Tuple

from yt_dlp import YoutubeDL
from fastapi import HTTPException

from core.config import settings
from core.utils import run_subprocess

logger = logging.getLogger(__name__)


async def extract_youtube_streams(url: str):
    """
    Extracts stable streaming audio and video links natively via yt-dlp.
    Dynamically generates a temporary Netscape cookiefile from environment variables 
    to bypass cloud data-center blockages with zero external repository file dependencies.
    """
    url = url.strip()
    cookie_file_path = "/tmp/youtube_cookies.txt"
    
    # Check if the environment variable string exists and dynamically write the file in storage
    cookie_content = os.getenv("YT_COOKIES")
    if cookie_content:
        logger.info("Railway environment cookie context detected. Generating temporary tracking block...")
        try:
            Path(cookie_file_path).parent.mkdir(parents=True, exist_ok=True)
            Path(cookie_file_path).write_text(cookie_content.strip())
        except Exception as e:
            logger.error(f"Failed to compile dynamic cookie file matrix: {str(e)}")

    has_cookies = os.path.exists(cookie_file_path)

    # --- PRODUCTION CONFIGURATION MATCHING DESKTOP BROWSER VISUAL OVERRIDES ---
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "source_address": "0.0.0.0",
        "nocheckcertificate": True,
        "cookiefile": cookie_file_path if has_cookies else None,
        
        # We tell yt-dlp to act as a standard browser client to match your active cookie session mapping.
        # This resolves the "No video formats found!" constraint block error completely.
        "extractor_args": {
            "youtube": {
                "client": "web",
                "skip": ["webpage", "hls"]
            }
        },
    }

    if has_cookies:
        logger.info("Extracting streams using authenticated dynamic cookie session.")
    else:
        logger.warning("Extracting streams without cookies. May trigger bot-detection walls.")

    try:
        loop = asyncio.get_event_loop()
        with YoutubeDL(ydl_opts) as ydl:
            info = await loop.run_in_executor(
                None,
                lambda: ydl.extract_info(url, download=False)
            )

        if not info:
            raise RuntimeError("The extraction backend failed to resolve a stable payload track manifest.")

        video_url = None
        audio_url = None
        formats = info.get("formats", [])

        # Step through formats cleanly using your internal application mapping
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

        # Fallback layer assignment matching structural criteria patterns
        if not audio_url:
            audio_url = info.get("url")
        if not video_url:
            video_url = info.get("url")

        if not audio_url:
            raise RuntimeError("Direct media playback routing URL missing from metadata mapping.")

        return {
            "title": info.get("title", "Processed Production Video"),
            "video_url": video_url,
            "audio_url": audio_url,
            "duration": float(info.get("duration", 0.0))
        }

    except Exception as e:
        logger.error(f"Native stream extraction pipeline crash: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Streaming extraction error. Verify your live YT_COOKIES dashboard values."
        )


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
        "-i", url,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_path),
    ]

    returncode, stdout, stderr = await run_subprocess(cmd)

    if returncode != 0:
        raise RuntimeError(
            f"Audio download failed: {stderr}"
        )

    return output_path


async def get_media_duration(file_path: Path) -> float:
    cmd = [
        "ffprobe",
        "-v", "quiet",
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


def cleanup_job_files(job_id: str):
    upload_dir = settings.UPLOAD_DIR / job_id
    if upload_dir.exists():
        shutil.rmtree(
            upload_dir,
            ignore_errors=True,
        )