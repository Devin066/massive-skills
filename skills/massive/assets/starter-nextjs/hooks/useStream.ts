"use client";

import { useEffect, useRef, useState } from "react";
import type { RelayStatus, StreamEvent } from "@/lib/types";

/**
 * Subscribe to /api/stream over Server-Sent Events. EventSource reconnects on its own;
 * the server-side relay owns the single upstream Massive socket.
 */
export function useStream(
  tickers: string[],
  channels: string[],
  enabled: boolean,
  onEvent: (ev: StreamEvent) => void,
): RelayStatus | null {
  const [status, setStatus] = useState<RelayStatus | null>(null);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  const key = `${tickers.join(",")}|${channels.join(",")}`;

  useEffect(() => {
    if (!enabled || !tickers.length) return;
    const qs = new URLSearchParams({ tickers: tickers.join(","), channels: channels.join(",") });
    const es = new EventSource(`/api/stream?${qs}`);
    es.addEventListener("message", (e) => handler.current(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("status", (e) => setStatus(JSON.parse((e as MessageEvent).data)));
    es.onerror = () => setStatus((s) => (s ? { ...s, state: "reconnecting" } : s));
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return status;
}
