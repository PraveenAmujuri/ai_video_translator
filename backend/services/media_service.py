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
    Includes a direct passthrough interceptor map for client-extracted browser tracks.
    """
    url = url.strip()

    # --- CLIENT-SIDE PASSTHROUGH INTERCEPTOR GATE ---
    # If the incoming string is already a direct googlevideo stream endpoint URL token,
    # completely bypass yt-dlp to protect the server IP from being flagged!
    if "googlevideo.com" in url or url.startswith("http") and not ("youtube.com/watch" in url or "youtu.be/" in url):
        logger.info("Direct browser-extracted stream asset target detected. Bypassing cloud extraction barriers cleanly.")
        return {
            "title": "Client Authenticated Source Stream",
            "video_url": url,
            "audio_url": url,
            "duration": 0.0  # Recalculated dynamically downstream by your native ffprobe analyzer!
        }

    logger.info(f"Fallback layer activated: Extracting streams via standard desktop browser client spoof for: {url}")

    # Core fallback system options tuned to prevent datacenter formatting blocks
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "source_address": "0.0.0.0",
        "nocheckcertificate": True,
        
        # We instruct the engine to masquerade fully as a desktop web browser client interface
        "extractor_args": {
            "youtube": {
                "client": "web",
                "skip": ["webpage", "hls"]
            }
        },
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        }
    }

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
            detail="Streaming extraction error. Shifting pipeline context."
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