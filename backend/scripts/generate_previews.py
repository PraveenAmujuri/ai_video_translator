import sys
import os
import wave
import subprocess
from pathlib import Path
import shutil

# Add backend directory to sys path so we can import services
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from services.ai_service import scan_voices, VOICE_REGISTRY
from piper.voice import PiperVoice

SAMPLE_SENTENCES = {
    "en": "Hello! This is a preview of the EchoX neural voice synthesis engine.",
    "hi": "नमस्ते! यह एकोएक्स न्यूरल वॉयस सिंथेसिस इंजन का पूर्वावलोकन है।",
    "te": "నమస్కారం! ఇది ఎకోఎక్స్ న్యూరల్ వాయిస్ సింథసిస్ ఇంజిన్ యొక్క ప్రివ్యూ.",
    "ml": "നమസ്കാരം! ഇത് എക്കോഎക്സ് ന്യൂറൽ വോയ്സ് സിന്തസിസ് എഞ്ചിന്റെ പ്രിവ്യൂ ആണ്.",
    "ur": "ہیلو! یہ ایکو ایکس نیورل وائس سنتھیسس انجن کا پیش نظارہ ہے۔",
    "es": "¡Hola! Esta es una vista previa del motor de síntesis de voz neuronal de EchoX.",
    "fr": "Bonjour! Ceci est un aperçu du moteur de synthèse vocale neuronale EchoX.",
    "de": "Hallo! Dies ist eine Vorschau der neuronalen Sprachsynthese-Engine von EchoX.",
    "it": "Ciao! Questa è un'anteprima del motore di sintesi vocale neurale di EchoX.",
    "pt": "Olá! Esta é uma prévia do mecanismo de síntese de voz neural do EchoX.",
    "zh": "你好！这是 EchoX 神经语音合成引擎的预览。",
    "ru": "Привет! Это превью нейронного движка синтеза речи EchoX.",
    "ar": "مرحبًا! هذا عرض تجريبي لمحرك تركيب الصوت العصبي من EchoX.",
    "tr": "Merhaba! Bu, EchoX nöral ses sentezi motorunun bir önizlemesidir.",
    "id": "Halo! Ini adalah pratinjau dari mesin sintesis suara saraf EchoX.",
    "vi": "Xin chào! Đây là bản xem trước của công cụ tổng hợp giọng nói EchoX.",
    "nl": "Hallo! Dit is een preview van de neurale spraaksynthese-engine van EchoX.",
    "pl": "Cześć! To jest podgląd neuronowego silnika syntezy mowy EchoX."
}

def main():
    print("Discovering installed voices...")
    # Rescan to populate registry
    scan_voices()

    frontend_base = backend_dir.parent / "frontend" / "public" / "voice-previews"
    desktop_base = backend_dir.parent / "EchoXDesktop" / "public" / "voice-previews"

    # Make sure target directories exist
    frontend_base.mkdir(parents=True, exist_ok=True)
    desktop_base.mkdir(parents=True, exist_ok=True)

    voice_count = 0
    generated_count = 0

    for lang_family, lang_entry in VOICE_REGISTRY.items():
        for voice_id, voice_meta in lang_entry["voices"].items():
            voice_count += 1
            print(f"\n[{voice_count}] Processing voice: {voice_id}")
            
            sample_text = SAMPLE_SENTENCES.get(lang_family, "Hello! This is a preview of the EchoX voice library.")
            model_path = voice_meta["model_path"]
            
            # Paths inside the locale folder
            frontend_dir = frontend_base / lang_family
            desktop_dir = desktop_base / lang_family
            frontend_dir.mkdir(parents=True, exist_ok=True)
            desktop_dir.mkdir(parents=True, exist_ok=True)

            out_mp3_frontend = frontend_dir / f"{voice_id}.mp3"
            out_mp3_desktop = desktop_dir / f"{voice_id}.mp3"

            if out_mp3_frontend.exists() and out_mp3_desktop.exists():
                print(f"  Previews already exist at target paths. Skipping generation.")
                continue

            # Generate temporary WAV
            temp_wav = Path(model_path).parent / f"{voice_id}_temp_preview.wav"
            try:
                print(f"  Loading Piper model: {Path(model_path).name}...")
                voice_model = PiperVoice.load(model_path)
                
                print(f"  Synthesizing test phrase (length {len(sample_text)})")
                with wave.open(str(temp_wav), "wb") as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(voice_model.config.sample_rate)
                    
                    for chunk in voice_model.synthesize(sample_text):
                        if hasattr(chunk, "audio_int16_bytes"):
                            wav_file.writeframes(chunk.audio_int16_bytes)
                        elif hasattr(chunk, "audio"):
                            wav_file.writeframes(chunk.audio)
                        elif isinstance(chunk, bytes):
                            wav_file.writeframes(chunk)
                
                # Compress to MP3 using ffmpeg
                print("  Compressing to MP3...")
                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(temp_wav),
                    "-codec:a", "libmp3lame",
                    "-qscale:a", "5",  # VBR ~96kbps, very small and high quality
                    str(temp_wav.with_suffix(".mp3"))
                ]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                
                generated_mp3 = temp_wav.with_suffix(".mp3")
                
                # Copy to both locations
                shutil.copy(str(generated_mp3), str(out_mp3_frontend))
                shutil.copy(str(generated_mp3), str(out_mp3_desktop))
                print(f"  Saved preview to: \n    -> {out_mp3_frontend.relative_to(backend_dir.parent)}\n    -> {out_mp3_desktop.relative_to(backend_dir.parent)}")
                
                # Cleanup temp files
                if temp_wav.exists():
                    temp_wav.unlink()
                if generated_mp3.exists():
                    generated_mp3.unlink()
                
                generated_count += 1
            except Exception as e:
                print(f"  ERROR generating preview for {voice_id}: {e}")
                if temp_wav.exists():
                    try:
                        temp_wav.unlink()
                    except:
                        pass

    print(f"\nDone! Processed {voice_count} voices. Generated {generated_count} new previews.")

if __name__ == "__main__":
    main()
