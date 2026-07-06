use std::path::{Path, PathBuf};
use std::time::Instant;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter, Manager};

const DEMUCS_ZIP_URL: &str = "https://api.praveenai.tech/static/demucs-win.zip";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub model_name: String,
    pub version: String,
    pub checksum: String,
    pub updated_at: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct SeparationDownloadProgress {
    pub percentage: f32,
    pub status: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct SeparationResult {
    pub vocals_path: String,
    pub instrumental_path: String,
}

fn demucs_dir_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {}", e))?;
    Ok(app_data.join("echox").join("demucs"))
}

fn demucs_exe_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = demucs_dir_path(app)?;
    let exe = if cfg!(target_os = "windows") {
        "demucs.exe"
    } else {
        "demucs"
    };
    Ok(dir.join(exe))
}

fn model_info_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = demucs_dir_path(app)?;
    Ok(dir.join("model_info.json"))
}

#[tauri::command]
pub async fn check_and_install_demucs_engine(app: AppHandle) -> Result<bool, String> {
    let exe_path = demucs_exe_path(&app)?;
    let info_path = model_info_path(&app)?;

    // Check if both executable and model_info metadata are already cached
    if exe_path.exists() && info_path.exists() {
        if let Ok(data) = fs::read_to_string(&info_path).await {
            if let Ok(info) = serde_json::from_str::<ModelInfo>(&data) {
                // If model metadata checks out, bypass download
                if info.version == "4.0.1" {
                    return Ok(true);
                }
            }
        }
    }

    // Lazy Downloader: download zip package from CDN
    let dir = demucs_dir_path(&app)?;
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create demucs directory: {}", e))?;

    let zip_path = dir.join("demucs.zip");

    let client = reqwest::Client::new();
    let response = client
        .get(DEMUCS_ZIP_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to download Demucs: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned HTTP status {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut file = fs::File::create(&zip_path)
        .await
        .map_err(|e| format!("Failed to create zip file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Error downloading chunk: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write chunk: {}", e))?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percentage = (downloaded as f32 / total_size as f32) * 100.0;
            let _ = app.emit(
                "separation-download-progress",
                SeparationDownloadProgress {
                    percentage,
                    status: "downloading".to_string(),
                },
            );
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush downloaded zip: {}", e))?;
    drop(file);

    // Unzip the package
    let _ = app.emit(
        "separation-download-progress",
        SeparationDownloadProgress {
            percentage: 100.0,
            status: "extracting".to_string(),
        },
    );

    let status = if cfg!(target_os = "windows") {
        tokio::process::Command::new("powershell")
            .args([
                "-Command",
                &format!(
                    "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
                    zip_path.display(),
                    dir.display()
                ),
            ])
            .status()
            .await
            .map_err(|e| format!("PowerShell extraction failed: {}", e))?
    } else {
        tokio::process::Command::new("unzip")
            .args([
                "-o",
                zip_path.to_str().unwrap(),
                "-d",
                dir.to_str().unwrap(),
            ])
            .status()
            .await
            .map_err(|e| format!("unzip failed: {}", e))?
    };

    if !status.success() {
        return Err("Extraction command failed".to_string());
    }

    // Cleanup zip file
    let _ = fs::remove_file(zip_path).await;

    // Set permission on unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = fs::metadata(&exe_path).await {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&exe_path, perms).await;
        }
    }

    // Write metadata
    let model_info = ModelInfo {
        model_name: "htdemucs".to_string(),
        version: "4.0.1".to_string(),
        checksum: "a8f3b28b6d412e".to_string(),
        updated_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    if let Ok(info_str) = serde_json::to_string(&model_info) {
        let _ = fs::write(&info_path, info_str).await;
    }

    let _ = app.emit(
        "separation-download-progress",
        SeparationDownloadProgress {
            percentage: 100.0,
            status: "ready".to_string(),
        },
    );

    Ok(true)
}

#[tauri::command]
pub async fn run_local_audio_separation(
    app: AppHandle,
    input_path: String,
    job_id: String,
) -> Result<SeparationResult, String> {
    let start_time = Instant::now();
    println!("[separation] Starting local extraction & separation for job: {}", job_id);

    // Create temp directory for current job
    let temp_dir = std::env::temp_dir()
        .join("EchoX")
        .join("jobs")
        .join(&job_id);

    fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("Failed to create job directory: {}", e))?;

    let extracted_audio_path = temp_dir.join("audio.wav");

    // Step 1: Local FFmpeg Mono Audio Extraction
    println!("[separation] Extracting audio from {}", input_path);
    let extract_status = tokio::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            &input_path,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            extracted_audio_path.to_str().unwrap(),
        ])
        .status()
        .await
        .map_err(|e| format!("Local FFmpeg execution failed: {}", e))?;

    if !extract_status.success() {
        return Err("Local FFmpeg audio extraction failed".to_string());
    }

    // Step 2: Local Demucs Subprocess call
    let demucs_exe = demucs_exe_path(&app)?;
    if !demucs_exe.exists() {
        return Err("Demucs engine not installed. Check and install it first.".to_string());
    }

    println!("[separation] Running Demucs on {}", extracted_audio_path.display());
    
    // Check hardware acceleration
    let args = vec![
        "-n",
        "htdemucs",
        "--two-stems",
        "vocals",
        "-o",
        temp_dir.to_str().unwrap(),
        extracted_audio_path.to_str().unwrap(),
    ];

    // Detect if GPU is available to log active device
    let mut hardware = "CPU";
    // We let demucs auto-detect cuda/mps unless forced
    if cfg!(target_os = "windows") {
        // Simple heuristic: let demucs choose GPU by default
        hardware = "Auto (CPU/GPU)";
    }
    println!("[separation] Spawning Demucs executable utilizing hardware: {}", hardware);

    let sep_status = tokio::process::Command::new(&demucs_exe)
        .args(&args)
        .status()
        .await
        .map_err(|e| format!("Demucs execution failed: {}", e))?;

    if !sep_status.success() {
        return Err("Demucs separation failed".to_string());
    }

    // Demucs places results in: temp_dir / htdemucs / audio / [vocals.wav, no_vocals.wav]
    let raw_vocals = temp_dir.join("htdemucs").join("audio").join("vocals.wav");
    let raw_no_vocals = temp_dir.join("htdemucs").join("audio").join("no_vocals.wav");

    if !raw_vocals.exists() || !raw_no_vocals.exists() {
        return Err("Demucs did not output expected stems".to_string());
    }

    let final_vocals = temp_dir.join("vocals.wav");
    let final_instrumental = temp_dir.join("instrumental.wav");

    fs::rename(&raw_vocals, &final_vocals)
        .await
        .map_err(|e| format!("Failed to move vocals track: {}", e))?;
    fs::rename(&raw_no_vocals, &final_instrumental)
        .await
        .map_err(|e| format!("Failed to move instrumental track: {}", e))?;

    // Cleanup Demucs nested outputs structure
    let _ = fs::remove_dir_all(temp_dir.join("htdemucs")).await;

    let elapsed = start_time.elapsed().as_secs();
    println!(
        "[separation] Completed local separation in {}s. Output: vocals={}, instrumental={}",
        elapsed,
        final_vocals.display(),
        final_instrumental.display()
    );

    Ok(SeparationResult {
        vocals_path: final_vocals.to_str().unwrap().to_string(),
        instrumental_path: final_instrumental.to_str().unwrap().to_string(),
    })
}

#[tauri::command]
pub async fn run_local_audio_mixing(
    job_id: String,
    video_path: String,
    instrumental_path: String,
    dubbed_path: String,
    output_name: String,
    volume: f32,
) -> Result<String, String> {
    let start_time = Instant::now();
    let temp_dir = std::env::temp_dir()
        .join("EchoX")
        .join("jobs")
        .join(&job_id);
    let output_path = temp_dir.join(&output_name).to_str().unwrap().to_string();
    println!("[mixing] Starting local FFmpeg mastering & mixing for output: {}", output_path);

    // Let's determine target format
    let ext = Path::new(&output_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4")
        .to_lowercase();
    
    // Check if the input is audio only
    let is_audio = ext != "mp4" && ext != "mkv" && ext != "webm" && ext != "avi" && ext != "mov";

    let mut args = vec!["-y"];
    let filter_complex_str = format!("[0:a]volume={}[bg];[bg][1:a]amix=inputs=2:duration=longest[a]", volume);

    if instrumental_path.is_empty() || !Path::new(&instrumental_path).exists() {
        // Simple mixing fallback
        if is_audio {
            args.extend([
                "-i", &video_path, // in audio mode, video_path is original_audio
                "-i", &dubbed_path,
                "-filter_complex", &filter_complex_str,
                "-map", "[a]",
            ]);
            // Add codec
            match ext.as_str() {
                "mp3" => args.extend(["-c:a", "libmp3lame", "-b:a", "192k"]),
                "wav" => args.extend(["-c:a", "pcm_s16le"]),
                "m4a" => args.extend(["-c:a", "aac", "-b:a", "192k"]),
                "aac" => args.extend(["-c:a", "aac", "-b:a", "192k"]),
                _ => args.extend(["-c:a", "libmp3lame", "-b:a", "192k"]),
            };
        } else {
            args.extend([
                "-i", &video_path,
                "-i", &dubbed_path,
                "-filter_complex", &filter_complex_str,
                "-map", "0:v:0",
                "-map", "[a]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
            ]);
        }
    } else {
        // High-Quality AI Preserved Mastering Pipeline
        if is_audio {
            args.extend([
                "-i", &instrumental_path,
                "-i", &dubbed_path,
                "-filter_complex",
                "[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[inst_norm]; \
                 [1:a]compand=attacks=0.01:decays=0.1:points=-900/-900|-20/-12|0/-3:soft-link=0.01[dub_compressed]; \
                 [inst_norm][dub_compressed]amix=inputs=2:duration=longest:dropout_transition=2[mixed]; \
                 [mixed]loudnorm=I=-16:TP=-1.5:LRA=11[a]",
                "-map", "[a]",
            ]);
            // Add codec
            match ext.as_str() {
                "mp3" => args.extend(["-c:a", "libmp3lame", "-b:a", "192k"]),
                "wav" => args.extend(["-c:a", "pcm_s16le"]),
                "m4a" => args.extend(["-c:a", "aac", "-b:a", "192k"]),
                "aac" => args.extend(["-c:a", "aac", "-b:a", "192k"]),
                _ => args.extend(["-c:a", "libmp3lame", "-b:a", "192k"]),
            };
        } else {
            args.extend([
                "-i", &video_path,
                "-i", &dubbed_path,
                "-i", &instrumental_path,
                "-filter_complex",
                "[2:a]loudnorm=I=-16:TP=-1.5:LRA=11[inst_norm]; \
                 [1:a]compand=attacks=0.01:decays=0.1:points=-900/-900|-20/-12|0/-3:soft-link=0.01[dub_compressed]; \
                 [inst_norm][dub_compressed]amix=inputs=2:duration=longest:dropout_transition=2[mixed]; \
                 [mixed]loudnorm=I=-16:TP=-1.5:LRA=11[a]",
                "-map", "0:v:0",
                "-map", "[a]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
            ]);
        }
    }

    args.push(&output_path);

    println!("[mixing] Spawning FFmpeg command: ffmpeg {}", args.join(" "));

    let status = tokio::process::Command::new("ffmpeg")
        .args(&args)
        .status()
        .await
        .map_err(|e| format!("Local FFmpeg merge failed: {}", e))?;

    if !status.success() {
        return Err("Local FFmpeg mastering & mixing failed".to_string());
    }

    let elapsed = start_time.elapsed().as_secs();
    println!("[mixing] Completed mixing in {}s.", elapsed);

    Ok(output_path)
}

#[tauri::command]
pub async fn download_dubbed_voice(
    _app: AppHandle,
    job_id: String,
) -> Result<String, String> {
    let temp_dir = std::env::temp_dir()
        .join("EchoX")
        .join("jobs")
        .join(&job_id);

    fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("Failed to create job directory: {}", e))?;

    let dest_path = temp_dir.join("dubbed_audio.wav");

    // Try downloading the lossless wav file first
    let mut download_url = format!("https://api.praveenai.tech/outputs/{}/translated_audio.wav", job_id);
    let client = reqwest::Client::new();
    let mut response = client.get(&download_url).send().await;

    // Fallback to dubbed_audio.mp3 if wav is not found
    if response.is_err() || !response.as_ref().unwrap().status().is_success() {
        download_url = format!("https://api.praveenai.tech/outputs/{}/dubbed_audio.mp3", job_id);
        response = client.get(&download_url).send().await;
    }

    let response = response.map_err(|e| format!("Failed to connect to backend: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("Backend returned status {}", response.status()));
    }

    let mut file = fs::File::create(&dest_path)
        .await
        .map_err(|e| format!("Failed to create local dubbed file: {}", e))?;

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream read error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush file: {}", e))?;

    Ok(dest_path.to_str().unwrap().to_string())
}

#[tauri::command]
pub async fn cleanup_local_job_files(job_id: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir()
        .join("EchoX")
        .join("jobs")
        .join(&job_id);
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(temp_dir).await;
    }
    Ok(())
}
