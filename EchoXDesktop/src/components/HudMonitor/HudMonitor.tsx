import { useEffect, useRef } from "react";
import { LogLine } from "./LogLine";
import type { LogEntry } from "../../types";

interface HudMonitorProps {
  logs: LogEntry[];
}

export function HudMonitor({ logs }: HudMonitorProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div
      className="hud"
      role="log"
      aria-label="Activity log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {logs.map((entry) => (
        <LogLine key={`${entry.timestamp}-${entry.message}`} entry={entry} />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
