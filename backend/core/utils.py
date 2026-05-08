import re
import logging
import asyncio
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def format_srt_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_vtt_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def sanitize_filename(filename: str) -> str:
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    filename = re.sub(r'\s+', '_', filename)
    return filename[:200]


async def run_subprocess(cmd: list, cwd: Optional[Path] = None) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace")


def seconds_to_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:05.2f}"
    return f"{m}:{s:05.2f}"


LANGUAGE_MAP = {
    "af": {"name": "Afrikaans", "native": "Afrikaans", "flag": "🇿🇦"},
    "ar": {"name": "Arabic", "native": "العربية", "flag": "🇸🇦"},
    "az": {"name": "Azerbaijani", "native": "Azərbaycanca", "flag": "🇦🇿"},
    "be": {"name": "Belarusian", "native": "Беларуская", "flag": "🇧🇾"},
    "bg": {"name": "Bulgarian", "native": "Български", "flag": "🇧🇬"},
    "bn": {"name": "Bengali", "native": "বাংলা", "flag": "🇧🇩"},
    "bs": {"name": "Bosnian", "native": "Bosanski", "flag": "🇧🇦"},
    "ca": {"name": "Catalan", "native": "Català", "flag": "🏴"},
    "cs": {"name": "Czech", "native": "Čeština", "flag": "🇨🇿"},
    "cy": {"name": "Welsh", "native": "Cymraeg", "flag": "🏴󠁧󠁢󠁷󠁬󠁳󠁿"},
    "da": {"name": "Danish", "native": "Dansk", "flag": "🇩🇰"},
    "de": {"name": "German", "native": "Deutsch", "flag": "🇩🇪"},
    "el": {"name": "Greek", "native": "Ελληνικά", "flag": "🇬🇷"},
    "en": {"name": "English", "native": "English", "flag": "🇺🇸"},
    "es": {"name": "Spanish", "native": "Español", "flag": "🇪🇸"},
    "et": {"name": "Estonian", "native": "Eesti", "flag": "🇪🇪"},
    "eu": {"name": "Basque", "native": "Euskara", "flag": "🏴"},
    "fa": {"name": "Persian", "native": "فارسی", "flag": "🇮🇷"},
    "fi": {"name": "Finnish", "native": "Suomi", "flag": "🇫🇮"},
    "fr": {"name": "French", "native": "Français", "flag": "🇫🇷"},
    "gl": {"name": "Galician", "native": "Galego", "flag": "🏴"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "flag": "🇮🇳"},
    "he": {"name": "Hebrew", "native": "עברית", "flag": "🇮🇱"},
    "hi": {"name": "Hindi", "native": "हिन्दी", "flag": "🇮🇳"},
    "hr": {"name": "Croatian", "native": "Hrvatski", "flag": "🇭🇷"},
    "hu": {"name": "Hungarian", "native": "Magyar", "flag": "🇭🇺"},
    "hy": {"name": "Armenian", "native": "Հայերեն", "flag": "🇦🇲"},
    "id": {"name": "Indonesian", "native": "Bahasa Indonesia", "flag": "🇮🇩"},
    "is": {"name": "Icelandic", "native": "Íslenska", "flag": "🇮🇸"},
    "it": {"name": "Italian", "native": "Italiano", "flag": "🇮🇹"},
    "ja": {"name": "Japanese", "native": "日本語", "flag": "🇯🇵"},
    "ka": {"name": "Georgian", "native": "ქართული", "flag": "🇬🇪"},
    "kk": {"name": "Kazakh", "native": "Қазақша", "flag": "🇰🇿"},
    "km": {"name": "Khmer", "native": "ខ្មែរ", "flag": "🇰🇭"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "flag": "🇮🇳"},
    "ko": {"name": "Korean", "native": "한국어", "flag": "🇰🇷"},
    "lo": {"name": "Lao", "native": "ລາວ", "flag": "🇱🇦"},
    "lt": {"name": "Lithuanian", "native": "Lietuvių", "flag": "🇱🇹"},
    "lv": {"name": "Latvian", "native": "Latviešu", "flag": "🇱🇻"},
    "mk": {"name": "Macedonian", "native": "Македонски", "flag": "🇲🇰"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "flag": "🇮🇳"},
    "mn": {"name": "Mongolian", "native": "Монгол", "flag": "🇲🇳"},
    "mr": {"name": "Marathi", "native": "मराठी", "flag": "🇮🇳"},
    "ms": {"name": "Malay", "native": "Bahasa Melayu", "flag": "🇲🇾"},
    "mt": {"name": "Maltese", "native": "Malti", "flag": "🇲🇹"},
    "my": {"name": "Burmese", "native": "မြန်မာ", "flag": "🇲🇲"},
    "nb": {"name": "Norwegian", "native": "Norsk", "flag": "🇳🇴"},
    "ne": {"name": "Nepali", "native": "नेपाली", "flag": "🇳🇵"},
    "nl": {"name": "Dutch", "native": "Nederlands", "flag": "🇳🇱"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "flag": "🇮🇳"},
    "pl": {"name": "Polish", "native": "Polski", "flag": "🇵🇱"},
    "pt": {"name": "Portuguese", "native": "Português", "flag": "🇧🇷"},
    "ro": {"name": "Romanian", "native": "Română", "flag": "🇷🇴"},
    "ru": {"name": "Russian", "native": "Русский", "flag": "🇷🇺"},
    "si": {"name": "Sinhala", "native": "සිංහල", "flag": "🇱🇰"},
    "sk": {"name": "Slovak", "native": "Slovenčina", "flag": "🇸🇰"},
    "sl": {"name": "Slovenian", "native": "Slovenščina", "flag": "🇸🇮"},
    "sq": {"name": "Albanian", "native": "Shqip", "flag": "🇦🇱"},
    "sr": {"name": "Serbian", "native": "Српски", "flag": "🇷🇸"},
    "sv": {"name": "Swedish", "native": "Svenska", "flag": "🇸🇪"},
    "sw": {"name": "Swahili", "native": "Kiswahili", "flag": "🇰🇪"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "flag": "🇮🇳"},
    "te": {"name": "Telugu", "native": "తెలుగు", "flag": "🇮🇳"},
    "tg": {"name": "Tajik", "native": "Тоҷикӣ", "flag": "🇹🇯"},
    "th": {"name": "Thai", "native": "ภาษาไทย", "flag": "🇹🇭"},
    "tk": {"name": "Turkmen", "native": "Türkmençe", "flag": "🇹🇲"},
    "tl": {"name": "Filipino", "native": "Filipino", "flag": "🇵🇭"},
    "tr": {"name": "Turkish", "native": "Türkçe", "flag": "🇹🇷"},
    "tt": {"name": "Tatar", "native": "Татарча", "flag": "🇷🇺"},
    "uk": {"name": "Ukrainian", "native": "Українська", "flag": "🇺🇦"},
    "ur": {"name": "Urdu", "native": "اردو", "flag": "🇵🇰"},
    "uz": {"name": "Uzbek", "native": "O'zbek", "flag": "🇺🇿"},
    "vi": {"name": "Vietnamese", "native": "Tiếng Việt", "flag": "🇻🇳"},
    "zh": {"name": "Chinese", "native": "中文", "flag": "🇨🇳"},
}


def get_language_info(code: str) -> dict:
    return LANGUAGE_MAP.get(code, {"name": code, "native": code, "flag": "🌐"})