import { API_BASE_URL } from "../config";

export type ApiResponse<T> = {
  data?: T;
  message?: string;
};

type StoredAuthSession = {
  session?: {
    access_token?: string;
  };
};

export class APIError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

function getAccessToken(): string {
  const rawSession = localStorage.getItem("auth_session");
  if (!rawSession) {
    throw new APIError("No authenticated session found", 401);
  }

  let parsed: StoredAuthSession;
  try {
    parsed = JSON.parse(rawSession) as StoredAuthSession;
  } catch {
    throw new APIError("Stored authentication session is invalid", 401);
  }

  const accessToken = parsed.session?.access_token;
  if (!accessToken) {
    throw new APIError("Authentication token is missing", 401);
  }

  return accessToken;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "Request failed")
        : `Request failed with HTTP ${response.status}`;
    throw new APIError(message, response.status);
  }

  return payload as T;
}
