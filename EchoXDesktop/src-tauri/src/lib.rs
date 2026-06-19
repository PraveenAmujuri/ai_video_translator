use regex::Regex;
use serde::Serialize;
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Clone)]
pub struct DownloadProgress {
    pub percentage: f32,
    pub speed: String,
    pub eta: String,
}

#[tauri::command]
pub async fn download_video(app: tauri::AppHandle, url: String) -> Result<String, String> {
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
            CommandEvent::Stdout(line_bytes) => {
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

                    let _ = app.emit(
                        "download-progress",
                        DownloadProgress {
                            percentage,
                            speed,
                            eta,
                        },
                    );
                }
            }
            CommandEvent::Stderr(line_bytes) => {
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

                    let _ = app.emit(
                        "download-progress",
                        DownloadProgress {
                            percentage,
                            speed,
                            eta,
                        },
                    );
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![download_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
