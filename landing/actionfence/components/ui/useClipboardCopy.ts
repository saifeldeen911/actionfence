"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ClipboardCopyStatus = "idle" | "success" | "error";

export function useClipboardCopy(successDurationMs = 2000) {
  const [status, setStatus] = useState<ClipboardCopyStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearResetTimer();
    setStatus("idle");
  }, [clearResetTimer]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      clearResetTimer();

      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        setStatus("error");
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setStatus("success");
        resetTimerRef.current = setTimeout(() => {
          setStatus("idle");
          resetTimerRef.current = null;
        }, successDurationMs);
        return true;
      } catch {
        setStatus("error");
        return false;
      }
    },
    [clearResetTimer, successDurationMs],
  );

  useEffect(() => {
    return () => {
      clearResetTimer();
    };
  }, [clearResetTimer]);

  return { status, copy, reset };
}
