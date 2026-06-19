use futures_util::StreamExt;
use regex::Regex;
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio_util::codec::{BytesCodec, FramedRead};

const BACKEND_URL: &str = "http://127.0.0.1:8000";
const MAX_FILE_BYTES: u64 = 200 * 1024 * 1024;

#[derive(Debug, Serialize, Clone)]
struct DownloadProgress {
    percentage: f32,
    speed: String,
    eta: String,
}

#[derive(Debug, Deserialize)]
struct TranslateStreamResponse {
    job_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct TranslationPipelineParams {
    file_path: String,
    target_language: String,
    voice: String,
    source_language: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct SaveProgress {
    percentage: f32,
    downloaded_bytes: u64,
    total_bytes: u64,
}

#[tauri::command]
async fn download_video(app: tauri::AppHandle, url: String) -> Result<String, String> {
    let tmp_dir = std::env::temp_dir();
    let job_id = uuid::Uuid::new_v4().to_string();
    let output_path: PathBuf = tmp_dir.join(format!("echox_{}.mp4", job_id));
    let output_path_str = output_path
        .to_str()
        .ok_or_else(|| "Failed to build temp output path".to_string())?
        .to_string();

    let progress_re = Regex::new(
        r"\[download\]\s+(?P<pct>[0-9]+(?:\.[0-9]+)?)%\s+of\s+[^\s]+\s+at\s+(?P<speed>[^\s]+)\s+ETA\s+(?P<eta>[^\s]+)",
    )
    .map_err(|e| e.to_string())?;

    let sidecar_cmd = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args([
            "--no-playlist",
            "--format",
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format",
            "mp4",
            "--newline",
            "--output",
            &output_path_str,
            &url,
        ]);

    let (mut rx, _child) = sidecar_cmd.spawn().map_err(|e| e.to_string())?;

    while let Some(event) = rx.recv().await {
        use tauri_plugin_shell::process::CommandEvent;
        match event {
            CommandEvent::Stdout(line_bytes) | CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                if let Some(caps) = progress_re.captures(&line) {
                    let percentage = caps
                        .name("pct")
                        .and_then(|m| m.as_str().parse::<f32>().ok())
                        .unwrap_or(0.0);
                    let speed = caps
                        .name("speed")
                        .map(|m| m.as_str().to_string())
                        .unwrap_or_default();
                    let eta = caps
                        .name("eta")
                        .map(|m| m.as_str().to_string())
                        .unwrap_or_default();
                    let _ = app.emit("download-progress", DownloadProgress { percentage, speed, eta });
                }
            }
            CommandEvent::Error(err) => {
                return Err(format!("yt-dlp process error: {}", err));
            }
            CommandEvent::Terminated(status) => {
                let code = status.code.unwrap_or(-1);
                if code != 0 {
                    return Err(format!("yt-dlp exited with code {}", code));
                }
                break;
            }
            _ => {}
        }
    }

    if !output_path.exists() {
        return Err(format!(
            "yt-dlp did not produce output at: {}",
            output_path_str
        ));
    }

    Ok(output_path_str)
}

#[tauri::command]
async fn process_translation_pipeline(
    params: TranslationPipelineParams,
) -> Result<String, String> {
    let path = PathBuf::from(&params.file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", params.file_path));
    }

    let metadata = fs::metadata(&path)
        .await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    if metadata.len() > MAX_FILE_BYTES {
        return Err(format!(
            "File exceeds 200MB limit ({:.1} MB)",
            metadata.len() as f64 / 1024.0 / 1024.0
        ));
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("upload.mp4")
        .to_string();

    let file = fs::File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let stream = FramedRead::new(file, BytesCodec::new());
    let file_body = reqwest::Body::wrap_stream(stream);

    let file_part = multipart::Part::stream_with_length(file_body, metadata.len())
        .file_name(file_name)
        .mime_str("video/mp4")
        .map_err(|e| format!("Failed to set MIME type: {}", e))?;

    let mut form = multipart::Form::new().part("file", file_part);

    form = form
        .text("target_language", params.target_language)
        .text("voice", params.voice);

    if let Some(src_lang) = params.source_language {
        form = form.text("source_language", src_lang);
    }

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/translate-stream", BACKEND_URL))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Backend error {}: {}", status, body));
    }

    let parsed: TranslateStreamResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse backend response: {}", e))?;

    Ok(parsed.job_id)
}

#[tauri::command]
async fn save_translated_video(
    app: tauri::AppHandle,
    job_id: String,
) -> Result<String, String> {
    let dest_path = app
        .dialog()
        .file()
        .set_file_name("translated_video.mp4")
        .add_filter("MP4 Video", &["mp4"])
        .blocking_save_file();

    let dest_path = match dest_path {
        Some(p) => p,
        None => return Err("Save cancelled by user".to_string()),
    };

    let dest_path_buf = dest_path
        .into_path()
        .map_err(|e| format!("Invalid save path: {}", e))?;

    if let Some(parent) = dest_path_buf.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let download_url = format!("{}/outputs/{}/output.mp4", BACKEND_URL, job_id);

    let client = reqwest::Client::new();
    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to backend: {}", e))?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Backend error {}: {}", status, body));
    }

    let total_bytes = response.content_length().unwrap_or(0);

    let mut file = fs::File::create(&dest_path_buf)
        .await
        .map_err(|e| format!("Failed to create destination file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded_bytes: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream read error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;
        downloaded_bytes += chunk.len() as u64;

        let percentage = if total_bytes > 0 {
            (downloaded_bytes as f32 / total_bytes as f32) * 100.0
        } else {
            0.0
        };

        let _ = app.emit(
            "save-progress",
            SaveProgress {
                percentage,
                downloaded_bytes,
                total_bytes,
            },
        );
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush file: {}", e))?;

    let saved_path = dest_path_buf
        .to_str()
        .ok_or_else(|| "Saved path is not valid UTF-8".to_string())?
        .to_string();

    Ok(saved_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            download_video,
            process_translation_pipeline,
            save_translated_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
