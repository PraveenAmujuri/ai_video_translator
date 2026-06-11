import asyncio
import os
import logging
import shutil
import sys
from pathlib import Path
from typing import Optional, Tuple

import yt_dlp
from fastapi import HTTPException

from core.config import settings
from core.utils import run_subprocess

logger = logging.getLogger(__name__)

# System fallback token path directory hook configuration matching Linux deployment specifications
OAUTH_CACHE_DIR = "/tmp/yt_dlp_oauth_cache"


def trigger_railway_oauth_handshake():
    """
    Forces yt-dlp to run an authentication handshake loop.
    Intercepts and outputs the google.com/device token verification strings directly 
    into the active Railway live logs console window.
    """
    logger.info("Initializing explicit YouTube OAuth2 handshake protocol on Railway...")
    
    ydl_opts = {
        'simulate': True,
        'quiet': False,  # MUST be False so the login instructions stream into Railway logs
        'cache_dir': OAUTH_CACHE_DIR,
        'extractor_args': {
            'youtube': {
                'client': 'tv',
                'username': 'oauth2'
            }
        }
    }

    # Custom log wrapper class to force stdout streams straight into Railway logging hooks
    class RailwayLogInterceptor:
        def write(self, message):
            if "google.com/device" in message or "enter code" in message:
                print(f"\n\n🚨 [YOUTUBE AUTH REQUIRED] 🚨\n{message.strip()}\n🚨 [ACTION REQUIRED] 🚨\n", flush=True)
            else:
                sys.__stdout__.write(message)
        def flush(self):
            sys.__stdout__.flush()

    # Intercept system out blocks temporarily during boot to catch the authorization string
    original_stdout = sys.stdout
    sys.stdout = RailwayLogInterceptor()

    try:
        # Request metadata on a safe universal mock target link to force the pairing sequence
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info('https://www.youtube.com/watch?v=jNQXAC9IVRw', download=False)
    except Exception as e:
        # If it returns a login success error or breaks mid-flight naturally, handle it gracefully
        if "Pre-authentication" in str(e) or "authenticated" in str(e).lower():
            logger.info("OAuth2 device handshake profile state verified successfully.")
        else:
            logger.warning(f"OAuth2 baseline setup context notification: {str(e)}")
    finally:
        sys.stdout = original_stdout


async def extract_youtube_streams(url: str):
    """
    Extracts stable media streaming target paths utilizing the authenticated global token pool container.
    """
    url = url.strip()
    logger.info(f"Extracting streaming tracks natively via verified OAuth2 context for target: {url}")

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'source_address': '0.0.0.0', 
        'nocheckcertificate': True,
        'cache_dir': OAUTH_CACHE_DIR,
        'extractor_args': {
            'youtube': {
                'client': 'tv',
                'username': 'oauth2'
            }
        }
    }

    try:
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await loop.run_in_executor(
                None, 
                lambda: ydl.extract_info(url, download=False)
            )
            
        if not info:
            raise RuntimeError("Cloud validation failed to isolate streaming content maps.")

        stream_url = info.get('url')
        return {
            "title": info.get("title", "Processed Production Video"),
            "video_url": stream_url,
            "audio_url": stream_url, 
            "duration": float(info.get("duration", 0.0))
        }

    except Exception as e:
        logger.error(f"Cloud stream extraction exception: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Streaming extraction error. Check Railway logs to verify if re-authentication is needed."
        )


async def download_audio_only(url: str, job_id: str) -> Path:
    output_dir = settings.UPLOAD_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "audio.wav"

    cmd = ["ffmpeg", "-y", "-i", url, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", str(output_path)]
    returncode, stdout, stderr = await run_subprocess(cmd)

    if returncode != 0:
        raise RuntimeError(f"Audio download failed: {stderr}")
    return output_path


async def get_media_duration(file_path: Path) -> float:
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(file_path)]
    returncode, stdout, stderr = await run_subprocess(cmd)

    if returncode == 0:
        import json
        try:
            data = json.loads(stdout)
            return float(data.get("format", {}).get("duration", 0.0))
        except Exception:
            pass
    return 0.0


def cleanup_job_files(job_id: str):
    upload_dir = settings.UPLOAD_DIR / job_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)