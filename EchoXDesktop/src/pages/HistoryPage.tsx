import { useMemo, useState } from "react";
import type { HistoryEntry, HistoryStatus } from "../hooks/useHistory";
import { TARGET_LANGUAGES } from "../lib/translation-options";

interface HistoryPageProps {
  entries: HistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

type StatusFilter = "all" | HistoryStatus;
const ALL_LANGS = "__all__" as const;

const STATUS_LABEL: Record<HistoryStatus, string> = {
  completed: "Completed",
  error: "Failed",
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function languageLabel(code: string): string {
  if (code === "auto") return "Auto-detect";
  return TARGET_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

export function HistoryPage({ entries, onRemove, onClear }: HistoryPageProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>(ALL_LANGS);

  const targetLanguages = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.targetLanguage));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const statusOk = statusFilter === "all" || e.status === statusFilter;
      const langOk =
        languageFilter === ALL_LANGS || e.targetLanguage === languageFilter;
      return statusOk && langOk;
    });
  }, [entries, statusFilter, languageFilter]);

  return (
    <div className="page page--history">
      <header className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">History</h1>
          <p className="page-sub">
            Every translation job kept on this device. Sorted from newest to oldest.
          </p>
        </div>
        <div className="page-head-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClear}
            disabled={entries.length === 0}
          >
            Clear all
          </button>
        </div>
      </header>

      <div className="filter-row" role="toolbar" aria-label="History filters">
        <div className="filter-group">
          <span className="filter-group-label">Status</span>
          <div className="segmented">
            {(["all", "completed", "error"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={statusFilter === s}
                className="segmented-tab"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-group-label" htmlFor="history-lang">
            Target language
          </label>
          <div className="select-wrap">
            <select
              id="history-lang"
              className="select"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.currentTarget.value)}
            >
              <option value={ALL_LANGS}>All languages</option>
              {targetLanguages.map((code) => (
                <option key={code} value={code}>
                  {languageLabel(code)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="filter-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="empty">
          <span className="empty-title">No translations yet</span>
          <span className="empty-sub">
            Completed and failed jobs will appear here after you run them.
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <span className="empty-title">No entries match those filters</span>
          <span className="empty-sub">Clear filters to see your full history.</span>
        </div>
      ) : (
        <div className="history-table" role="table" aria-label="Translation history">
          <div className="history-row history-row--head" role="row">
            <span role="columnheader">Source</span>
            <span role="columnheader">Direction</span>
            <span role="columnheader">Voice</span>
            <span role="columnheader">When</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" aria-label="Actions" />
          </div>

          {filtered.map((entry) => (
            <div key={entry.id} className="history-row" role="row">
              <span className="history-source" role="cell">
                <span
                  className="history-source-kind"
                  data-kind={entry.sourceKind}
                  aria-hidden="true"
                >
                  {entry.sourceKind === "url" ? (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                      <ellipse cx="8" cy="8" rx="2.4" ry="6" stroke="currentColor" strokeWidth="1.1" />
                      <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.1" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 2.5h6L13 6.5v7A1.5 1.5 0 0 1 11.5 15h-8.5A1.5 1.5 0 0 1 1.5 13.5v-10A1.5 1.5 0 0 1 3 2.5Z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                      <path d="M9 2.5V6.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="history-source-label" title={entry.sourceLabel}>
                  {entry.sourceLabel}
                </span>
              </span>

              <span className="history-direction" role="cell">
                <span className="lang-code">{languageLabel(entry.sourceLanguage)}</span>
                <span className="lang-arrow" aria-hidden="true">→</span>
                <span className="lang-code lang-code--target">
                  {languageLabel(entry.targetLanguage)}
                </span>
              </span>

              <span className="history-voice" role="cell">
                {entry.voice || "—"}
              </span>

              <span className="history-when" role="cell">
                {formatTimestamp(entry.createdAt)}
              </span>

              <span role="cell">
                <span
                  className="pill"
                  data-status={entry.status}
                  title={entry.errorMessage ?? undefined}
                >
                  <span className="pill-dot" aria-hidden="true" />
                  {STATUS_LABEL[entry.status]}
                </span>
              </span>

              <span className="history-actions" role="cell">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onRemove(entry.id)}
                  aria-label={`Remove entry ${entry.id}`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 5h10M6.5 8v4M9.5 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M4 5h8l-.7 8a1 1 0 0 1-1 .9H5.7a1 1 0 0 1-1-.9L4 5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M6 5V3.5h4V5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
