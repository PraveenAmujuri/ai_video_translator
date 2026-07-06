import { invoke } from "@tauri-apps/api/core";
import type { TranslationPipelineParams } from "../types";

export async function tauriDownloadVideo(url: string): Promise<string> {
  return invoke<string>("download_video", { url });
}

export async function tauriProcessTranslationPipeline(
  params: TranslationPipelineParams
): Promise<string> {
  return invoke<string>("process_translation_pipeline", { params });
}

export async function tauriSaveTranslatedVideo(jobId: string): Promise<string> {
  return invoke<string>("save_translated_video", { jobId });
}

export async function tauriUpdateExtractorEngine(): Promise<string> {
  return invoke<string>("update_extractor_engine");
}

export async function tauriCheckAndInstallDemucsEngine(): Promise<boolean> {
  return invoke<boolean>("check_and_install_demucs_engine");
}

export async function tauriRunLocalAudioSeparation(
  inputPath: string,
  jobId: string
): Promise<{ vocals_path: string; instrumental_path: string }> {
  return invoke<{ vocals_path: string; instrumental_path: string }>(
    "run_local_audio_separation",
    { inputPath, jobId }
  );
}

export async function tauriRunLocalAudioMixing(
  jobId: string,
  videoPath: string,
  instrumental_path: String,
  dubbed_path: String,
  output_name: String,
  volume: number
): Promise<string> {
  return invoke<string>("run_local_audio_mixing", {
    jobId,
    videoPath,
    instrumentalPath: instrumental_path,
    dubbedPath: dubbed_path,
    outputName: output_name,
    volume,
  });
}

export async function tauriDownloadDubbedVoice(jobId: string): Promise<string> {
  return invoke<string>("download_dubbed_voice", { jobId });
}

export async function tauriCleanupLocalJobFiles(jobId: string): Promise<void> {
  return invoke<void>("cleanup_local_job_files", { jobId });
}
