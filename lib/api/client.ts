/**
 * Habixa API Client
 * Handles base URL, auth header, and fetch wrapper.
 */

import { Endpoints } from './endpoints';

const DEFAULT_BASE_URL =
  (typeof process !== 'undefined' &&
    (process.env.EXPO_PUBLIC_API_URL || process.env.API_URL)) ||
  'http://localhost:8000';

let baseUrl = DEFAULT_BASE_URL;
let authToken: string | null = null;

export function setApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

let onUnauthenticated: (() => void) | null = null;

/** Register callback invoked when API returns 401 on an authenticated request. Cleared on unmount. */
export function setOnUnauthenticated(cb: (() => void) | null) {
  onUnauthenticated = cb;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || res.statusText };
  }

  if (!res.ok) {
    const err = data as { message?: string; errors?: Record<string, string[]> };
    throw {
      message: err?.message || res.statusText || 'Request failed',
      errors: err?.errors,
      status: res.status,
    } as ApiError;
  }

  return data as T;
}

function logRequest(
  method: string,
  url: string,
  startTime: number,
  res: Response,
  body?: unknown
) {
  if (!__DEV__) return;
  const duration = Date.now() - startTime;
  const statusColor = res.ok ? '🟢' : '🔴';
  console.log(
    `${statusColor} ${method} ${url} → ${res.status} (${duration}ms)`
  );
  if (body !== undefined) {
    console.log('  Request body:', JSON.stringify(body, null, 2));
  }
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    headers?: Record<string, string>;
    skipAuth?: boolean;
    /** When true, 401 will not trigger onUnauthenticated (e.g. for logout when token is invalid) */
    skipUnauthCallback?: boolean;
  }
): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (authToken && !options?.skipAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const startTime = Date.now();
  const res = await fetch(url, {
    method,
    headers,
    body: options?.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  logRequest(method, url, startTime, res, options?.body);
  try {
    return await handleResponse<T>(res);
  } catch (err) {
    const apiErr = err as ApiError;
    if (apiErr?.status === 401 && !options?.skipAuth && !options?.skipUnauthCallback) {
      onUnauthenticated?.();
    }
    throw err;
  }
}

/** FormData for file uploads - omits Content-Type so browser sets multipart boundary */
async function requestFormData<T>(
  method: string,
  path: string,
  formData: FormData,
  options?: { skipAuth?: boolean; skipUnauthCallback?: boolean }
): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken && !options?.skipAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const startTime = Date.now();
  const res = await fetch(url, {
    method,
    headers,
    body: formData,
  });

  logRequest(method, url, startTime, res);
  try {
    return await handleResponse<T>(res);
  } catch (err) {
    const apiErr = err as ApiError;
    if (apiErr?.status === 401 && !options?.skipAuth && !options?.skipUnauthCallback) {
      onUnauthenticated?.();
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: { skipAuth?: boolean }) =>
    request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) =>
    request<T>('POST', path, { body, ...opts }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postFormData: <T>(path: string, formData: FormData, opts?: { skipAuth?: boolean }) =>
    requestFormData<T>('POST', path, formData, opts),
};

export { Endpoints };
