import "server-only";

// Thin server-side REST wrapper. The API key never leaves the server: browsers call
// this app's /api/* routes, and only those routes talk to api.massive.com.

const BASE = "https://api.massive.com";

export type MassiveErrorCode =
  | "NO_KEY"
  | "NOT_AUTHENTICATED" // 401: missing / wrong key
  | "NOT_ENTITLED" // 403: plan does not include this endpoint or recency
  | "RATE_LIMITED" // 429: Basic plan is ~5 calls/min
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "UPSTREAM";

export class MassiveError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: MassiveErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) {
    throw new MassiveError(500, "NO_KEY", "MASSIVE_API_KEY is not set. Copy .env.example to .env.local.");
  }
  return key;
}

type Params = Record<string, string | number | boolean | undefined>;

function codeFor(status: number): MassiveErrorCode {
  if (status === 401) return "NOT_AUTHENTICATED";
  if (status === 403) return "NOT_ENTITLED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 404) return "NOT_FOUND";
  if (status === 400) return "BAD_REQUEST";
  return "UPSTREAM";
}

/**
 * GET a Massive REST path (or a full `next_url`).
 * @param revalidate seconds to cache in Next's data cache; 0 = always fetch fresh.
 */
export async function massiveGet<T>(pathOrUrl: string, params: Params = {}, revalidate = 0): Promise<T> {
  const url = new URL(pathOrUrl, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    // Header auth, not ?apiKey=, so the key never lands in logs or caches keyed by URL.
    headers: { Authorization: `Bearer ${apiKey()}` },
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {}
    throw new MassiveError(res.status, codeFor(res.status), `${res.status} ${url.pathname}: ${message}`);
  }
  return (await res.json()) as T;
}

/** Follow `next_url` cursors. Re-sends the auth header on every page (cursor URLs are not pre-authenticated). */
export async function massivePaginate<R>(
  path: string,
  params: Params = {},
  { maxPages = 10, revalidate = 0 } = {},
): Promise<R[]> {
  const out: R[] = [];
  let page = await massiveGet<{ results?: R[]; next_url?: string }>(path, params, revalidate);
  for (let i = 0; ; i++) {
    out.push(...(page.results ?? []));
    if (!page.next_url || i + 1 >= maxPages) break;
    page = await massiveGet(page.next_url, {}, revalidate);
  }
  return out;
}

/** Convert any thrown error into a JSON Response for route handlers. */
export function errorResponse(err: unknown): Response {
  if (err instanceof MassiveError) {
    const status = err.code === "NO_KEY" ? 500 : err.status;
    return Response.json({ error: { code: err.code, message: err.message } }, { status });
  }
  console.error(err);
  return Response.json({ error: { code: "UPSTREAM", message: "Unexpected server error" } }, { status: 500 });
}
