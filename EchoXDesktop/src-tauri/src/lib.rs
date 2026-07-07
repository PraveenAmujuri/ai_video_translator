use futures_util::StreamExt;
use regex::Regex;
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio_util::codec::{BytesCodec, FramedRead};

mod separation;
use separation::{check_and_install_demucs_engine, run_local_audio_separation, run_local_audio_mixing, download_dubbed_voice, download_job_subtitles, cleanup_local_job_files};

const BACKEND_URL: &str = "https://api.praveenai.tech";
const MAX_FILE_BYTES: u64 = 200 * 1024 * 1024;
const YTDLP_GITHUB_API: &str =
    "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";
const UPDATE_INTERVAL_SECS: u64 = 24 * 3600; // 24 hours

// ── Pipeline types ────────────────────────────────────────────────────────────

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

// ── Engine management types ───────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct VersionCache {
    version: String,
    checked_at: u64,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

// ── Path helpers ──────────────────────────────────────────────────────────────

fn managed_ytdlp_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {}", e))?;
    let exe = if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };
    Ok(app_data.join("echox").join(exe))
}

fn version_cache_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {}", e))?;
    Ok(app_data.join("echox").join("yt_dlp_version.json"))
}

fn github_asset_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else if cfg!(target_os = "macos") {
        "yt-dlp_macos"
    } else {
        "yt-dlp_linux"
    }
}

fn unix_now() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| format!("System time error: {}", e))
}

// ── HTTP client ───────────────────────────────────────────────────────────────

fn build_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))
}

// ── GitHub API ────────────────────────────────────────────────────────────────

async fn fetch_latest_release(client: &reqwest::Client) -> Result<GithubRelease, String> {
    client
        .get(YTDLP_GITHUB_API)
        .header("User-Agent", "EchoX-Desktop/0.1.0")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("GitHub API unreachable: {}", e))?
        .error_for_status()
        .map_err(|e| format!("GitHub API error: {}", e))?
        .json::<GithubRelease>()
        .await
        .map_err(|e| format!("GitHub API parse error: {}", e))
}

// ── Download and atomic install ───────────────────────────────────────────────

async fn download_and_install(
    client: &reqwest::Client,
    release: &GithubRelease,
    managed: &PathBuf,
) -> Result<(), String> {
    let asset_name = github_asset_name();
    let asset = release
        .assets
        .iter()
        .find(|a| a.name == asset_name)
        .ok_or_else(|| {
            format!(
                "{} not found in GitHub release {}",
                asset_name, release.tag_name
            )
        })?;

    // Temp file lives in the same directory so rename is atomic (same filesystem).
    let tmp_file_name = {
        let mut n = managed
            .file_name()
            .ok_or_else(|| "Invalid managed yt-dlp path".to_string())?
            .to_os_string();
        n.push(".tmp");
        n
    };
    let tmp_path = managed.with_file_name(tmp_file_name);

    let response = client
        .get(&asset.browser_download_url)
        .header("User-Agent", "EchoX-Desktop/0.1.0")
        .send()
        .await
        .map_err(|e| format!("Asset download failed: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Asset HTTP error: {}", e))?;

    let mut tmp_file = fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    let mut written: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| {
            let _ = std::fs::remove_file(&tmp_path);
            format!("Download stream error: {}", e)
        })?;
        tmp_file.write_all(&chunk).await.map_err(|e| {
            let _ = std::fs::remove_file(&tmp_path);
            format!("File write error: {}", e)
        })?;
        written += chunk.len() as u64;
    }

    tmp_file.flush().await.map_err(|e| {
        let _ = std::fs::remove_file(&tmp_path);
        format!("File flush error: {}", e)
    })?;
    drop(tmp_file);

    if written == 0 {
        let _ = fs::remove_file(&tmp_path).await;
        return Err("Downloaded binary is empty — aborting install".to_string());
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let meta = fs::metadata(&tmp_path)
            .await
            .map_err(|e| format!("Failed to read temp file permissions: {}", e))?;
        let mut perms = meta.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&tmp_path, perms)
            .await
            .map_err(|e| format!("Failed to set executable permissions: {}", e))?;
    }

    // Atomic replace: same-directory rename so partial writes never become visible.
    fs::rename(&tmp_path, managed).await.map_err(|e| {
        let _ = std::fs::remove_file(&tmp_path);
        format!("Atomic replace failed: {}", e)
    })?;

    Ok(())
}

// ── Version cache ─────────────────────────────────────────────────────────────

async fn write_version_cache(cache_path: &PathBuf, cache: &VersionCache) -> Result<(), String> {
    if let Some(dir) = cache_path.parent() {
        fs::create_dir_all(dir)
            .await
            .map_err(|e| format!("Cache dir creation failed: {}", e))?;
    }
    let bytes =
        serde_json::to_vec(cache).map_err(|e| format!("Cache serialize error: {}", e))?;
    fs::write(cache_path, bytes)
        .await
        .map_err(|e| format!("Cache write error: {}", e))?;
    Ok(())
}

async fn read_version_cache(cache_path: &PathBuf) -> Option<VersionCache> {
    let bytes = fs::read(cache_path).await.ok()?;
    serde_json::from_slice(&bytes).ok()
}

// ── Engine lifecycle command ──────────────────────────────────────────────────
//
// Scenarios handled:
//   A. Binary missing, network available  → fresh install from GitHub
//   B. Binary missing, network offline    → return Err (app still starts)
//   C. Binary exists, within 24h window   → return Ok (no network call)
//   D. Binary exists, window elapsed, offline → return Ok (offline mode)
//   E. Binary exists, window elapsed, newer version → download & replace
//   F. Binary exists, window elapsed, already current → refresh timestamp

#[tauri::command]
async fn update_extractor_engine(app: tauri::AppHandle) -> Result<String, String> {
    let managed = managed_ytdlp_path(&app)?;
    let cache_path = version_cache_path(&app)?;
    let now = unix_now()?;

    // Ensure the managed directory exists.
    if let Some(dir) = managed.parent() {
        fs::create_dir_all(dir)
            .await
            .map_err(|e| format!("Cannot create managed directory: {}", e))?;
    }

    let client = build_http_client()?;

    // ── Scenario A / B: first installation ───────────────────────────────────
    if !managed.exists() {
        let release = fetch_latest_release(&client).await.map_err(|e| {
            format!("Extractor unavailable — {}", e)
        })?;

        let version = release.tag_name.trim_start_matches('v').to_string();
        download_and_install(&client, &release, &managed).await?;

        let cache = VersionCache {
            version: version.clone(),
            checked_at: now,
        };
        let _ = write_version_cache(&cache_path, &cache).await;

        return Ok(format!("Installed yt-dlp v{}", version));
    }

    // ── Scenario C: binary exists and last check is recent ───────────────────
    if let Some(cache) = read_version_cache(&cache_path).await {
        if now.saturating_sub(cache.checked_at) < UPDATE_INTERVAL_SECS {
            return Ok("Signatures verified".to_string());
        }
    }

    // ── 24-hour window elapsed: try to reach GitHub ───────────────────────────
    let release = match fetch_latest_release(&client).await {
        Err(_) => {
            // Scenario D: offline but binary present — continue normally.
            return Ok("Offline mode — using existing extractor".to_string());
        }
        Ok(r) => r,
    };

    let latest_version = release.tag_name.trim_start_matches('v').to_string();

    // ── Scenario F: already on latest version ─────────────────────────────────
    if let Some(cache) = read_version_cache(&cache_path).await {
        if cache.version == latest_version {
            let refreshed = VersionCache {
                version: latest_version,
                checked_at: now,
            };
            let _ = write_version_cache(&cache_path, &refreshed).await;
            return Ok("Signatures verified".to_string());
        }
    }

    // ── Scenario E: newer version available ───────────────────────────────────
    download_and_install(&client, &release, &managed).await?;

    let new_cache = VersionCache {
        version: latest_version,
        checked_at: now,
    };
    write_version_cache(&cache_path, &new_cache)
        .await
        .map_err(|e| format!("Version cache write failed: {}", e))?;

    Ok("Updated to latest extractor engine".to_string())
}

// ── Download command (managed binary only) ────────────────────────────────────

#[tauri::command]
async fn download_video(app: tauri::AppHandle, url: String) -> Result<String, String> {
    let exe_path = managed_ytdlp_path(&app)?;

    if !exe_path.exists() {
        return Err(
            "yt-dlp is not installed. Restart EchoX while online to install the extractor engine."
                .to_string(),
        );
    }

    let tmp_dir = std::env::temp_dir();
    let job_id = uuid::Uuid::new_v4().to_string();
    let output_path = tmp_dir.join(format!("echox_{}.mp4", job_id));
    let output_path_str = output_path
        .to_str()
        .ok_or_else(|| "Failed to build temp output path".to_string())?
        .to_string();

    let progress_re = Regex::new(
        r"\[download\]\s+(?P<pct>[0-9]+(?:\.[0-9]+)?)%\s+of\s+[^\s]+\s+at\s+(?P<speed>[^\s]+)\s+ETA\s+(?P<eta>[^\s]+)",
    )
    .map_err(|e| e.to_string())?;

    let mut child = tokio::process::Command::new(&exe_path)
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
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture yt-dlp stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture yt-dlp stderr".to_string())?;

    // Merge stdout and stderr into a single line channel.
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    let tx_out = tx.clone();
    let stdout_task = tokio::spawn(async move {
        use tokio::io::{AsyncBufReadExt, BufReader};
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = tx_out.send(line);
        }
    });

    let tx_err = tx.clone();
    let stderr_task = tokio::spawn(async move {
        use tokio::io::{AsyncBufReadExt, BufReader};
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = tx_err.send(line);
        }
    });

    drop(tx); // channel closes once both reader tasks finish

    while let Some(line) = rx.recv().await {
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

    let _ = tokio::join!(stdout_task, stderr_task);

    let status = child
        .wait()
        .await
        .map_err(|e| format!("yt-dlp wait error: {}", e))?;

    if !status.success() {
        return Err(format!(
            "yt-dlp exited with code {}",
            status.code().unwrap_or(-1)
        ));
    }

    if !output_path.exists() {
        return Err(format!(
            "yt-dlp did not produce output at: {}",
            output_path_str
        ));
    }

    Ok(output_path_str)
}

// ── Upload and translate command ──────────────────────────────────────────────

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
            "File exceeds 200 MB limit ({:.1} MB)",
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

// ── Save output command ───────────────────────────────────────────────────────

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

    let ext = dest_path_buf
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4")
        .to_lowercase();
    let temp_dir = std::env::temp_dir()
        .join("EchoX")
        .join("jobs")
        .join(&job_id);
    let local_output_path = temp_dir.join(format!("local_output.{}", ext));

    if local_output_path.exists() {
        fs::copy(&local_output_path, &dest_path_buf)
            .await
            .map_err(|e| format!("Failed to copy local mastered output: {}", e))?;
        
        let saved_path = dest_path_buf
            .to_str()
            .ok_or_else(|| "Saved path is not valid UTF-8".to_string())?
            .to_string();
        return Ok(saved_path);
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

// ── Tauri entry point ─────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            download_video,
            process_translation_pipeline,
            save_translated_video,
            update_extractor_engine,
            check_and_install_demucs_engine,
            run_local_audio_separation,
            run_local_audio_mixing,
            download_dubbed_voice,
            download_job_subtitles,
            cleanup_local_job_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
