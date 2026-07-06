import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SaveProgressEvent } from "../types";

export function useSaveProgress(): SaveProgressEvent | null {
  const [progress, setProgress] = useState<SaveProgressEvent | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<SaveProgressEvent>("save-progress", (event) => {
      setProgress(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  return progress;
}
