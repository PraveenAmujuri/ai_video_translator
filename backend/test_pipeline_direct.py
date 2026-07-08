import os
import sys
import shutil
import asyncio
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).parent))

# Disable SQL echo and debug logs to prevent CP1252 charmap print crashes on Windows console
os.environ["DEBUG"] = "false"

# Load .env variables first
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# Set database URL to local translator_test.db
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///c:/Users/saipr/Downloads/ai_video_translator/backend/translator_test.db"

from core.config import settings
from core.database import init_db, create_job, AsyncSessionLocal, get_job, Job
from workers.tasks import _run_pipeline
from core.utils import run_subprocess
import json

# Setup uploads and outputs directories using settings
uploads_dir = settings.UPLOAD_DIR
uploads_dir.mkdir(parents=True, exist_ok=True)
outputs_dir = settings.OUTPUT_DIR
outputs_dir.mkdir(parents=True, exist_ok=True)

test_wav_source = Path("C:/Users/saipr/.gemini/antigravity/brain/f5b8cbae-1bc1-4e45-ac34-12a1f5720fb9/scratch/test_en_default.wav")
test_wav_dest = uploads_dir / "test_audio.wav"

if test_wav_source.exists():
    shutil.copy(test_wav_source, test_wav_dest)
    print(f"Copied test voice WAV from {test_wav_source} to {test_wav_dest}")
else:
    print(f"WARNING: source wav {test_wav_source} not found. Creating a dummy voice WAV file...")
    # generate a dummy wav using ffmpeg
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=1000:duration=5", str(test_wav_dest)]
    os.system(" ".join(cmd))

async def probe_file(file_path: Path):
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_format",
        "-show_streams",
        "-of", "json",
        str(file_path)
    ]
    # run subprocess
    p = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await p.communicate()
    if p.returncode == 0:
        return json.loads(stdout.decode())
    else:
        raise RuntimeError(f"ffprobe failed: {stderr.decode()}")

async def run_pipeline_test():
    print("Initializing Database...")
    await init_db()
    
    # -------------------------------------------------------------
    # CASE 1: Audio File Upload (WAV) with embed_subtitles = True
    # -------------------------------------------------------------
    print("\n--- CASE 1: Audio File Upload (WAV) ---")
    async with AsyncSessionLocal() as db:
        job1 = await create_job(
            db,
            original_filename="test_audio.wav",
            file_path=str(test_wav_dest),
            media_type="audio",
            target_language="hi",
            voice="hi-IN-rohan",
            preserve_background_audio=True,
            background_audio_volume=0.2,
            embed_subtitles=True,
            status="pending"
        )
        job1_id = job1.id
        print(f"Created Job A (Audio, Subtitles=True) with ID: {job1_id}")

    try:
        await _run_pipeline(job1_id)
        print("Pipeline run completed for Job A.")
    except Exception as e:
        print("Pipeline Job A failed with error:", e)
        raise e
        
    # Verification A
    translated_audio = outputs_dir / job1_id / "translated_audio.wav"
    static_video = outputs_dir / job1_id / "output.mp4"
    srt_file = outputs_dir / job1_id / "subtitles.srt"
    vtt_file = outputs_dir / job1_id / "subtitles.vtt"
    
    assert translated_audio.exists(), f"Job A output file does not exist: {translated_audio}"
    print(f"Job A output file exists at: {translated_audio}")
    
    info_audio = await probe_file(translated_audio)
    audio_codec = info_audio["streams"][0]["codec_name"]
    print(f"Job A output audio codec via ffprobe: {audio_codec}")
    assert audio_codec == "pcm_s16le", f"Expected codec pcm_s16le, but got {audio_codec}"
    
    # Verify static MP4
    assert static_video.exists(), f"Job A static video output does not exist: {static_video}"
    print(f"Job A static video exists at: {static_video}")
    info_video = await probe_file(static_video)
    # verify subtitle stream in output.mp4
    streams = info_video.get("streams", [])
    subtitle_streams = [s for s in streams if s.get("codec_type") == "subtitle"]
    print(f"Job A output video subtitle streams: {len(subtitle_streams)}")
    assert len(subtitle_streams) > 0, "Expected at least 1 subtitle stream"
    assert subtitle_streams[0]["codec_name"] == "mov_text", f"Expected mov_text codec, got {subtitle_streams[0]['codec_name']}"

    # Verify external subtitles
    assert srt_file.exists() and srt_file.stat().st_size > 0, "SRT file missing or empty"
    assert vtt_file.exists() and vtt_file.stat().st_size > 0, "WebVTT file missing or empty"
    print("Job A external subtitle verification succeeded.")

    # -------------------------------------------------------------
    # CASE 2: YouTube Video with embed_subtitles = True
    # -------------------------------------------------------------
    print("\n--- CASE 2: YouTube Video (Subtitles=True) ---")
    async with AsyncSessionLocal() as db:
        job2 = await create_job(
            db,
            youtube_url="https://www.youtube.com/watch?v=jNQXAC9IVRw",
            media_type="video",
            target_language="hi",
            voice="hi-IN-rohan",
            preserve_background_audio=True,
            background_audio_volume=0.2,
            embed_subtitles=True,
            status="pending"
        )
        job2_id = job2.id
        print(f"Created Job B (Video, Subtitles=True) with ID: {job2_id}")

    try:
        await _run_pipeline(job2_id)
        print("Pipeline run completed for Job B.")
    except Exception as e:
        print("Pipeline Job B failed with error:", e)
        raise e

    # Verification B
    video_out = outputs_dir / job2_id / "output.mp4"
    srt_file_b = outputs_dir / job2_id / "subtitles.srt"
    vtt_file_b = outputs_dir / job2_id / "subtitles.vtt"
    
    assert video_out.exists(), f"Job B output file does not exist: {video_out}"
    info_video_b = await probe_file(video_out)
    streams_b = info_video_b.get("streams", [])
    subtitle_streams_b = [s for s in streams_b if s.get("codec_type") == "subtitle"]
    audio_streams_b = [s for s in streams_b if s.get("codec_type") == "audio"]
    print(f"Job B video subtitle streams: {len(subtitle_streams_b)}")
    print(f"Job B video audio streams: {len(audio_streams_b)}")
    assert len(subtitle_streams_b) > 0, "Expected at least 1 subtitle stream"
    assert subtitle_streams_b[0]["codec_name"] == "mov_text", f"Expected mov_text codec, got {subtitle_streams_b[0]['codec_name']}"
    assert srt_file_b.exists() and srt_file_b.stat().st_size > 0, "SRT file missing or empty"
    assert vtt_file_b.exists() and vtt_file_b.stat().st_size > 0, "WebVTT file missing or empty"
    print("Job B verification succeeded.")

    # -------------------------------------------------------------
    # CASE 3: YouTube Video with embed_subtitles = False
    # -------------------------------------------------------------
    print("\n--- CASE 3: YouTube Video (Subtitles=False) ---")
    async with AsyncSessionLocal() as db:
        job3 = await create_job(
            db,
            youtube_url="https://www.youtube.com/watch?v=jNQXAC9IVRw",
            media_type="video",
            target_language="hi",
            voice="hi-IN-rohan",
            preserve_background_audio=True,
            background_audio_volume=0.2,
            embed_subtitles=False,
            status="pending"
        )
        job3_id = job3.id
        print(f"Created Job C (Video, Subtitles=False) with ID: {job3_id}")

    try:
        await _run_pipeline(job3_id)
        print("Pipeline run completed for Job C.")
    except Exception as e:
        print("Pipeline Job C failed with error:", e)
        raise e

    # Verification C
    video_out_c = outputs_dir / job3_id / "output.mp4"
    srt_file_c = outputs_dir / job3_id / "subtitles.srt"
    vtt_file_c = outputs_dir / job3_id / "subtitles.vtt"
    
    assert video_out_c.exists(), f"Job C output file does not exist: {video_out_c}"
    info_video_c = await probe_file(video_out_c)
    streams_c = info_video_c.get("streams", [])
    subtitle_streams_c = [s for s in streams_c if s.get("codec_type") == "subtitle"]
    audio_streams_c = [s for s in streams_c if s.get("codec_type") == "audio"]
    print(f"Job C video subtitle streams: {len(subtitle_streams_c)}")
    print(f"Job C video audio streams: {len(audio_streams_c)}")
    assert len(subtitle_streams_c) == 0, f"Expected 0 subtitle streams, but got {len(subtitle_streams_c)}"
    assert srt_file_c.exists() and srt_file_c.stat().st_size > 0, "SRT file missing or empty"
    assert vtt_file_c.exists() and vtt_file_c.stat().st_size > 0, "WebVTT file missing or empty"
    print("Job C verification succeeded.")
    
    print("\n=============================================")
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!!!")
    print("=============================================")

if __name__ == "__main__":
    asyncio.run(run_pipeline_test())
