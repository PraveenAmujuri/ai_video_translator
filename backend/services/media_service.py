import asyncio
import os
import logging
import shutil
import httpx
import re
from pathlib import Path
from typing import Optional, Tuple
from fastapi import HTTPException

from core.config import settings
from core.utils import run_subprocess

logger = logging.getLogger(__name__)


def extract_video_id(url: str) -> str:
    # Matches v=VIDEO_ID or /VIDEO_ID or embed/VIDEO_ID or youtu.be/VIDEO_ID
    match = re.search(r'(?:v=|\/|embed\/|youtu\.be\/)([0-9A-Za-z_-]{11})', url)
    if match:
        return match.group(1)
    raise ValueError(f"Could not extract video ID from YouTube URL: {url}")


async def get_innertube_video_url(video_id: str) -> str:
    api_key = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
    url = f"https://www.youtube.com/youtubei/v1/player?key={api_key}"
    payload = {
        "videoId": video_id,
        "context": {
            "client": {
                "clientName": "ANDROID",
                "clientVersion": "20.10.38",
                "androidSdkVersion": 30
            }
        },
        "racyCheckOk": True,
        "contentCheckOk": True
    }
    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "com.google.android.youtube/19.29.37 (Linux; U; Android 11; en_US; Pixel 5; Build/RQ3A.210705.001)"
        }
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code == 200:
            data = res.json()
            streaming_data = data.get("streamingData", {})
            formats = streaming_data.get("adaptiveFormats", []) + streaming_data.get("formats", [])
            video_formats = [f for f in formats if f.get("mimeType", "").startswith("video/") and f.get("url")]
            if video_formats:
                # Prefer H264 (avc1) for maximum HTML5 video web player compatibility
                h264_formats = [f for f in video_formats if 'codecs="avc' in f.get("mimeType", "")]
                if h264_formats:
                    return h264_formats[0]["url"]
                return video_formats[0]["url"]
        raise RuntimeError("Failed to extract video stream from InnerTube API.")


async def extract_youtube_streams(url: str, client_stream_url: Optional[str] = None):
    """
    Extracts stable streaming audio and video links natively via RapidAPI and InnerTube.
    Includes a direct passthrough interceptor map for client-extracted browser tracks,
    and a local storage auto-detector boundary bypass.
    """
    url = url.strip()

    # If the system passes an absolute local file path pointing to our uploads space instead of an internet URL,
    # skip scraping entirely and route the local disk path straight to your downstream pipelines!
    if os.path.exists(url) or url.startswith("/") or "uploads/" in url or "downloads/" in url:
        logger.info(f"📂 Pre-cached local binary asset file detected on disk: {url}. Bypassing network scrapers natively.")
        return {
            "title": "Local Binary Data Upload Stream",
            "video_url": url,
            "audio_url": url,
            "duration": 0.0  # Captured dynamically below by your native ffprobe analyzer!
        }

    # --- CLIENT-SIDE PASSTHROUGH INTERCEPTOR GATE ---
    if client_stream_url:
        logger.info("Direct database-persisted client stream asset detected. Bypassing cloud extraction barriers cleanly.")
        return {
            "title": "Client Authenticated Source Stream",
            "video_url": client_stream_url,
            "audio_url": client_stream_url,
            "duration": 0.0  
        }

    is_direct_stream = "googlevideo.com" in url or "manifest" in url or url.startswith("http")
    is_raw_page = "youtube.com/watch" in url or "youtu.be/" in url

    if is_direct_stream and not is_raw_page:
        logger.info("Direct browser-extracted stream asset target detected in URL field.")
        return {
            "title": "Client Authenticated Source Stream",
            "video_url": url,
            "audio_url": url,
            "duration": 0.0
        }

    logger.info(f"Upstream request layer activated: Resolving streams for: {url}")

    try:
        video_id = extract_video_id(url)
    except Exception as e:
        logger.error(f"URL parsing failure: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid YouTube URL: {str(e)}")

    headers = {
        "x-rapidapi-host": settings.RAPIDAPI_HOST,
        "x-rapidapi-key": settings.RAPIDAPI_KEY
    }

    audio_url = None
    title = "YouTube Video"
    duration = 0.0

    async with httpx.AsyncClient() as client:
        # RapidAPI polling loop
        for attempt in range(15):
            try:
                res = await client.get(f"https://{settings.RAPIDAPI_HOST}/dl?id={video_id}", headers=headers, timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    status = data.get("status")
                    if status == "ok":
                        audio_url = data.get("link")
                        title = data.get("title", "YouTube Video")
                        duration = float(data.get("duration", 0.0))
                        break
                    elif status == "processing":
                        logger.info(f"RapidAPI audio conversion in progress (attempt {attempt+1}/15)...")
                        await asyncio.sleep(1.0)
                    else:
                        raise RuntimeError(f"RapidAPI failed with message: {data.get('msg')}")
                else:
                    logger.warning(f"RapidAPI endpoint returned status {res.status_code} on attempt {attempt+1}")
                    await asyncio.sleep(1.0)
            except Exception as attempt_err:
                logger.warning(f"RapidAPI attempt {attempt+1} encountered error: {str(attempt_err)}")
                await asyncio.sleep(1.0)

    if not audio_url:
        raise HTTPException(
            status_code=500,
            detail="Failed to resolve stable audio stream from converter API."
        )

    # Resolve video stream URL via InnerTube API natively
    try:
        video_url = await get_innertube_video_url(video_id)
    except Exception as e:
        logger.error(f"InnerTube video extraction crash: {str(e)}")
        # If video extraction fails, fallback to using the audio stream URL as a fallback frames container
        video_url = audio_url

    return {
        "title": title,
        "video_url": video_url,
        "audio_url": audio_url,
        "duration": duration
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


async def download_video_only(
    url: str,
    job_id: str,
) -> Path:
    output_dir = settings.UPLOAD_DIR / job_id
    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )
    output_path = output_dir / "video.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-i", url,
        "-an",
        "-c:v", "copy",
        str(output_path),
    ]
    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode != 0:
        logger.warning(f"Video stream copy failed: {stderr}. Retrying with h264 re-encoding...")
        cmd_reencode = [
            "ffmpeg",
            "-y",
            "-i", url,
            "-an",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]
        returncode, stdout, stderr = await run_subprocess(cmd_reencode)
        if returncode != 0:
            raise RuntimeError(
                f"Video download failed: {stderr}"
            )
    return output_path


async def has_audio_stream(file_path: Path) -> bool:
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "json",
        str(file_path),
    ]
    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode == 0:
        import json
        try:
            data = json.loads(stdout)
            return len(data.get("streams", [])) > 0
        except Exception:
            pass
    return False


async def log_media_info(file_path: Path, label: str):
    """
    Logs media info, size, existence, and codec details using ffprobe.
    """
    if not file_path:
        logger.warning(f"[DEBUG LOG] {label} path is None")
        return
    if not file_path.exists():
        logger.error(f"[DEBUG LOG] {label} FILE DOES NOT EXIST: {file_path.absolute()}")
        return
    
    file_size = file_path.stat().st_size
    logger.info(f"[DEBUG LOG] {label} exists at {file_path.absolute()} (Size: {file_size} bytes)")
    
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_format",
        "-show_streams",
        "-of", "json",
        str(file_path)
    ]
    returncode, stdout, stderr = await run_subprocess(cmd)
    if returncode == 0:
        logger.info(f"[DEBUG LOG] ffprobe output for {label}:\n{stdout.strip()}")
    else:
        logger.warning(f"[DEBUG LOG] ffprobe failed for {label}: {stderr}")


async def merge_video_audio(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    preserve_background: bool,
    background_volume: float,
    subtitle_path: Optional[Path] = None,
    language: str = "eng"
) -> Path:
    import time
    start_time = time.time()
    logger.info(f"[DEBUG LOG] Starting merge_video_audio...")
    
    # Verify inputs
    await log_media_info(video_path, "Input Video")
    await log_media_info(audio_path, "Dubbed Audio")
    if subtitle_path:
        await log_media_info(subtitle_path, "Subtitle File")
        
    output_path.parent.mkdir(parents=True, exist_ok=True)
    has_audio = await has_audio_stream(video_path)

    if preserve_background and has_audio:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
        ]
        if subtitle_path:
            cmd.extend(["-i", str(subtitle_path)])
        
        cmd.extend([
            "-filter_complex", f"[0:a]volume={background_volume}[bg];[bg][1:a]amix=inputs=2:duration=longest[a]",
            "-map", "0:v:0",
            "-map", "[a]",
        ])
        
        if subtitle_path:
            cmd.extend([
                "-map", "2:s:0",
                "-c:v", "copy",
                "-c:a", "aac",
                "-c:s", "mov_text",
                "-metadata:s:s:0", f"language={language}",
                "-metadata:s:s:0", f"title={language.upper()} Subtitles",
            ])
        else:
            cmd.extend([
                "-c:v", "copy",
                "-c:a", "aac",
            ])
            
        cmd.extend([
            "-shortest",
            "-movflags", "+faststart",
            str(output_path)
        ])
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
        ]
        if subtitle_path:
            cmd.extend(["-i", str(subtitle_path)])
            
        cmd.extend([
            "-map", "0:v:0",
            "-map", "1:a:0",
        ])
        
        if subtitle_path:
            cmd.extend([
                "-map", "2:s:0",
                "-c:v", "copy",
                "-c:a", "aac",
                "-c:s", "mov_text",
                "-metadata:s:s:0", f"language={language}",
                "-metadata:s:s:0", f"title={language.upper()} Subtitles",
            ])
        else:
            cmd.extend([
                "-c:v", "copy",
                "-c:a", "aac",
            ])
            
        cmd.extend([
            "-shortest",
            "-movflags", "+faststart",
            str(output_path)
        ])

    logger.info(f"Merging video and audio with cmd: {' '.join(cmd)}")
    returncode, stdout, stderr = await run_subprocess(cmd)
    logger.info(f"[DEBUG LOG] FFmpeg merge return code: {returncode}")
    logger.info(f"[DEBUG LOG] FFmpeg stdout:\n{stdout}")
    logger.info(f"[DEBUG LOG] FFmpeg stderr:\n{stderr}")
    
    if returncode != 0:
        logger.warning(f"Merging with copy codec failed: {stderr}. Retrying with video re-encoding...")
        if preserve_background and has_audio:
            cmd = [
                "ffmpeg",
                "-y",
                "-i", str(video_path),
                "-i", str(audio_path),
            ]
            if subtitle_path:
                cmd.extend(["-i", str(subtitle_path)])
                
            cmd.extend([
                "-filter_complex", f"[0:a]volume={background_volume}[bg];[bg][1:a]amix=inputs=2:duration=longest[a]",
                "-map", "0:v:0",
                "-map", "[a]",
            ])
            
            if subtitle_path:
                cmd.extend([
                    "-map", "2:s:0",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-c:s", "mov_text",
                    "-metadata:s:s:0", f"language={language}",
                    "-metadata:s:s:0", f"title={language.upper()} Subtitles",
                ])
            else:
                cmd.extend([
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                ])
                
            cmd.extend([
                "-shortest",
                "-movflags", "+faststart",
                str(output_path)
            ])
        else:
            cmd = [
                "ffmpeg",
                "-y",
                "-i", str(video_path),
                "-i", str(audio_path),
            ]
            if subtitle_path:
                cmd.extend(["-i", str(subtitle_path)])
                
            cmd.extend([
                "-map", "0:v:0",
                "-map", "1:a:0",
            ])
            
            if subtitle_path:
                cmd.extend([
                    "-map", "2:s:0",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-c:s", "mov_text",
                    "-metadata:s:s:0", f"language={language}",
                    "-metadata:s:s:0", f"title={language.upper()} Subtitles",
                ])
            else:
                cmd.extend([
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                ])
                
            cmd.extend([
                "-shortest",
                "-movflags", "+faststart",
                str(output_path)
            ])
            
        logger.info(f"Retrying merge with re-encoding cmd: {' '.join(cmd)}")
        returncode, stdout, stderr = await run_subprocess(cmd)
        logger.info(f"[DEBUG LOG] FFmpeg retry return code: {returncode}")
        logger.info(f"[DEBUG LOG] FFmpeg retry stdout:\n{stdout}")
        logger.info(f"[DEBUG LOG] FFmpeg retry stderr:\n{stderr}")
        
        if returncode != 0:
            raise RuntimeError(f"Merging video and audio failed: {stderr}")

    logger.info(f"[DEBUG LOG] merge_video_audio completed in {time.time() - start_time:.2f} seconds")
    await log_media_info(output_path, "Merged Output Video")
    return output_path


async def generate_audio_output(
    original_audio_path: Path,
    dubbed_audio_path: Path,
    output_audio_path: Path,
    preserve_background: bool,
    background_volume: float,
) -> Path:
    import time
    start_time = time.time()
    logger.info(f"[DEBUG LOG] Starting generate_audio_output...")
    
    # Verify inputs
    await log_media_info(original_audio_path, "Original Audio")
    await log_media_info(dubbed_audio_path, "Dubbed Audio")

    output_audio_path.parent.mkdir(parents=True, exist_ok=True)
    has_audio = await has_audio_stream(original_audio_path)
    ext = output_audio_path.suffix.lower()

    codec_map = {
        ".mp3": ["-c:a", "libmp3lame", "-b:a", "192k"],
        ".wav": ["-c:a", "pcm_s16le"],
        ".m4a": ["-c:a", "aac", "-b:a", "192k"],
        ".aac": ["-c:a", "aac", "-b:a", "192k"],
        ".flac": ["-c:a", "flac"],
        ".ogg": ["-c:a", "libvorbis", "-b:a", "192k"],
        ".opus": ["-c:a", "libopus", "-b:a", "192k"],
    }
    
    encoding_args = codec_map.get(ext, ["-c:a", "libmp3lame", "-b:a", "192k"])

    if preserve_background and has_audio:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(original_audio_path),
            "-i", str(dubbed_audio_path),
            "-filter_complex", f"[0:a]volume={background_volume}[bg];[bg][1:a]amix=inputs=2:duration=longest[a]",
            "-map", "[a]",
        ] + encoding_args + [str(output_audio_path)]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(dubbed_audio_path),
        ] + encoding_args + [str(output_audio_path)]

    logger.info(f"Generating audio output with cmd: {' '.join(cmd)}")
    returncode, stdout, stderr = await run_subprocess(cmd)
    logger.info(f"[DEBUG LOG] FFmpeg generate_audio return code: {returncode}")
    logger.info(f"[DEBUG LOG] FFmpeg generate_audio stdout:\n{stdout}")
    logger.info(f"[DEBUG LOG] FFmpeg generate_audio stderr:\n{stderr}")
    
    if returncode != 0:
        raise RuntimeError(f"Generating audio output failed: {stderr}")

    logger.info(f"[DEBUG LOG] generate_audio_output completed in {time.time() - start_time:.2f} seconds")
    await log_media_info(output_audio_path, "Generated Audio Output")
    return output_audio_path


async def create_static_video(
    audio_path: Path,
    output_video_path: Path,
    subtitle_path: Optional[Path] = None,
    language: str = "eng"
) -> Path:
    """
    Creates an MP4 video with a black frame (static cover) and the translated audio track.
    """
    import time
    start_time = time.time()
    logger.info(f"[DEBUG LOG] Starting create_static_video...")
    
    # Verify inputs
    await log_media_info(audio_path, "Static Video Input Audio")
    if subtitle_path:
        await log_media_info(subtitle_path, "Static Video Input Subtitle")
        
    output_video_path.parent.mkdir(parents=True, exist_ok=True)
    
    if subtitle_path:
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", "color=c=black:s=1280x720:r=1",
            "-i", str(audio_path),
            "-i", str(subtitle_path),
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-map", "2:s:0",
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-c:s", "mov_text",
            "-metadata:s:s:0", f"language={language}",
            "-metadata:s:s:0", f"title={language.upper()} Subtitles",
            "-shortest",
            str(output_video_path),
        ]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", "color=c=black:s=1280x720:r=1",
            "-i", str(audio_path),
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(output_video_path),
        ]
    
    logger.info(f"Creating static video with cmd: {' '.join(cmd)}")
    returncode, stdout, stderr = await run_subprocess(cmd)
    logger.info(f"[DEBUG LOG] FFmpeg static video return code: {returncode}")
    logger.info(f"[DEBUG LOG] FFmpeg static video stdout:\n{stdout}")
    logger.info(f"[DEBUG LOG] FFmpeg static video stderr:\n{stderr}")
    
    if returncode != 0:
        raise RuntimeError(f"Failed to create static video: {stderr}")
        
    logger.info(f"[DEBUG LOG] create_static_video completed in {time.time() - start_time:.2f} seconds")
    await log_media_info(output_video_path, "Static Video Output")
    return output_video_path