"use client";

import { useEffect, useState } from "react";

interface Status {
  market: string;
  earlyHours: boolean;
  afterHours: boolean;
}

function label(s: Status): { text: string; tone: string } {
  if (s.market === "open") return { text: "Market open", tone: "up" };
  if (s.earlyHours) return { text: "Pre-market", tone: "warn" };
  if (s.afterHours) return { text: "After hours", tone: "warn" };
  if (s.market === "extended-hours") return { text: "Extended hours", tone: "warn" };
  return { text: "Market closed", tone: "muted" };
}

export function MarketStatusBadge({ onChange }: { onChange?: (open: boolean) => void }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((s: Status | null) => {
          if (!alive || !s) return;
          setStatus(s);
          onChange?.(s.market !== "closed");
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [onChange]);

  if (!status) return <span className="badge muted">…</span>;
  const { text, tone } = label(status);
  return <span className={`badge ${tone}`}>{text}</span>;
}
