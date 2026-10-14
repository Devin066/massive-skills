import "server-only";
import WebSocket from "ws";
import type { RelayStatus, StreamEvent } from "./types";

// One upstream stocks WebSocket per server process, shared by every browser tab.
// Massive allows ONE concurrent connection per asset class by default; opening a socket
// per viewer gets `max_connections` and a close. Browsers receive events over SSE from
// /api/stream, so the API key stays on the server.

type Feed = RelayStatus["feed"];
type Listener = (event: StreamEvent | ({ ev: "relay" } & RelayStatus)) => void;

const HOSTS: Record<Exclude<Feed, "off">, string> = {
  delayed: "wss://delayed.massive.com/stocks",
  realtime: "wss://socket.massive.com/stocks",
};

export function configuredFeed(): Feed {
  const f = (process.env.MASSIVE_WS_FEED ?? "off").toLowerCase();
  return f === "delayed" || f === "realtime" ? f : "off";
}

class MassiveRelay {
  private ws: WebSocket | null = null;
  private authed = false;
  private retry = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private fatal = false; // auth failure: stop reconnecting until config changes
  private readonly refs = new Map<string, number>(); // "AM.AAPL" -> number of viewers
  private readonly listeners = new Set<Listener>();
  status: RelayStatus = { state: "idle", feed: configuredFeed() };

  addListener(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
      this.scheduleIdleClose();
    };
  }

  subscribe(params: string[]) {
    const fresh = params.filter((p) => {
      const n = this.refs.get(p) ?? 0;
      this.refs.set(p, n + 1);
      return n === 0;
    });
    this.ensureConnected();
    if (fresh.length) this.send({ action: "subscribe", params: fresh.join(",") });
  }

  unsubscribe(params: string[]) {
    const gone = params.filter((p) => {
      const n = (this.refs.get(p) ?? 0) - 1;
      if (n <= 0) this.refs.delete(p);
      else this.refs.set(p, n);
      return n <= 0;
    });
    if (gone.length) this.send({ action: "unsubscribe", params: gone.join(",") });
    this.scheduleIdleClose();
  }

  private setStatus(state: RelayStatus["state"], message?: string) {
    this.status = { state, feed: configuredFeed(), message };
    for (const fn of this.listeners) fn({ ev: "relay", ...this.status });
  }

  private send(msg: object) {
    // Subscribes sent before auth_success are dropped by the server; they are
    // replayed from `refs` once auth succeeds.
    if (this.ws?.readyState === WebSocket.OPEN && this.authed) this.ws.send(JSON.stringify(msg));
  }

  private ensureConnected() {
    const feed = configuredFeed();
    if (feed === "off") return this.setStatus("off", "MASSIVE_WS_FEED=off - polling REST instead");
    if (this.ws || this.reconnectTimer || this.fatal) return;
    const key = process.env.MASSIVE_API_KEY;
    if (!key) return this.setStatus("error", "MASSIVE_API_KEY is not set");

    this.setStatus(this.retry ? "reconnecting" : "connecting");
    // MASSIVE_WS_URL exists only so tests can point the relay at a local mock server.
    const ws = new WebSocket(process.env.MASSIVE_WS_URL || HOSTS[feed]);
    this.ws = ws;

    ws.on("open", () => ws.send(JSON.stringify({ action: "auth", params: key })));

    ws.on("message", (raw) => {
      let batch: Array<Record<string, unknown>>;
      try {
        batch = JSON.parse(raw.toString());
      } catch {
        return;
      }
      // The server batches events into a JSON array during busy periods.
      for (const msg of batch) {
        if (msg.ev === "status") this.onStatus(String(msg.status), String(msg.message ?? ""));
        else for (const fn of this.listeners) fn(msg as unknown as StreamEvent);
      }
    });

    ws.on("close", (code) => {
      this.ws = null;
      this.authed = false;
      if (code === 1008) {
        // Policy close, e.g. max_connections. Reconnecting would just be kicked again.
        this.fatal = true;
        if (this.status.state !== "error") this.setStatus("error", "closed by server (1008): too many connections?");
      }
      if (this.fatal || this.refs.size === 0) {
        if (!this.fatal) this.setStatus("idle");
        return;
      }
      // Backoff 1s, 2s, 4s ... capped at 30s.
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
      this.setStatus("reconnecting", `retrying in ${Math.round(delay / 1000)}s`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.ensureConnected();
      }, delay);
    });

    ws.on("error", (err) => console.error("[massive relay]", err.message));
  }

  private onStatus(status: string, message: string) {
    if (status === "auth_success") {
      this.authed = true;
      this.retry = 0;
      this.setStatus("live");
      if (this.refs.size) this.send({ action: "subscribe", params: [...this.refs.keys()].join(",") });
    } else if (status === "auth_failed") {
      // Wrong key, or a feed above the plan (e.g. realtime on Starter). Not a code bug.
      this.fatal = true;
      this.setStatus("error", `auth_failed: ${message} - check MASSIVE_WS_FEED against your plan (npm run probe)`);
      this.ws?.close();
    } else if (status === "max_connections") {
      this.fatal = true;
      this.setStatus("error", "max_connections: another process is using this key's stocks socket");
    } else if (status === "error") {
      this.setStatus(this.status.state, message);
    }
  }

  /** Close the upstream socket shortly after the last viewer leaves. */
  private scheduleIdleClose() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.listeners.size === 0 && this.refs.size === 0) {
        this.fatal = false; // allow a fresh attempt next time someone connects
        this.ws?.close();
      }
    }, 30_000);
  }
}

// Survive Next.js dev hot reloads: without this every edit leaks another upstream socket.
const g = globalThis as unknown as { __massiveRelay?: MassiveRelay };
export const relay = (g.__massiveRelay ??= new MassiveRelay());
