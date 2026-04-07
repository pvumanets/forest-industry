const jsonHeaders = { "Content-Type": "application/json" } as const;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const hasBody = init.body != null && init.body !== "";
  return fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(hasBody ? jsonHeaders : {}),
      ...init.headers,
    },
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 204) {
    return undefined as T;
  }
  let data: unknown;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  } else {
    data = null;
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Запрос не выполнен (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}
