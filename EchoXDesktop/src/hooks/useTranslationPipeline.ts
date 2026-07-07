import { useState, useCallback, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { pollJobProgress, resolveStreamEndpoints } from "../services/api";
import {
  tauriDownloadVideo,
  tauriProcessTranslationPipeline,
  tauriSaveTranslatedVideo,
  tauriCheckAndInstallDemucsEngine,
  tauriRunLocalAudioSeparation,
  tauriRunLocalAudioMixing,
  tauriDownloadDubbedVoice,
  tauriDownloadJobSubtitles,
  tauriCleanupLocalJobFiles,
} from "../lib/tauri-commands";
import type {
  PipelineState,
  TranslationOptions,
  DownloadProgressEvent,
  TranslationJobProgress,
  StreamEndpointsResponse,
  LogEntry,
} from "../types";

interface PipelineActions {
  startFromLocalFile: (filePath: string, options: TranslationOptions) => Promise<void>;
  startFromYouTubeUrl: (url: string, options: TranslationOptions) => Promise<void>;
  saveOutput: () => Promise<void>;
  reset: () => void;
  appendLog: (message: string, level?: LogEntry["level"]) => void;
}

interface UseTranslationPipelineResult {
  state: PipelineState;
  endpoints: StreamEndpointsResponse | null;
  actions: PipelineActions;
}

const INITIAL_STATE: PipelineState = {
  phase: "idle",
  jobId: null,
  localFilePath: null,
  downloadProgress: null,
  translationProgress: null,
  error: null,
  logs: [],
};

function makeLog(message: string, level: LogEntry["level"] = "info"): LogEntry {
  return { timestamp: Date.now(), message, level };
}

export function useTranslationPipeline(): UseTranslationPipelineResult {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const [endpoints, setEndpoints] = useState<StreamEndpointsResponse | null>(null);

  const pollAbortRef = useRef<AbortController | null>(null);
  const downloadUnlistenRef = useRef<UnlistenFn | null>(null);

  const appendLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      setState((prev) => ({
        ...prev,
        logs: [...prev.logs, makeLog(message, level)],
      }));
    },
    []
  );

  const setError = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      phase: "error",
      error: message,
      logs: [...prev.logs, makeLog(message, "error")],
    }));
  }, []);

  const teardownListeners = useCallback(() => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
    downloadUnlistenRef.current?.();
    downloadUnlistenRef.current = null;
  }, []);

  const startPolling = useCallback(
    (
      jobId: string,
      localSeparationActive: boolean = false,
      videoPath: string = "",
      instrumentalPath: string = "",
      volume: number = 0.3,
      embedSubtitles: boolean = true,
      targetLanguage: string = "en"
    ) => {
      const abortController = new AbortController();
      pollAbortRef.current = abortController;

      pollJobProgress(
        jobId,
        async (progress: TranslationJobProgress) => {
          setState((prev) => ({
            ...prev,
            translationProgress: progress,
            logs:
              progress.message &&
              progress.message !== prev.translationProgress?.message
                ? [...prev.logs, makeLog(progress.message)]
                : prev.logs,
          }));

          if (progress.status === "completed") {
            let localVideoUrl: string | undefined = undefined;
            if (localSeparationActive && instrumentalPath) {
              setState((prev) => ({
                ...prev,
                logs: [...prev.logs, makeLog("Downloading dubbed audio track from server...")],
              }));
              try {
                const dubbedLocalWav = await tauriDownloadDubbedVoice(jobId);
                
                if (embedSubtitles) {
                  setState((prev) => ({
                    ...prev,
                    logs: [...prev.logs, makeLog("Downloading subtitles for local video embedding...")],
                  }));
                  try {
                    await tauriDownloadJobSubtitles(jobId);
                  } catch (subErr) {
                    console.error("Failed to download subtitles for local embedding:", subErr);
                  }
                }

                setState((prev) => ({
                  ...prev,
                  logs: [...prev.logs, makeLog("Mastering and mixing local audio files...")],
                }));
                const ext = videoPath.split(".").pop() || "mp4";
                const outputName = `local_output.${ext}`;
                const localOutputPath = await tauriRunLocalAudioMixing(
                  jobId,
                  videoPath,
                  instrumentalPath,
                  dubbedLocalWav,
                  outputName,
                  volume,
                  embedSubtitles,
                  targetLanguage
                );
                localVideoUrl = convertFileSrc(localOutputPath);
                setState((prev) => ({
                  ...prev,
                  logs: [...prev.logs, makeLog("Local mastering & mixing completed successfully.")],
                }));
              } catch (mixErr) {
                const mixErrMsg = mixErr instanceof Error ? mixErr.message : String(mixErr);
                setState((prev) => ({
                  ...prev,
                  logs: [...prev.logs, makeLog(`Local mixing failed: ${mixErrMsg}. Fallback to remote stream.`, "warn")],
                }));
              }
            }

            let resolved = resolveStreamEndpoints(jobId);
            if (localVideoUrl) {
              resolved = {
                ...resolved,
                videoUrl: localVideoUrl,
              };
            }
            setEndpoints(resolved);
            setState((prev) => ({
              ...prev,
              phase: "completed",
              logs: [...prev.logs, makeLog("Translation complete.")],
            }));
            teardownListeners();
          } else if (progress.status === "error") {
            const msg = progress.error ?? "Translation failed";
            setState((prev) => ({
              ...prev,
              phase: "error",
              error: msg,
              logs: [...prev.logs, makeLog(msg, "error")],
            }));
            teardownListeners();
          }
        },
        (err: Error) => {
          setError(`Polling error: ${err.message}`);
          teardownListeners();
        },
        abortController.signal
      );
    },
    [setError, teardownListeners]
  );

  const runTranslationFromPath = useCallback(
    async (filePath: string, options: TranslationOptions) => {
      let uploadFilePath = filePath;
      let localSeparationActive = false;
      let instrumentalPath = "";
      
      if (options.preserveBackgroundMusicEffects) {
        setState((prev) => ({
          ...prev,
          phase: "processing",
          logs: [...prev.logs, makeLog("Preparing background audio preservation...")],
        }));

        let unlistenProgress: (() => void) | null = null;
        try {
          unlistenProgress = await listen<{ percentage: number; status: string }>(
            "separation-download-progress",
            (event) => {
              setState((prev) => ({
                ...prev,
                logs: [
                  ...prev.logs,
                  makeLog(`[Model Download] ${event.payload.status}: ${event.payload.percentage.toFixed(1)}%`),
                ],
              }));
            }
          );

          setState((prev) => ({
            ...prev,
            logs: [...prev.logs, makeLog("Checking local source separation engine...")],
          }));

          // Verify or download model weights
          await tauriCheckAndInstallDemucsEngine();

          setState((prev) => ({
            ...prev,
            logs: [...prev.logs, makeLog("Running AI source separation locally...")],
          }));

          const localJobId = crypto.randomUUID();
          const sepResult = await tauriRunLocalAudioSeparation(filePath, localJobId);
          
          uploadFilePath = sepResult.vocals_path;
          instrumentalPath = sepResult.instrumental_path;
          localSeparationActive = true;

          setState((prev) => ({
            ...prev,
            logs: [...prev.logs, makeLog("Source separation completed. Uploading isolated vocals track...")],
          }));
        } catch (err) {
          const sepErrMsg = err instanceof Error ? err.message : String(err);
          setState((prev) => ({
            ...prev,
            logs: [
              ...prev.logs,
              makeLog(`Local source separation failed: ${sepErrMsg}. Reverting to standard upload.`, "warn"),
            ],
          }));
          uploadFilePath = filePath;
          localSeparationActive = false;
          instrumentalPath = "";
        } finally {
          if (unlistenProgress) {
            unlistenProgress();
          }
        }
      }

      setState((prev) => ({
        ...prev,
        phase: "uploading",
        localFilePath: uploadFilePath,
        logs: [...prev.logs, makeLog(`Uploading: ${uploadFilePath}`)],
      }));

      let jobId: string;
      try {
        jobId = await tauriProcessTranslationPipeline({
          file_path: uploadFilePath,
          target_language: options.targetLanguage,
          voice: options.voice,
          source_language: options.sourceLanguage !== "auto" ? options.sourceLanguage : undefined,
        });
      } catch (err) {
        setError(
          `Upload failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return;
      }

      const pollUrl = `https://api.praveenai.tech/progress/${jobId}`;
      console.log(`[pipeline] job_id=${jobId} polling=${pollUrl}`);

      setState((prev) => ({
        ...prev,
        phase: "processing",
        jobId,
        logs: [
          ...prev.logs,
          makeLog(`Job started: ${jobId}`),
          makeLog(`Polling: ${pollUrl}`),
        ],
      }));

      startPolling(
        jobId,
        localSeparationActive,
        filePath,
        instrumentalPath,
        options.backgroundAudioVolume ?? 0.3,
        options.embedSubtitles ?? true,
        options.targetLanguage
      );
    },
    [setError, startPolling]
  );

  const startFromLocalFile = useCallback(
    async (filePath: string, options: TranslationOptions) => {
      teardownListeners();
      setState({
        ...INITIAL_STATE,
        phase: "uploading",
        localFilePath: filePath,
        logs: [makeLog(`Selected file: ${filePath}`)],
      });
      setEndpoints(null);
      await runTranslationFromPath(filePath, options);
    },
    [teardownListeners, runTranslationFromPath]
  );

  const startFromYouTubeUrl = useCallback(
    async (url: string, options: TranslationOptions) => {
      teardownListeners();
      setState({
        ...INITIAL_STATE,
        phase: "downloading",
        logs: [makeLog(`Starting YouTube download: ${url}`)],
      });
      setEndpoints(null);

      const unlisten = await listen<DownloadProgressEvent>(
        "download-progress",
        (event) => {
          const payload = event.payload;
          setState((prev) => ({
            ...prev,
            downloadProgress: payload,
            logs:
              Math.floor(payload.percentage) % 10 === 0
                ? [
                    ...prev.logs,
                    makeLog(
                      `Download: ${payload.percentage.toFixed(1)}% @ ${payload.speed} ETA ${payload.eta}`
                    ),
                  ]
                : prev.logs,
          }));
        }
      );
      downloadUnlistenRef.current = unlisten;

      let localPath: string;
      try {
        localPath = await tauriDownloadVideo(url);
      } catch (err) {
        setError(
          `Download failed: ${err instanceof Error ? err.message : String(err)}`
        );
        unlisten();
        downloadUnlistenRef.current = null;
        return;
      }

      unlisten();
      downloadUnlistenRef.current = null;
      appendLog(`Download complete: ${localPath}`);
      await runTranslationFromPath(localPath, options);
    },
    [teardownListeners, setError, appendLog, runTranslationFromPath]
  );

  const saveOutput = useCallback(async () => {
    if (!state.jobId) return;
    try {
      const savedPath = await tauriSaveTranslatedVideo(state.jobId);
      appendLog(`Saved to: ${savedPath}`);
    } catch (err) {
      if (err instanceof Error && err.message === "Save cancelled by user") return;
      setError(
        `Save failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }, [state.jobId, appendLog, setError]);

  const reset = useCallback(() => {
    if (state.jobId) {
      tauriCleanupLocalJobFiles(state.jobId).catch(() => {});
    }
    teardownListeners();
    setState(INITIAL_STATE);
    setEndpoints(null);
  }, [teardownListeners, state.jobId]);

  return {
    state,
    endpoints,
    actions: {
      startFromLocalFile,
      startFromYouTubeUrl,
      saveOutput,
      reset,
      appendLog,
    },
  };
}
