import { useCallback, useEffect, useState } from "react";
import { getDefaultVoice } from "../lib/translation-options";

const STORAGE_KEY = "echox.settings.v1";

export interface AppSettings {
  defaultTargetLanguage: string;
  defaultVoice: string;
  defaultSourceLanguage: string;
  preserveBackgroundAudio: boolean;
  preserveBackgroundMusicEffects: boolean;
  backgroundAudioVolume: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultTargetLanguage: "hi",
  defaultVoice: getDefaultVoice("hi")?.code ?? "hi-IN-rohan",
  defaultSourceLanguage: "auto",
  preserveBackgroundAudio: false,
  preserveBackgroundMusicEffects: false,
  backgroundAudioVolume: 0.3,
};

interface UseSettingsResult {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.defaultTargetLanguage === "string" &&
    typeof v.defaultVoice === "string" &&
    typeof v.defaultSourceLanguage === "string" &&
    typeof v.preserveBackgroundAudio === "boolean" &&
    (v.preserveBackgroundMusicEffects === undefined || typeof v.preserveBackgroundMusicEffects === "boolean") &&
    typeof v.backgroundAudioVolume === "number"
  );
}

function readStorage(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: any = JSON.parse(raw);
    if (!isAppSettings(parsed)) return DEFAULT_SETTINGS;
    const merged: AppSettings = {
      ...parsed,
      backgroundAudioVolume: Math.min(1, Math.max(0, parsed.backgroundAudioVolume)),
    };
    if (merged.preserveBackgroundMusicEffects === undefined) {
      merged.preserveBackgroundMusicEffects = false;
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStorage(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable; ignore
  }
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(() => readStorage());

  useEffect(() => {
    writeStorage(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
