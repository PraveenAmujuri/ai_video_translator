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


async def has_video_stream(file_path: Path) -> bool:
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v",
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


async def download_youtube_video(url: str, job_id: str) -> Path:
    video_id = extract_video_id(url)
    api_url = "https://youtube-info-download-api.p.rapidapi.com/ajax/download.php"
    headers = {
        "x-rapidapi-host": "youtube-info-download-api.p.rapidapi.com",
        "x-rapidapi-key": settings.RAPIDAPI_KEY
    }
    
    # Try requesting highest quality (1080) first
    formats_to_try = ["1080", "720", "480", "360"]
    initial_data = None
    
    async with httpx.AsyncClient() as client:
        for fmt in formats_to_try:
            params = {
                "format": fmt,
                "add_info": "0",
                "url": url,
                "allow_extended_duration": "false",
                "no_merge": "false"
            }
            try:
                logger.info(f"Initiating YouTube video download from RapidAPI with format {fmt}...")
                res = await client.get(api_url, headers=headers, params=params, timeout=20.0)
                if res.status_code == 200:
                    data = res.json()
                    # The API returns success: true when conversion starts or if cached
                    if data.get("success") or data.get("progress_url") or data.get("id"):
                        initial_data = data
                        break
                    else:
                        logger.warning(f"RapidAPI success=False for format {fmt}: {data.get('text')}")
                else:
                    logger.warning(f"RapidAPI request returned status {res.status_code} for format {fmt}")
            except Exception as e:
                logger.error(f"Error querying RapidAPI for format {fmt}: {str(e)}")
                
        if not initial_data:
            raise RuntimeError("Failed to resolve or initiate video download link from RapidAPI.")
            
        progress_url = initial_data.get("progress_url")
        download_url = initial_data.get("url") or initial_data.get("download_url")
        
        if not download_url:
            if not progress_url:
                raise RuntimeError("RapidAPI did not return a valid download link or progress endpoint.")
                
            logger.info(f"Polling dynamic progress endpoint: {progress_url}")
            resolved = False
            # Poll every 2 seconds for a maximum of 45 attempts (90 seconds)
            for attempt in range(45):
                await asyncio.sleep(2.0)
                try:
                    poll_res = await client.get(progress_url, timeout=15.0)
                    if poll_res.status_code == 200:
                        poll_data = poll_res.json()
                        text = poll_data.get("text", "")
                        progress = poll_data.get("progress", 0)
                        logger.info(f"RapidAPI progress polling (attempt {attempt+1}): {text} ({progress}%)")
                        
                        if (poll_data.get("success") == 1 or poll_data.get("success") is True) and poll_data.get("download_url"):
                            download_url = poll_data.get("download_url")
                            resolved = True
                            break
                        elif poll_data.get("success") == 0:
                            continue
                        else:
                            raise RuntimeError(f"RapidAPI progress polling error: {poll_data}")
                    else:
                        logger.warning(f"RapidAPI progress check HTTP status: {poll_res.status_code}")
                except Exception as poll_err:
                    logger.warning(f"RapidAPI progress check failed: {str(poll_err)}")
                    
            if not resolved or not download_url:
                raise RuntimeError("YouTube conversion process timed out or failed on the conversion API.")
                
        output_dir = settings.UPLOAD_DIR / job_id
        output_dir.mkdir(parents=True, exist_ok=True)
        video_path = output_dir / "video.mp4"
        
        logger.info(f"Downloading MP4 stream from resolved link: {download_url}")
        async with client.stream("GET", download_url, timeout=60.0) as response:
            if response.status_code != 200:
                raise RuntimeError(f"Failed to download resolved MP4 video stream. HTTP status: {response.status_code}")
            with open(video_path, "wb") as f:
                async for chunk in response.aiter_bytes():
                    f.write(chunk)
                    
        logger.info(f"Successfully downloaded YouTube video to {video_path}")
        
        # Verify the file exists and is a valid MP4 containing both video and audio streams
        if not video_path.exists() or video_path.stat().st_size == 0:
            raise RuntimeError("Downloaded video file is empty or missing from disk.")
            
        has_v = await has_video_stream(video_path)
        has_a = await has_audio_stream(video_path)
        
        if not has_v or not has_a:
            if video_path.exists():
                try:
                    video_path.unlink()
                except Exception:
                    pass
            raise RuntimeError(
                f"Invalid download: Selected stream must be a valid MP4 containing both video and audio. "
                f"Has video: {has_v}, Has audio: {has_a}"
            )
            
        return video_path
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