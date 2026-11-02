// Browser helper for the JSON API: returns `data`, or throws ApiError with the server's message.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method: init.method ?? (body === undefined ? 'GET' : 'POST'),
    headers: isForm || body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    credentials: 'same-origin',
    ...init,
  });
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message: string; code?: string; details?: unknown } } | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(json?.error?.message ?? `Request failed (${res.status})`, res.status, json?.error?.code, json?.error?.details);
  }
  return json.data as T;
}
