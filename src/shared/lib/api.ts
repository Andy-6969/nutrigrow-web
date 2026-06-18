/**
 * VPS API HTTP Client
 * ──────────────────
 * All requests to the NutriGrow Node.js VPS (nutrigrow.my.id) must go
 * through this client so the Authorization: Bearer <access_token> header
 * is automatically attached. Never call the VPS directly with raw fetch.
 */

const VPS_BASE_URL = process.env.NEXT_PUBLIC_VPS_API_URL ?? 'https://nutrigrow.my.id/api';

// ─── Token Provider ──────────────────────────────────────────
// Lazily imported to avoid circular deps — supabase client is browser-only
async function getAccessToken(): Promise<string | null> {
  try {
    const { supabase } = await import('@/shared/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Coba refresh Supabase session.
 * Returns new access_token jika berhasil, atau null jika gagal.
 */
async function tryRefreshToken(): Promise<string | null> {
  try {
    const { supabase } = await import('@/shared/lib/supabase');
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}

// ─── Base Fetcher ─────────────────────────────────────────────
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Override the token — useful for testing or server-side calls */
  token?: string;
  /** Internal — set to true on retry to prevent infinite loop */
  _isRetry?: boolean;
}

export async function vpsRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, token: overrideToken, _isRetry, ...fetchOptions } = options;

  // 1. Get the Bearer token
  const token = overrideToken ?? (await getAccessToken());

  // 2. Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Make request
  const url = endpoint.startsWith('http') ? endpoint : `${VPS_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 4. Handle 401 — token expired or invalid
  if (response.status === 401) {
    // Jangan langsung redirect — coba refresh token dulu (sekali saja)
    if (!_isRetry) {
      console.warn(`[vpsApi] 401 on ${endpoint} — attempting token refresh...`);
      const newToken = await tryRefreshToken();

      if (newToken) {
        // Retry request dengan token baru
        console.info(`[vpsApi] Token refreshed — retrying ${endpoint}`);
        return vpsRequest<T>(endpoint, {
          ...options,
          token: newToken,
          _isRetry: true,
        });
      }
    }

    // Refresh gagal atau sudah retry — session benar-benar expired
    console.error(`[vpsApi] Session expired on ${endpoint} — redirecting to login`);
    if (typeof document !== 'undefined') {
      document.cookie = 'ng-auth=; path=/; max-age=0';
      // Delay kecil agar request lain tidak double-redirect
      setTimeout(() => {
        window.location.href = '/login?error=session_expired';
      }, 100);
    }
    throw new Error('Unauthorized — session expired');
  }

  // 5. Handle non-ok responses
  if (!response.ok) {
    let errorMessage = `VPS API error: ${response.status} ${response.statusText} [${endpoint}]`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message ?? errorBody.error ?? errorMessage;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage);
  }

  // 6. Parse and return
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as T;
}

// ─── Convenience Methods ──────────────────────────────────────
export const vpsApi = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    vpsRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    vpsRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    vpsRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    vpsRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    vpsRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ─── Usage Examples ───────────────────────────────────────────
// import { vpsApi } from '@/shared/lib/api';
//
// Sensor readings:
//   const data = await vpsApi.get<SensorData[]>('/sensors/zone/zone-uuid');
//
// Toggle actuator:
//   await vpsApi.post('/actuator/toggle', { zone_id: 'uuid', action: 'on' });
//
// The Authorization: Bearer <access_token> header is attached automatically.
