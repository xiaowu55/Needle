const PUSH_WORKER_API_URL = process.env.PUSH_WORKER_API_URL;

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function hasPushWorkerProxy() {
  return Boolean(PUSH_WORKER_API_URL);
}

export async function proxyPushWorkerRequest(
  path: string,
  init: RequestInit = {},
) {
  if (!PUSH_WORKER_API_URL) {
    throw new Error("Missing PUSH_WORKER_API_URL.");
  }

  const headers = new Headers(init.headers || {});

  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  return fetch(`${normalizeBaseUrl(PUSH_WORKER_API_URL)}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
