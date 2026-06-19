import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

interface DragDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

interface FileDropZoneProps {
  onFileSelected: (path: string) => void;
  disabled: boolean;
}

export function FileDropZone({ onFileSelected, disabled }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const onFileSelectedRef = useRef(onFileSelected);
  const disabledRef = useRef(disabled);
  useEffect(() => { onFileSelectedRef.current = onFileSelected; });
  useEffect(() => { disabledRef.current = disabled; });

  useEffect(() => {
    let unlistenDrop: (() => void) | undefined;
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    listen<DragDropPayload>("tauri://drag-drop", (event) => {
      setIsDragOver(false);
      if (disabledRef.current) return;
      const path = event.payload.paths[0];
      if (path) {
        setSelectedPath(path);
        onFileSelectedRef.current(path);
      }
    }).then((fn) => { unlistenDrop = fn; });

    listen<void>("tauri://drag-enter", () => {
      if (!disabledRef.current) setIsDragOver(true);
    }).then((fn) => { unlistenEnter = fn; });

    listen<void>("tauri://drag-leave", () => {
      setIsDragOver(false);
    }).then((fn) => { unlistenLeave = fn; });

    return () => {
      unlistenDrop?.();
      unlistenEnter?.();
      unlistenLeave?.();
    };
  }, []);

  const handleClick = async () => {
    if (disabled) return;
    const result = await open({
      multiple: false,
      filters: [
        { name: "Video", extensions: ["mp4", "mov", "webm", "mkv", "avi"] },
      ],
    });
    if (typeof result === "string") {
      setSelectedPath(result);
      onFileSelected(result);
    }
  };

  const displayName = selectedPath
    ? selectedPath.split(/[\\/]/).pop() ?? selectedPath
    : null;

  return (
    <div
      className="dropzone"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Drop video file or click to browse"
      data-drag-over={isDragOver || undefined}
      data-has-file={displayName ? true : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <span className="dropzone-icon" aria-hidden="true">
        {displayName ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h6.879a2 2 0 0 1 1.414.586l3.621 3.621A2 2 0 0 1 19 9.621V17.5A2.5 2.5 0 0 1 16.5 20h-10A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <path d="m9 13 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="m7.5 8.5 4.5-4.5 4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        )}
      </span>
      {displayName ? (
        <>
          <span className="dropzone-filename" data-role="filename" title={selectedPath ?? undefined}>
            {displayName}
          </span>
          <span className="dropzone-sub">Click to choose a different file</span>
        </>
      ) : (
        <>
          <span className="dropzone-prompt" data-role="prompt">
            Drop a video here, or click to browse
          </span>
          <span className="dropzone-sub">.mp4 · .mov · .webm · .mkv · .avi  ·  up to 200 MB</span>
        </>
      )}
    </div>
  );
}
