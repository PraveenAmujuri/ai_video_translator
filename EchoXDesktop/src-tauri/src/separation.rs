use std::path::{Path, PathBuf};
use std::time::Instant;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter, Manager};
use ort::session::Session;
use ort::value::TensorRef;

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
        
        println!("[engine] is_installed() checking dir: {}", dir.display());
        println!("[engine]   dylib  ({}) -> exists: {}", dylib_path.display(), dylib_path.exists());
        println!("[engine]   model  ({}) -> exists: {}", model_path.display(), model_path.exists());
        println!("[engine]   info   ({}) -> exists: {}", info_path.display(), info_path.exists());
        
        if dylib_path.exists() && model_path.exists() && info_path.exists() {
            if let Ok(data) = fs::read_to_string(&info_path).await {
                if let Ok(info) = serde_json::from_str::<ModelInfo>(&data) {
                    if info.version == "1.0.0" {
                        println!("[engine] is_installed() -> true (version match)");
                        return Ok(true);
                    } else {
                        println!("[engine] is_installed() -> false (version mismatch: got {})", info.version);
                    }
                } else {
                    println!("[engine] is_installed() -> false (model_info.json parse error)");
                }
            } else {
                println!("[engine] is_installed() -> false (cannot read model_info.json)");
            }
        } else {
            println!("[engine] is_installed() -> false (one or more required files missing)");
        }
        
        Ok(false)
    }

    async fn install(&self, app: &AppHandle) -> Result<bool, String> {
        if self.is_installed(app).await.unwrap_or(false) {
            println!("[engine] install() -> already installed, skipping.");
            return Ok(true);
        }

        let dir = separation_dir_path(app)?;
        println!("[engine] install() -> engine directory: {}", dir.display());
        fs::create_dir_all(&dir)
            .await
            .map_err(|e| format!("Failed to create separation directory: {}", e))?;

        let zip_path = dir.join("separation.zip");
        println!("[engine] install() -> ZIP will be saved to: {}", zip_path.display());

        // ── DOWNLOAD ────────────────────────────────────────────────────────────
        let _ = app.emit(
            "separation-download-progress",
            SeparationDownloadProgress {
                percentage: 0.0,
                status: "downloading".to_string(),
            },
        );

        println!("[engine] Downloading from: {}", ENGINE_ZIP_URL);
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
        println!("[engine] Download size: {} bytes", total_size);
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
        println!("[engine] Download complete: {} bytes written to {}", downloaded, zip_path.display());

        // ── EXTRACT ─────────────────────────────────────────────────────────────
        let _ = app.emit(
            "separation-download-progress",
            SeparationDownloadProgress {
                percentage: 100.0,
                status: "extracting".to_string(),
            },
        );
        println!("[engine] Extracting ZIP to: {}", dir.display());

        let extract_status = if cfg!(target_os = "windows") {
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

        if !extract_status.success() {
            let _ = fs::remove_file(&zip_path).await;
            return Err("Extraction command failed".to_string());
        }

        let _ = fs::remove_file(&zip_path).await;
        println!("[engine] Extraction complete. Scanning extracted contents in: {}", dir.display());

        // ── LOG WHAT WAS EXTRACTED ───────────────────────────────────────────────
        if let Ok(mut read_dir) = tokio::fs::read_dir(&dir).await {
            while let Ok(Some(entry)) = read_dir.next_entry().await {
                println!("[engine]   found: {}", entry.path().display());
            }
        }

        // ── FLATTEN NESTED FOLDER ────────────────────────────────────────────────
        // ZIP archives often contain a single top-level folder (e.g. "separation-engine-win/").
        // PowerShell Expand-Archive preserves that folder, so files land at:
        //   <dir>/<top-folder>/model.onnx
        // but the runtime expects them at:
        //   <dir>/model.onnx
        // We detect this case and move all contents up one level.
        println!("[engine] Checking for nested top-level folder to flatten...");
        let mut subdirs: Vec<PathBuf> = Vec::new();
        let mut root_files: Vec<PathBuf> = Vec::new();

        if let Ok(mut read_dir) = tokio::fs::read_dir(&dir).await {
            while let Ok(Some(entry)) = read_dir.next_entry().await {
                let path = entry.path();
                if path.is_dir() {
                    subdirs.push(path);
                } else {
                    root_files.push(path);
                }
            }
        }

        // If there is exactly one subdirectory and no files at the root, flatten it
        if subdirs.len() == 1 && root_files.is_empty() {
            let nested = &subdirs[0];
            println!("[engine] Single nested folder detected: {} — flattening into parent.", nested.display());

            let mut nested_entries = tokio::fs::read_dir(nested)
                .await
                .map_err(|e| format!("Cannot read nested dir {}: {}", nested.display(), e))?;

            while let Ok(Some(entry)) = nested_entries.next_entry().await {
                let src = entry.path();
                let dest = dir.join(entry.file_name());
                println!("[engine]   moving: {} -> {}", src.display(), dest.display());
                tokio::fs::rename(&src, &dest)
                    .await
                    .map_err(|e| format!("Failed to move {} to {}: {}", src.display(), dest.display(), e))?;
            }

            // Remove the now-empty nested directory
            let _ = tokio::fs::remove_dir(nested).await;
            println!("[engine] Flatten complete. Removed empty folder: {}", nested.display());
        } else {
            println!("[engine] No nested folder to flatten ({} subdirs, {} root files).", subdirs.len(), root_files.len());
        }

        // ── VERIFY ALL REQUIRED FILES ────────────────────────────────────────────
        let dylib_name = if cfg!(target_os = "windows") {
            "onnxruntime.dll"
        } else if cfg!(target_os = "macos") {
            "libonnxruntime.dylib"
        } else {
            "libonnxruntime.so"
        };

        let dylib_path = dir.join(dylib_name);
        let model_path = dir.join("model.onnx");

        println!("[engine] Post-extraction verification:");
        println!("[engine]   dylib  ({}) -> exists: {}", dylib_path.display(), dylib_path.exists());
        println!("[engine]   model  ({}) -> exists: {}", model_path.display(), model_path.exists());

        // Log the full contents of the engine directory now
        if let Ok(mut read_dir) = tokio::fs::read_dir(&dir).await {
            println!("[engine] Final engine directory contents:");
            while let Ok(Some(entry)) = read_dir.next_entry().await {
                let p = entry.path();
                let size = tokio::fs::metadata(&p).await.map(|m| m.len()).unwrap_or(0);
                println!("[engine]   {} ({} bytes)", p.display(), size);
            }
        }

        if !dylib_path.exists() || !model_path.exists() {
            return Err(format!(
                "Engine installation failed: required files missing after extraction. \
                 dylib={} (exists:{}), model={} (exists:{})",
                dylib_path.display(), dylib_path.exists(),
                model_path.display(), model_path.exists(),
            ));
        }

        // ── UNIX PERMISSIONS ─────────────────────────────────────────────────────
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = fs::metadata(&dylib_path).await {
                let mut perms = meta.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(&dylib_path, perms).await;
            }
        }

        // ── WRITE METADATA ───────────────────────────────────────────────────────
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
        println!("[engine] Writing model_info.json to: {}", info_path.display());
        if let Ok(info_str) = serde_json::to_string(&model_info) {
            fs::write(&info_path, info_str)
                .await
                .map_err(|e| format!("Failed to write model_info.json: {}", e))?;
        }

        println!("[engine] Installation complete and verified.");
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
        
        println!("[separation] separate() checking engine dir: {}", dir.display());
        println!("[separation]   dylib ({}) -> exists: {}", dylib_path.display(), dylib_path.exists());
        println!("[separation]   model ({}) -> exists: {}", model_path.display(), model_path.exists());
        
        if !dylib_path.exists() || !model_path.exists() {
            return Err(format!(
                "Separation engine files missing. \
                 dylib={} (exists:{}), model={} (exists:{}). \
                 Please reinstall the engine.",
                dylib_path.display(), dylib_path.exists(),
                model_path.display(), model_path.exists()
            ));
        }

        // 1. Programmatically load onnxruntime shared library dynamically
        println!("[ONNX] Starting ort::init_from() with path: {}", dylib_path.display());
        let init_start = Instant::now();
        let init_res = ort::init_from(&dylib_path);
        let init_elapsed = init_start.elapsed().as_millis();
        let init_res_str = match &init_res {
            Ok(_) => "Ok(EnvironmentBuilder)".to_string(),
            Err(e) => format!("Err({:?})", e),
        };
        println!("[ONNX] ort::init_from() completed in {} ms, result: {}", init_elapsed, init_res_str);
        if let Err(e) = init_res {
            println!("[ONNX] ort::init_from() error: {:?}", e);
            return Err(format!("ort::init_from error: {:?}", e));
        }

        // 2. Create the ONNX Session with EPs: CPU only
        println!("[ONNX] Creating SessionBuilder...");
        let builder_start = Instant::now();
        let session_builder = Session::builder();
        let builder_elapsed = builder_start.elapsed().as_millis();
        println!("[ONNX] SessionBuilder created in {} ms", builder_elapsed);
        
        let mut session_builder = session_builder
            .map_err(|e| {
                println!("[ONNX] SessionBuilder creation failed: {:?}", e);
                format!("Failed to create SessionBuilder: {:?}", e)
            })?;

        println!("[ONNX] Configuring execution provider: CPU...");
        let ep_start = Instant::now();
        let cpu_ep = ort::ep::CPU::default().build();
        session_builder = session_builder
            .with_execution_providers([cpu_ep])
            .map_err(|e| {
                println!("[ONNX] Failed to set execution provider (CPU): {:?}", e);
                format!("Failed to set execution provider (CPU): {:?}", e)
            })?
            .with_intra_threads(4)
            .map_err(|e| {
                println!("[ONNX] Failed to set intra threads limit: {:?}", e);
                format!("Failed to set intra threads limit: {:?}", e)
            })?;
        let ep_elapsed = ep_start.elapsed().as_millis();
        println!("[ONNX] Execution provider configured in {} ms", ep_elapsed);

        println!("[ONNX] Loading model and creating Session from file: {}", model_path.display());
        let session_start = Instant::now();
        let mut session = session_builder
            .commit_from_file(&model_path)
            .map_err(|e| {
                println!("[ONNX] Session creation failed: {:?}", e);
                format!("Failed to load model file: {:?}", e)
            })?;
        let session_elapsed = session_start.elapsed().as_millis();
        println!("[ONNX] Session created successfully in {} ms", session_elapsed);

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
        let hop_size = 257985; // 25% overlap (75% hop size)
        let overlap_size = 85995; // 25% of 343980

        // Stereo output buffers
        let mut vocals_l = vec![0.0f32; stereo_length];
        let mut vocals_r = vec![0.0f32; stereo_length];
        let mut inst_l = vec![0.0f32; stereo_length];
        let mut inst_r = vec![0.0f32; stereo_length];
        let mut weight_accum = vec![0.0f32; stereo_length];

        // Linear crossfade window for 25% overlap
        let mut window = vec![1.0f32; chunk_size];
        for t in 0..overlap_size {
            let fade = t as f32 / overlap_size as f32;
            window[t] = fade;
            window[chunk_size - 1 - t] = fade;
        }

        // Pre-allocated input array to avoid heap allocations in the loop
        let mut input_array = ndarray::Array3::<f32>::zeros([1, 2, chunk_size]);

        let mut offset = 0;
        while offset < stereo_length {
            let copy_len = std::cmp::min(chunk_size, stereo_length - offset);

            // Populate the pre-allocated array (with zero-padding for trailing chunk)
            {
                let mut slice = input_array.view_mut();
                if copy_len < chunk_size {
                    for t in 0..chunk_size {
                        if t < copy_len {
                            slice[[0, 0, t]] = left[offset + t];
                            slice[[0, 1, t]] = right[offset + t];
                        } else {
                            slice[[0, 0, t]] = 0.0;
                            slice[[0, 1, t]] = 0.0;
                        }
                    }
                } else {
                    for t in 0..chunk_size {
                        slice[[0, 0, t]] = left[offset + t];
                        slice[[0, 1, t]] = right[offset + t];
                    }
                }
            }

            // Create zero-copy tensor view from the pre-allocated array view
            let input_tensor_ort = TensorRef::from_array_view(input_array.view())
                .map_err(|e| format!("Failed to create zero-copy input tensor view: {}", e))?;

            // Run ONNX inference
            let inputs = ort::inputs!["mix" => input_tensor_ort];
            
            println!("[ONNX] Running inference on chunk at offset {}...", offset);
            let run_start = Instant::now();
            let outputs = session.run(inputs)
                .map_err(|e| {
                    println!("[ONNX] Inference run failed: {:?}", e);
                    format!("Inference run failed: {:?}", e)
                })?;
            let run_elapsed = run_start.elapsed().as_millis();
            println!("[ONNX] Inference chunk completed in {} ms", run_elapsed);

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

        let mut max_vocals = 0.0f32;
        let mut max_inst = 0.0f32;
        for idx in 0..stereo_length {
            max_vocals = max_vocals.max(vocals_l[idx].abs()).max(vocals_r[idx].abs());
            max_inst = max_inst.max(inst_l[idx].abs()).max(inst_r[idx].abs());
        }
        println!("[separation] Stems peak amplitude: Vocals={:.4}, Instrumental={:.4}", max_vocals, max_inst);

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
    embed_subtitles: bool,
    target_language: String,
) -> Result<String, String> {
    let start_time = Instant::now();
    let temp_dir = std::env::temp_dir()
        .join("EchoX")
        .join("jobs")
        .join(&job_id);
    let output_path = temp_dir.join(&output_name).to_str().unwrap().to_string();
    println!("[mixing] Starting local FFmpeg mastering & mixing for output: {}", output_path);
    println!("[mixing] Diagnostics:");
    println!("  Video path: '{}' (exists: {})", video_path, Path::new(&video_path).exists());
    println!("  Dubbed path: '{}' (exists: {})", dubbed_path, Path::new(&dubbed_path).exists());
    println!("  Instrumental path: '{}' (exists: {})", instrumental_path, Path::new(&instrumental_path).exists());

    // Self-healing: if the frontend sends paths pointing to an older job directory due to state caching,
    // we resolve them to the current job directory if the files exist there.
    let mut resolved_instrumental_path = instrumental_path.clone();
    let local_inst = temp_dir.join("instrumental.wav");
    if local_inst.exists() {
        println!("[mixing] Self-healing: Overriding instrumental path from old job to current: {}", local_inst.display());
        resolved_instrumental_path = local_inst.to_str().unwrap().to_string();
    }

    let mut resolved_dubbed_path = dubbed_path.clone();
    let local_dubbed = temp_dir.join("dubbed_audio.wav");
    if local_dubbed.exists() {
        println!("[mixing] Self-healing: Overriding dubbed path from old job to current: {}", local_dubbed.display());
        resolved_dubbed_path = local_dubbed.to_str().unwrap().to_string();
    }

    // Subtitle validation
    let srt_path = temp_dir.join("subtitles.srt");
    let has_srt = srt_path.exists();
    let lang_meta = format!("language={}", target_language);
    let title_meta = format!("title={} Subtitles", target_language.to_uppercase());

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

    let hq_filter_complex_val = if is_audio {
        format!(
            "[0:a]volume={:.4}[bg];[bg]loudnorm=I=-16:TP=-1.5:LRA=11[inst_norm];[1:a]compand=attacks=0.01:decays=0.1:points=-900/-900|-20/-12|0/-3[dub_compressed];[inst_norm][dub_compressed]amix=inputs=2:duration=longest:dropout_transition=2[mixed];[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[a]",
            volume
        )
    } else {
        format!(
            "[2:a]volume={:.4}[bg];[bg]loudnorm=I=-16:TP=-1.5:LRA=11[inst_norm];[1:a]compand=attacks=0.01:decays=0.1:points=-900/-900|-20/-12|0/-3[dub_compressed];[inst_norm][dub_compressed]amix=inputs=2:duration=longest:dropout_transition=2[mixed];[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[a]",
            volume
        )
    };

    if resolved_instrumental_path.is_empty() || !Path::new(&resolved_instrumental_path).exists() {
        // Simple mixing fallback
        if is_audio {
            args.extend([
                "-i", &video_path,
                "-i", &resolved_dubbed_path,
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
                "-i", &resolved_dubbed_path,
            ]);
            if embed_subtitles && has_srt {
                args.extend(["-i", srt_path.to_str().unwrap()]);
            }
            args.extend([
                "-filter_complex", &filter_complex_str,
                "-map", "0:v:0",
                "-map", "[a]",
            ]);
            if embed_subtitles && has_srt {
                args.extend([
                    "-map", "2:s:0",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-c:s", "mov_text",
                    "-metadata:s:s:0", &lang_meta,
                    "-metadata:s:s:0", &title_meta,
                ]);
            } else {
                args.extend([
                    "-c:v", "copy",
                    "-c:a", "aac",
                ]);
            }
            args.extend([
                "-b:a", "192k",
                "-shortest",
            ]);
        }
    } else {
        // High-Quality AI Preserved Mastering Pipeline
        if is_audio {
            args.extend([
                "-i", &resolved_instrumental_path,
                "-i", &resolved_dubbed_path,
                "-filter_complex", &hq_filter_complex_val,
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
                "-i", &resolved_dubbed_path,
                "-i", &resolved_instrumental_path,
            ]);
            if embed_subtitles && has_srt {
                args.extend(["-i", srt_path.to_str().unwrap()]);
            }
            args.extend([
                "-filter_complex", &hq_filter_complex_val,
                "-map", "0:v:0",
                "-map", "[a]",
            ]);
            if embed_subtitles && has_srt {
                args.extend([
                    "-map", "3:s:0",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-c:s", "mov_text",
                    "-metadata:s:s:0", &lang_meta,
                    "-metadata:s:s:0", &title_meta,
                ]);
            } else {
                args.extend([
                    "-c:v", "copy",
                    "-c:a", "aac",
                ]);
            }
            args.extend([
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
pub async fn download_job_subtitles(
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

    let dest_path = temp_dir.join("subtitles.srt");

    let download_url = format!("https://api.praveenai.tech/outputs/{}/subtitles.srt", job_id);
    let client = reqwest::Client::new();
    let response = client.get(&download_url).send().await
        .map_err(|e| format!("Failed to connect to backend: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Backend returned status {}", response.status()));
    }

    let mut file = fs::File::create(&dest_path)
        .await
        .map_err(|e| format!("Failed to create local subtitle file: {}", e))?;

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
pub async fn get_job_vtt_data(
    _app: AppHandle,
    job_id: String,
) -> Result<String, String> {
    let download_url = format!("https://api.praveenai.tech/outputs/{}/subtitles.vtt", job_id);
    let client = reqwest::Client::new();
    let response = client.get(&download_url).send().await
        .map_err(|e| format!("Failed to connect to backend: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Backend returned status {}", response.status()));
    }

    let text = response.text().await
        .map_err(|e| format!("Failed to read VTT text: {}", e))?;

    Ok(text)
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
