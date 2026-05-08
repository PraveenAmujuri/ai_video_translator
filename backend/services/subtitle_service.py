import logging
from pathlib import Path
from typing import List, Dict
from core.utils import format_srt_time, format_vtt_time

logger = logging.getLogger(__name__)


def generate_srt(segments: List[Dict], output_path: Path, use_translated: bool = True) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = []

    for i, seg in enumerate(segments, 1):
        text = seg.get("translated", "") if use_translated else seg.get("text", "")
        if not text:
            text = seg.get("text", "")

        start = format_srt_time(seg["start"])
        end = format_srt_time(seg["end"])

        lines.extend([
            str(i),
            f"{start} --> {end}",
            text.strip(),
            "",
        ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    logger.info(f"Generated SRT with {len(segments)} entries at {output_path}")
    return output_path


def generate_vtt(segments: List[Dict], output_path: Path, use_translated: bool = True) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["WEBVTT", ""]

    for i, seg in enumerate(segments, 1):
        text = seg.get("translated", "") if use_translated else seg.get("text", "")
        if not text:
            text = seg.get("text", "")

        start = format_vtt_time(seg["start"])
        end = format_vtt_time(seg["end"])

        lines.extend([
            f"{i}",
            f"{start} --> {end}",
            text.strip(),
            "",
        ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path


def generate_bilingual_srt(segments: List[Dict], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = []

    for i, seg in enumerate(segments, 1):
        original = seg.get("text", "").strip()
        translated = seg.get("translated", "").strip()

        start = format_srt_time(seg["start"])
        end = format_srt_time(seg["end"])

        combined = ""
        if translated and translated != original:
            combined = f"{translated}\n({original})"
        else:
            combined = original

        lines.extend([
            str(i),
            f"{start} --> {end}",
            combined,
            "",
        ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path


def parse_srt(srt_content: str) -> List[Dict]:
    segments = []
    blocks = srt_content.strip().split("\n\n")

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue

        try:
            idx = int(lines[0].strip())
        except ValueError:
            continue

        time_parts = lines[1].split(" --> ")
        if len(time_parts) != 2:
            continue

        start = _parse_srt_time(time_parts[0].strip())
        end = _parse_srt_time(time_parts[1].strip())
        text = "\n".join(lines[2:]).strip()

        segments.append({
            "id": idx - 1,
            "start": start,
            "end": end,
            "text": text,
        })

    return segments


def _parse_srt_time(time_str: str) -> float:
    time_str = time_str.replace(",", ".")
    parts = time_str.split(":")
    if len(parts) == 3:
        hours = float(parts[0])
        minutes = float(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    return 0.0