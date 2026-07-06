import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "echox.history.v1";
const MAX_ENTRIES = 200;

export type HistorySourceKind = "file" | "url";
export type HistoryStatus = "completed" | "error";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  sourceKind: HistorySourceKind;
  sourceLabel: string;
  targetLanguage: string;
  sourceLanguage: string;
  voice: string;
  status: HistoryStatus;
  errorMessage: string | null;
}

export interface HistoryMetrics {
  total: number;
  completed: number;
  errored: number;
  successRate: number | null;
  lastCompletedAt: number | null;
}

interface UseHistoryResult {
  entries: HistoryEntry[];
  metrics: HistoryMetrics;
  appendEntry: (entry: Omit<HistoryEntry, "createdAt">) => void;
  removeEntry: (id: string) => void;
  clear: () => void;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.createdAt === "number" &&
    (v.sourceKind === "file" || v.sourceKind === "url") &&
    typeof v.sourceLabel === "string" &&
    typeof v.targetLanguage === "string" &&
    typeof v.sourceLanguage === "string" &&
    typeof v.voice === "string" &&
    (v.status === "completed" || v.status === "error") &&
    (v.errorMessage === null || typeof v.errorMessage === "string")
  );
}

function readStorage(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

function writeStorage(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage unavailable; ignore
  }
}

export function useHistory(): UseHistoryResult {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => readStorage());

  useEffect(() => {
    writeStorage(entries);
  }, [entries]);

  const appendEntry = useCallback(
    (entry: Omit<HistoryEntry, "createdAt">) => {
      setEntries((prev) => {
        if (prev.some((e) => e.id === entry.id)) return prev;
        const next: HistoryEntry = { ...entry, createdAt: Date.now() };
        const merged = [next, ...prev];
        return merged.length > MAX_ENTRIES ? merged.slice(0, MAX_ENTRIES) : merged;
      });
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  const metrics = useMemo<HistoryMetrics>(() => {
    const total = entries.length;
    const completed = entries.filter((e) => e.status === "completed").length;
    const errored = entries.filter((e) => e.status === "error").length;
    const successRate = total === 0 ? null : Math.round((completed / total) * 100);
    const lastCompleted = entries.find((e) => e.status === "completed");
    return {
      total,
      completed,
      errored,
      successRate,
      lastCompletedAt: lastCompleted?.createdAt ?? null,
    };
  }, [entries]);

  return { entries, metrics, appendEntry, removeEntry, clear };
}