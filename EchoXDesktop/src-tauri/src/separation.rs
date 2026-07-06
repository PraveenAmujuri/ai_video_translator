use std::path::{Path, PathBuf};
use std::time::Instant;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter, Manager};
use ort::session::Session;
use ort::value::Tensor;

const ENGINE_ZIP_URL: &str = "https://api.praveenai.tech/static/separation-engine-win.zip";

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

// Generic path helpers used by local installer and session runner
fn separation_dir_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {}", e))?;
    Ok(app_data.join("echox").join("separation"))
}

fn model_info_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = separation_dir_path(app)?;
    Ok(dir.join("model_info.json"))
}

/// Generic SeparationEngine trait defining the lifecycle expected by the local separation.
pub trait SeparationEngine {
    fn is_installed(&self, app: &AppHandle) -> impl std::future::Future<Output = Result<bool, String>> + Send;
    fn install(&self, app: &AppHandle) -> impl std::future::Future<Output = Result<bool, String>> + Send;
    fn separate(
        &self,
        app: &AppHandle,
        input_path: &Path,
        output_dir: &Path,
    ) -> impl std::future::Future<Output = Result<SeparationResult, String>> + Send;
}

/// Production-ready OnnxSeparationEngine implementing dynamic loader, EPs, and chunked inference.
pub struct OnnxSeparationEngine;

impl SeparationEngine for OnnxSeparationEngine {
    async fn is_installed(&self, app: &AppHandle) -> Result<bool, String> {
        let dir = separation_dir_path(app)?;
        
        let dylib_name = if cfg!(target_os = "windows") {
            "onnxruntime.dll"
        } else if cfg!(target_os = "macos") {
            "libonnxruntime.dylib"
        } else {
            "libonnxruntime.so"
        };
        
        let dylib_path = dir.join(dylib_name);
        let model_path = dir.join("model.onnx");
        let info_path = model_info_path(app)?;
        
        if dylib_path.exists() && model_path.exists() && info_path.exists() {
            if let Ok(data) = fs::read_to_string(&info_path).await {
                if let Ok(info) = serde_json::from_str::<ModelInfo>(&data) {
                    if info.version == "1.0.0" {
                        return Ok(true);
                    }
                }
            }
        }
        
        Ok(false)
    }

    async fn install(&self, app: &AppHandle) -> Result<bool, String> {
        if self.is_installed(app).await.unwrap_or(false) {
            return Ok(true);
        }

        let dir = separation_dir_path(app)?;
        fs::create_dir_all(&dir)
            .await
            .map_err(|e| format!("Failed to create separation directory: {}", e))?;

        let zip_path = dir.join("separation.zip");

        // Download the engine ZIP package
        let _ = app.emit(
            "separation-download-progress",
            SeparationDownloadProgress {
                percentage: 0.0,
                status: "downloading".to_string(),
            },
        );

        let client = reqwest::Client::new();
        let response = client
            .get(ENGINE_ZIP_URL)
            .send()
            .await
            .map_err(|e| format!("Failed to download separation engine: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Server returned HTTP status {}", response.status()));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut file = fs::File::create(&zip_path)
            .await
            .map_err(|e| format!("Failed to create zip file: {}", e))?;

        let mut stream = response.bytes_stream();
        let mut downloaded: u64 = 0;
        let mut last_emitted_percent: u32 = 0;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Error downloading chunk: {}", e))?;
            file.write_all(&chunk)
                .await
                .map_err(|e| format!("Failed to write chunk: {}", e))?;
            downloaded += chunk.len() as u64;

            if total_size > 0 {
                let percentage = (downloaded as f32 / total_size as f32) * 100.0;
                let percent_int = percentage as u32;
                if percent_int > last_emitted_percent || percent_int == 100 {
                    last_emitted_percent = percent_int;
                    let _ = app.emit(
                        "separation-download-progress",
                        SeparationDownloadProgress {
                            percentage,
                            status: "downloading".to_string(),
                        },
                    );
                }
            }
        }

        file.flush()
            .await
            .map_err(|e| format!("Failed to flush downloaded zip: {}", e))?;
        drop(file);

        // Extract ZIP
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
            let dylib_name = if cfg!(target_os = "macos") { "libonnxruntime.dylib" } else { "libonnxruntime.so" };
            let dylib_path = dir.join(dylib_name);
            if let Ok(meta) = fs::metadata(&dylib_path).await {
                let mut perms = meta.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(&dylib_path, perms).await;
            }
        }

        // Write metadata
        let model_info = ModelInfo {
            model_name: "htdemucs_ft".to_string(),
            version: "1.0.0".to_string(),
            checksum: "onnx-v1-sha256".to_string(),
            updated_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        let info_path = model_info_path(app)?;
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

    async fn separate(
        &self,
        app: &AppHandle,
        input_path: &Path,
        output_dir: &Path,
    ) -> Result<SeparationResult, String> {
        let dir = separation_dir_path(app)?;
        
        let dylib_name = if cfg!(target_os = "windows") {
            "onnxruntime.dll"
        } else if cfg!(target_os = "macos") {
            "libonnxruntime.dylib"
        } else {
            "libonnxruntime.so"
        };
        
        let dylib_path = dir.join(dylib_name);
        let model_path = dir.join("model.onnx");
        
        if !dylib_path.exists() || !model_path.exists() {
            return Err("Separation engine files missing. Please install it first.".to_string());
        }

        // 1. Programmatically load onnxruntime shared library dynamically
        println!("[separation] Loading ONNX Runtime dynamically from: {}", dylib_path.display());
        let _ = ort::init_from(&dylib_path);

        // 2. Create the ONNX Session with EPs: CUDA -> DirectML -> CPU
        println!("[separation] Creating ONNX session for model: {}", model_path.display());
        let mut session = Session::builder()
            .map_err(|e| format!("Failed to create SessionBuilder: {}", e))?
            .with_execution_providers([
                ort::ep::CUDA::default().build(),
                ort::ep::DirectML::default().build(),
            ])
            .map_err(|e| format!("Failed to set execution providers: {}", e))?
            .commit_from_file(model_path)
            .map_err(|e| format!("Failed to load model file: {}", e))?;

        // 3. Read the extracted stereo 44.1kHz audio wav
        println!("[separation] Reading input audio file: {}", input_path.display());
        let mut reader = hound::WavReader::open(input_path)
            .map_err(|e| format!("Failed to open WAV reader: {}", e))?;
        
        let spec = reader.spec();
        if spec.channels != 2 || spec.sample_rate != 44100 {
            return Err(format!(
                "Input WAV must be stereo 44100Hz, got {} channels and {}Hz",
                spec.channels, spec.sample_rate
            ));
        }

        // Read all samples and normalize to f32 [-1.0, 1.0]
        let raw_samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.unwrap_or(0) as f32 / 32768.0)
            .collect();
        drop(reader);

        let total_samples = raw_samples.len();
        let stereo_length = total_samples / 2;
        println!("[separation] Audio length: {} samples (~{:.2} seconds)", stereo_length, stereo_length as f32 / 44100.0);

        // Deinterleave stereo samples: Left channel and Right channel
        let mut left = Vec::with_capacity(stereo_length);
        let mut right = Vec::with_capacity(stereo_length);
        for chunk in raw_samples.chunks_exact(2) {
            left.push(chunk[0]);
            right.push(chunk[1]);
        }

        // Chunk parameters: Demucs ONNX expects [1, 2, 343980]
        let chunk_size = 343980;
        let hop_size = 171990; // 50% overlap

        // Stereo output buffers
        let mut vocals_l = vec![0.0f32; stereo_length];
        let mut vocals_r = vec![0.0f32; stereo_length];
        let mut inst_l = vec![0.0f32; stereo_length];
        let mut inst_r = vec![0.0f32; stereo_length];
        let mut weight_accum = vec![0.0f32; stereo_length];

        // Linear crossfade window
        let mut window = vec![1.0f32; chunk_size];
        for t in 0..hop_size {
            let fade = t as f32 / hop_size as f32;
            window[t] = fade;
            window[chunk_size - 1 - t] = fade;
        }

        let mut offset = 0;
        while offset < stereo_length {
            let mut chunk_left = vec![0.0f32; chunk_size];
            let mut chunk_right = vec![0.0f32; chunk_size];

            let copy_len = std::cmp::min(chunk_size, stereo_length - offset);
            chunk_left[..copy_len].copy_from_slice(&left[offset..(offset + copy_len)]);
            chunk_right[..copy_len].copy_from_slice(&right[offset..(offset + copy_len)]);

            // Combine into shape [1, 2, 343980]
            let mut input_data = Vec::with_capacity(2 * chunk_size);
            input_data.extend_from_slice(&chunk_left);
            input_data.extend_from_slice(&chunk_right);

            let input_tensor = ndarray::Array3::from_shape_vec([1, 2, chunk_size], input_data)
                .map_err(|e| format!("Failed to create input tensor: {}", e))?;

            let input_tensor_ort = Tensor::from_array(input_tensor)
                .map_err(|e| format!("Failed to convert input to ONNX tensor: {}", e))?;

            // Run ONNX inference
            let inputs = ort::inputs!["mix" => input_tensor_ort];
            
            let outputs = session.run(inputs)
                .map_err(|e| format!("Inference run failed: {}", e))?;

            // Output tensor is of shape [1, 4, 2, 343980]
            let stems_tensor = outputs["stems"]
                .try_extract_array::<f32>()
                .map_err(|e| format!("Failed to extract stems array: {}", e))?;

            let stems_view = stems_tensor.into_dimensionality::<ndarray::Dim<[usize; 4]>>()
                .map_err(|e| format!("Failed to cast stems to 4D view: {}", e))?;

            for t in 0..copy_len {
                let idx = offset + t;
                let w = window[t];

                // Vocals (stem index 3)
                vocals_l[idx] += stems_view[[0, 3, 0, t]] * w;
                vocals_r[idx] += stems_view[[0, 3, 1, t]] * w;

                // Instrumental (sum of stems 0, 1, 2)
                let il = stems_view[[0, 0, 0, t]] + stems_view[[0, 1, 0, t]] + stems_view[[0, 2, 0, t]];
                let ir = stems_view[[0, 0, 1, t]] + stems_view[[0, 1, 1, t]] + stems_view[[0, 2, 1, t]];

                inst_l[idx] += il * w;
                inst_r[idx] += ir * w;

                weight_accum[idx] += w;
            }

            offset += hop_size;
        }

        // Normalize by weight accumulator to prevent loudness scaling and boundary artifacts
        for idx in 0..stereo_length {
            let w = weight_accum[idx];
            if w > 1e-4 {
                vocals_l[idx] /= w;
                vocals_r[idx] /= w;
                inst_l[idx] /= w;
                inst_r[idx] /= w;
            }
        }

        // Write outputs as stereo 44100Hz WAV files
        let final_vocals = output_dir.join("vocals.wav");
        let final_instrumental = output_dir.join("instrumental.wav");

        let mut vocals_writer = hound::WavWriter::create(&final_vocals, spec)
            .map_err(|e| format!("Failed to create vocals WAV: {}", e))?;
        let mut inst_writer = hound::WavWriter::create(&final_instrumental, spec)
            .map_err(|e| format!("Failed to create instrumental WAV: {}", e))?;

        for idx in 0..stereo_length {
            // Write Left and then Right sample
            let vl = (vocals_l[idx] * 32768.0).clamp(-32768.0, 32767.0) as i16;
            let vr = (vocals_r[idx] * 32768.0).clamp(-32768.0, 32767.0) as i16;
            vocals_writer.write_sample(vl).map_err(|e| e.to_string())?;
            vocals_writer.write_sample(vr).map_err(|e| e.to_string())?;

            let il = (inst_l[idx] * 32768.0).clamp(-32768.0, 32767.0) as i16;
            let ir = (inst_r[idx] * 32768.0).clamp(-32768.0, 32767.0) as i16;
            inst_writer.write_sample(il).map_err(|e| e.to_string())?;
            inst_writer.write_sample(ir).map_err(|e| e.to_string())?;
        }

        vocals_writer.flush().map_err(|e| e.to_string())?;
        inst_writer.flush().map_err(|e| e.to_string())?;

        Ok(SeparationResult {
            vocals_path: final_vocals.to_str().unwrap().to_string(),
            instrumental_path: final_instrumental.to_str().unwrap().to_string(),
        })
    }
}

#[tauri::command]
pub async fn check_and_install_demucs_engine(app: AppHandle) -> Result<bool, String> {
    let engine = OnnxSeparationEngine;
    engine.install(&app).await
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

    // Step 1: Local FFmpeg Stereo 44.1kHz Audio Extraction
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
            "44100",
            "-ac",
            "2",
            extracted_audio_path.to_str().unwrap(),
        ])
        .status()
        .await
        .map_err(|e| format!("Local FFmpeg execution failed: {}", e))?;

    if !extract_status.success() {
        return Err("Local FFmpeg audio extraction failed".to_string());
    }

    // Step 2: Delegate separation to the OnnxSeparationEngine
    let engine = OnnxSeparationEngine;
    let result = engine.separate(&app, &extracted_audio_path, &temp_dir).await;

    let elapsed = start_time.elapsed().as_secs();
    println!("[separation] Completed local separation attempt in {}s", elapsed);
    
    result
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
                "-i", &video_path,
                "-i", &dubbed_path,
                "-filter_complex", &filter_complex_str,
                "-map", "[a]",
            ]);
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
