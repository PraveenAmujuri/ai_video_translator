# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: EchoX Desktop Integration Guide

This guide details the backend architecture, API contracts, and native system integration specs for the EchoX Desktop application (Tauri 2.0 + React/TS). Use this to implement the desktop client.

---

## 0. Current Repository State & Commands

The repo is currently a **stock Tauri 2.0 + React 19 + TypeScript + Vite scaffold** (default `greet` command in `src-tauri/src/lib.rs`, default `App.tsx`, only `core:default` and `opener:default` capabilities). The architecture, API contracts, and Tauri commands described below are the **target spec to implement**, not what is already wired up. Treat new work as building this out from the scaffold.

The FastAPI backend lives outside this directory (separate repo/process) and is expected to be running at `http://127.0.0.1:8000`.

### Development commands
- `npm run tauri dev` — full desktop app (Vite dev server + Rust build + Tauri window). Use this, not `npm run dev` alone, for testing native integration.
- `npm run dev` — Vite-only frontend on port 1420 (no Tauri APIs available; React-only iteration).
- `npm run build` — `tsc` typecheck + Vite production build to `dist/`.
- `npm run tauri build` — bundled desktop binary (installer/exe).
- Rust-only check: `cd src-tauri && cargo check` (faster than full Tauri build when iterating on Rust commands).

### Sidecar requirement
The `yt-dlp` binary must be placed at `src-tauri/binaries/yt-dlp-<target-triple>` (e.g. `yt-dlp-x86_64-pc-windows-msvc.exe`) and registered in `tauri.conf.json` under `bundle.externalBin`. It is **not** currently in the repo — provisioning it is part of implementing the download pipeline.

---

## 1. System Architecture & Key Goals
- **Client**: Standalone Tauri 2.0 desktop application (React, TypeScript, Rust).
- **Backend**: FastAPI reverse proxy (running locally at `http://127.0.0.1:8000`).
- **RAM & Battery Efficiency**:
  - Offload heavy media processing, YouTube downloads, multipart file uploads, and output saving to the Tauri Rust layer.
  - React should not hold large binary file buffers in memory. Instead, pass absolute file paths to Rust.
  - Rely on hardware-accelerated CSS properties (`transform: scale3d`, `opacity`) for all active UI micro-interactions and progress tracking. Do not use JavaScript rendering loops.

---

## 2. EchoX Backend API Contracts

### Unified Media Upload & Translation
- **Route**: `POST /translate-stream`
- **Content-Type**: `multipart/form-data`
- **Max Upload Size**: 200MB (Enforce client-side check).
- **Payload Fields**:
  - `file` (File Binary, Required): The raw video file (e.g. `.mp4`, `.mov`, `.webm`).
  - `youtube_url` (String, Optional): Omitted or passed as null for local uploads.
  - `target_language` (String, Required): Target language code (e.g., `"hi"`, `"te"`, `"en"`).
  - `voice` (String, Required): Voice identifier code (e.g., `"hi-IN-rohan"`, `"te-IN-maya-medium"`).
  - `source_language` (String, Optional): Defaults to `"auto"`.
  - `preserve_background_audio` (String, Optional): `"true"` or `"false"` (default: `"false"`).
  - `background_audio_volume` (String, Optional): `"0.0"` to `"1.0"` (default: `"0.3"`).

### Progress & Completion Polling
- **Route**: `GET /progress/{job_id}`
- **Polling Interval**: Poll every 2 seconds when a job is active.
- **Sample Completed Response**:
  ```json
  {
    "job_id": "25aad5c9-ce9a-4ab2-a3a9-0951906ae761",
    "status": "completed",
    "progress": 100,
    "message": "Dub complete!",
    "error": null,
    "source_language": "en",
    "target_language": "hi",
    "stream_url": null,
    "subtitle_url": "/subtitles/25aad5c9-ce9a-4ab2-a3a9-0951906ae761"
  }
  ```

### Completed Media Retrieve
- **Outputs route**: Once status is `"completed"`, retrieve output streams from the server:
- **Video Path**: `http://127.0.0.1:8000/outputs/{job_id}/output.mp4`

---

## 3. Tauri 2.0 Configuration Specs

### Sidecar Configuration (`tauri.conf.json`)
- Configure `bundle -> externalBin` to register the local `"binaries/yt-dlp"` sidecar binary.
- Ensure the CSP allows media and request streaming to and from localhost/127.0.0.1 on port 8000.

### Native Permissions (`src-tauri/capabilities/default.json`)
Declare the following permissions:
- `core:default`
- `shell:default`
- `shell:allow-execute`
- `dialog:default`
- `dialog:allow-save`
- `dialog:allow-open`
- `shell:allow-sidecar` with target `"binaries/yt-dlp"`

---

## 4. Frontend Design Guidelines

Design a premium desktop application experience.

- Aesthetic: Modern desktop software with strong typography, clear hierarchy, refined spacing, and rich interaction feedback.
- Color System: Dark-first interface with a restrained accent color system. Accent colors may be used for progress, active states, focus states, status indicators, and processing pipelines.
- Layout: Desktop-first, information-dense, productivity-focused workflows.
- Visual Style: Precise, professional, highly polished, and intentionally crafted. Avoid generic AI SaaS dashboards.
- Alive Details: Utilize hardware-accelerated CSS animations for focus borders, layout shifts, pulsing active states, progress transitions, and contextual feedback. Avoid infinite JS loops.
- HUD Monitor: Include a terminal/status monitor showing real-time logs and progress updates.

---

## 5. Tauri Command Specifications (For Claude)

### A. Download & Progress Command (`download_video`)
- Spawns the `"yt-dlp"` sidecar to download YouTube URLs to a local temporary path.
- Parses `stdout` line-by-line using Regex (e.g., matching percentage, speed, ETA) and streams progress updates to the frontend using `app.emit("download-progress", progress_payload)`.

### B. Process & Upload Command (`process_translation_pipeline`)
- Integrates local files (or files downloaded via `yt-dlp`) and streams the binary payload directly to the `/translate-stream` FastAPI endpoint using a multipart form. Enforce the 200MB size limit.
- Returns the `job_id` to React to begin progress polling.

### C. Download Output Command (`save_translated_video`)
- Integrates with Tauri's native save dialog to select the destination file path.
- Streams the final `.mp4` from `/outputs/{job_id}/output.mp4` directly to the selected destination path.

## Code Quality Requirements

- Production-grade code only.
- No placeholders, mocks, TODO comments, or pseudo-code.
- Strong TypeScript typing.
- Avoid `any`.
- Use async/await consistently.
- Handle all error states.
- Prefer composition over monolithic components.
## Tauri Architecture

Rules:
- Heavy processing belongs in Rust.
- React should never hold video buffers in state.
- File paths are passed to Rust commands.
- Rust handles filesystem access.
- Rust handles downloads and uploads.
## UI Constraints

Avoid:
- Glassmorphism
- Neumorphism
- Gradient-heavy interfaces
- Generic SaaS dashboard layouts

Prefer:
- Premium desktop software aesthetics
- Strong information hierarchy
- Structural grid systems
- Sharp borders
- Intentional whitespace
- Refined accent color usage

## Performance Constraints

- No polling below 2 seconds.
- No setInterval animation loops.
- No requestAnimationFrame loops unless explicitly required.
- CSS animations must use:
  - transform
  - opacity
  - translate3d

Avoid:
  - top
  - left
  - width
  - height
  animations.

  ## Forbidden Patterns

- Do not generate placeholder data.
- Do not use mock APIs.
- Do not use fake progress bars.
- Do not generate incomplete file stubs.
- Do not simplify architecture for tutorial purposes.
- Do not omit imports.
- Do not omit types.
- Do not omit error handling.

## Repository Rules

- Always update existing files when appropriate.
- Do not create duplicate implementations.
- Before generating code, inspect the current repository structure.
- Follow existing naming conventions.
- Prefer extending architecture over replacing architecture.

## CRITICAL EXCLUSION RULES:

- DO NOT write any introductory or concluding text.
- DO NOT explain how the code works, why you chose a library, or how to install dependencies.
- DO NOT provide architectural overviews, design essays, or commentary.
- OUTPUT ONLY the raw, complete code blocks inside their respective markdown file paths. 
- If a file is requested, start immediately with the code block. Zero conversational filler.