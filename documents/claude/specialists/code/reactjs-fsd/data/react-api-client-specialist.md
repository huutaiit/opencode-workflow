# React API Client Specialist
# React APIクライアントスペシャリスト
# Chuyen Gia API Client React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared (API client is leaf-level shared infrastructure) |
| **Directory Pattern** | `src/shared/api/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 21.1–21.10 |
| **Source Paths** | `src/shared/api/client.ts`, `src/shared/api/interceptors/` |
| **File Count** | 3–6 files (client, interceptors, error handler, types) |
| **Naming Convention** | `client.ts` (Axios instance), `authInterceptor.ts`, `errorInterceptor.ts`, `api.types.ts` |
| **Imports From** | Shared (config for base URL, auth store for token access) |
| **Cannot Import** | Features, Entities, Pages (API client is lowest shared layer) |
| **Imported By** | Entities (API queries use client), Shared (other API utilities) |
| **Dependencies** | `axios:1.x` |
| **When To Use** | API client setup, auth token management, request/response interceptors, error normalization, file upload |
| **Source Skeleton** | `src/shared/api/client.ts`, `src/shared/api/interceptors/authInterceptor.ts`, `src/shared/api/interceptors/errorInterceptor.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Axios API client with interceptors, auth token injection, token refresh queue, error normalization, and file upload support |
| **Activation Trigger** | files: src/shared/api/client.ts, src/shared/api/interceptors/**; keywords: axios, apiClient, interceptor, tokenRefresh, authToken |

---

## Evidence Sources

- E1: Axios interceptor documentation
- E2: OAuth2 token refresh queue pattern (concurrent request queuing)
- E3: Enterprise error normalization patterns
- E4: AntD notification integration for API errors

---

## Role

You are a **React API Client Specialist** for enterprise FSD projects. Your responsibility is to define the HTTP client foundation: Axios instance configuration, request/response interceptors, auth token management with refresh queue, and error normalization. Every API call flows through this client.

**Used by**: TanStack Query specialist, all entity API queries, auth specialist
**Not used by**: GraphQL (uses Apollo/graphql-request), WebSocket (uses SignalR/Socket.IO)

---

## Patterns

### Pattern 21.1: Axios Instance Creation (CRITICAL)

```typescript
// src/shared/api/client.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getRuntimeConfig } from '@/shared/config/runtime';

export const apiClient: AxiosInstance = axios.create({
  baseURL: getRuntimeConfig().apiBaseUrl,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Re-export for type usage
export type { AxiosError, AxiosResponse } from 'axios';
```

---

### Pattern 21.2: Request Interceptor (CRITICAL)

Auth token injection, request ID, correlation.

```typescript
// src/shared/api/interceptors/authInterceptor.ts
import { apiClient } from '../client';
import { useAuthStore } from '@/shared/store/authStore';

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject auth token
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Request correlation ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();

    // App version for API compatibility
    config.headers['X-App-Version'] = import.meta.env.VITE_APP_VERSION || 'dev';

    return config;
  },
  (error) => Promise.reject(error),
);
```

---

### Pattern 21.3: Response Interceptor (CRITICAL)

Error normalization and response unwrapping.

```typescript
// src/shared/api/interceptors/errorInterceptor.ts
import { apiClient } from '../client';
import type { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  status: number;
  requestId?: string;
}

function normalizeError(error: AxiosError<any>): ApiError {
  if (error.response) {
    const data = error.response.data;
    return {
      code: data?.code ?? `HTTP_${error.response.status}`,
      message: data?.message ?? error.message,
      details: data?.details ?? data?.errors,
      status: error.response.status,
      requestId: error.response.headers?.['x-request-id'],
    };
  }

  if (error.code === 'ECONNABORTED') {
    return { code: 'TIMEOUT', message: 'Request timed out', status: 0 };
  }

  return { code: 'NETWORK_ERROR', message: 'Network error. Check your connection.', status: 0 };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError = normalizeError(error);

    // Don't show notification for 401 (handled by refresh queue)
    if (apiError.status !== 401) {
      console.error(`[API] ${apiError.code}: ${apiError.message}`, apiError);
    }

    return Promise.reject(apiError);
  },
);
```

---

### Pattern 21.4: Auth Token Refresh Queue (CRITICAL)

On 401: queue all concurrent requests, refresh token, replay queued requests.

```typescript
// src/shared/api/interceptors/tokenRefresh.ts
import { apiClient } from '../client';
import { useAuthStore } from '@/shared/store/authStore';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 (Unauthorized) — not 403 (Forbidden)
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request — wait for refresh to complete
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = useAuthStore.getState();
      const response = await axios.post(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      );

      const newAccessToken = response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;

      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      processQueue(null, newAccessToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error, null);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
```

**How the queue works:**
1. Request A gets 401 → starts refresh, `isRefreshing = true`
2. Requests B, C arrive during refresh → queued in `failedQueue`
3. Refresh succeeds → `processQueue(null, newToken)` → B, C replayed with new token
4. Refresh fails → `processQueue(error, null)` → B, C rejected, user redirected to login

---

### Pattern 21.5: Error Response Normalization (HIGH)

Standard error shape for consistent UI handling.

```typescript
// src/shared/api/types.ts
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  status: number;
}

// Type guard
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  );
}

// Usage in components
import { App } from 'antd';
const { notification } = App.useApp();

mutation.onError((error) => {
  if (isApiError(error) && error.details) {
    // Field-level errors → set form errors
    Object.entries(error.details).forEach(([field, messages]) => {
      form.setFields([{ name: field, errors: messages }]);
    });
  } else {
    notification.error({ message: 'Error', description: error.message });
  }
});
```

---

### Pattern 21.6: Request Cancellation (HIGH)

```typescript
// AbortController via TanStack Query (automatic)
const { data } = useQuery({
  queryKey: ['users', id],
  queryFn: ({ signal }) => apiClient.get(`/users/${id}`, { signal }).then((r) => r.data),
});

// Manual cancellation
const controller = new AbortController();
apiClient.get('/users', { signal: controller.signal });
controller.abort(); // Cancel request
```

---

### Pattern 21.7: File Upload/Download (MEDIUM-HIGH)

```typescript
// Upload with progress
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return data;
}

// Download as blob
export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  const { data } = await apiClient.get(`/files/${fileId}`, {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

### Pattern 21.8: API Versioning (MEDIUM)

```typescript
// URL-based versioning
const apiV1 = axios.create({ baseURL: '/api/v1' });
const apiV2 = axios.create({ baseURL: '/api/v2' });

// Header-based versioning
apiClient.interceptors.request.use((config) => {
  config.headers['Api-Version'] = '2024-03-01';
  return config;
});
```

---

### Pattern 21.9: Request/Response Logging (MEDIUM)

```typescript
// Dev-only logging interceptor
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use((config) => {
    console.log(`→ ${config.method?.toUpperCase()} ${config.url}`, config.params);
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      console.log(`← ${response.status} ${response.config.url}`, response.data);
      return response;
    },
    (error) => {
      console.error(`✖ ${error.response?.status} ${error.config?.url}`, error.response?.data);
      return Promise.reject(error);
    },
  );
}
```

---

### Pattern 21.10: Anti-patterns (MEDIUM)

**1. Multiple Axios instances** — Creating new instances per feature.
```
// FIX: One shared instance in shared/api/client.ts
```

**2. Missing token refresh** — 401 → redirect to login without refresh attempt.
```
// FIX: Implement refresh queue (Pattern 21.4)
```

**3. Unhandled errors** — Swallowing API errors silently.
```
// FIX: Error interceptor normalizes + logs. Components show notification.
```

**4. Hardcoded base URL** — `fetch('http://localhost:3000/api/users')`.
```
// FIX: Use config (Pattern 6.1) + Axios baseURL
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (21.1–21.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React API Client Specialist | EPS v3.2 | Metadata v2.1*
