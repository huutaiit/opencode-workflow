# Axios Client & Auth Specialist
# Axios Client & Auth スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | API (HTTP client configuration and JWT authentication) |
| **Directory Pattern** | `utils/axios-client.ts`, `services/api/auth.ts`, `utils/jwt-token.ts` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 6.01–6.05 |
| **Source Paths** | `**/utils/axios-client.ts`, `**/services/api/auth.ts`, `**/utils/jwt-token.ts` |
| **File Count** | 3 files (axios-client, auth API, jwt-token utility) |
| **Naming Convention** | `axios-client.ts`, `auth.ts`, `jwt-token.ts` |
| **Imports From** | None (foundational — other layers import from this) |
| **Cannot Import** | State (Redux), Rendering (viewer components), Settings (subsystem components) |
| **Imported By** | API (all 24 service classes import configured axios instance) |
| **Dependencies** | `axios:0.21`, `jwt-decode:3.x` |
| **When To Use** | Configuring the HTTP client with JWT Bearer token injection, 401 response interceptor with token refresh queue, and auth endpoint methods |
| **Source Skeleton** | `utils/axios-client.ts`, `services/api/auth.ts`, `utils/jwt-token.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Axios client with request/response interceptors, JWT token injection with expiration check, and concurrent-safe token refresh queue preventing duplicate refresh calls |
| **Activation Trigger** | files: **/axios-client.ts, **/jwt-token.ts; keywords: axiosInterceptor, jwtToken, tokenRefresh, bearerAuth, 401handling |

---

## Specialist Identity

```pseudo
SPECIALIST AxiosClientAuthSpecialist {
  ROLE: "HTTP client and JWT authentication expert"

  RESPONSIBILITIES: [
    "Configure axios instance with baseURL and default headers",
    "Implement request interceptor for JWT token injection",
    "Implement response interceptor for 401 handling with token refresh",
    "Manage token refresh queue to prevent duplicate refresh calls",
    "Handle auth exclusion for login/refresh endpoints",
    "Manage localStorage token persistence"
  ]

  TECH_STACK: {
    http: "axios",
    token: "jwt-decode for expiration check",
    storage: "localStorage (direct, not via service wrapper)",
    auth: "JWT Bearer token + refresh token"
  }
}
```

---

## Pattern 6.01: Axios Client Configuration

```pseudo
WORKFLOW AxiosConfig_Implementation {
  TEMPLATE: |
    import axios from 'axios'

    const axiosClient = axios.create({
      baseURL: process.env.REACT_APP_API_ENDPOINT,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000  # 30 seconds global
    })

    export default axiosClient

  CRITICAL_RULES: [
    "BaseURL from REACT_APP_API_ENDPOINT environment variable",
    "Default Content-Type: application/json (auto-overridden for FormData)",
    "Global timeout 30s, overridden to 10s in request interceptor"
  ]
}
```

---

## Pattern 6.02: Request Interceptor — Token Injection

```pseudo
WORKFLOW RequestInterceptor_Implementation {
  EXCLUDED_URLS: [
    "/api/v1/Authentication/Login",
    "/api/v1/Authentication/RefreshToken"
  ]

  LOGIC: |
    axiosClient.interceptors.request.use(
      (config) => {
        config.timeout = 10000  # Override to 10s per request

        isAuthExcluded = EXCLUDED_URLS.some(url => config.url.includes(url))

        IF !isAuthExcluded THEN
          jwtToken = localStorage.getItem('jwtToken')

          IF jwtToken AND !isJwtTokenExpired(jwtToken) THEN
            config.headers.Authorization = `Bearer ${jwtToken}`
          END IF
        END IF

        return config
      },
      (error) => Promise.reject(error)
    )

  TOKEN_EXPIRATION_CHECK: |
    function isJwtTokenExpired(token: string): boolean {
      try {
        decoded = jwtDecode(token)
        return decoded.exp * 1000 < Date.now()
      } catch {
        return true  # Treat invalid token as expired
      }
    }

  CRITICAL_RULES: [
    "NEVER attach token to login/refresh endpoints — prevents circular auth",
    "Check token expiration BEFORE attaching — don't send expired tokens",
    "Timeout overridden from 30s→10s per individual request",
    "Invalid/malformed tokens treated as expired (catch returns true)"
  ]
}
```

---

## Pattern 6.03: Response Interceptor — 401 Handling

```pseudo
WORKFLOW ResponseInterceptor_Implementation {
  LOGIC: |
    let isRefreshing = false
    let failedQueue: Array<{ resolve, reject }> = []

    axiosClient.interceptors.response.use(
      (response) => response,  # Pass through success

      async (error) => {
        originalRequest = error.config

        IF error.response?.status === 401 AND !originalRequest._retry THEN
          # Mark as retried to prevent infinite loop
          originalRequest._retry = true

          IF isRefreshing THEN
            # Queue this request until refresh completes
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return axiosClient(originalRequest)
            })
          END IF

          isRefreshing = true

          try {
            newTokens = await refreshTokenCall()
            localStorage.setItem('jwtToken', newTokens.jwtToken)
            IF newTokens.refreshToken THEN
              localStorage.setItem('refreshToken', newTokens.refreshToken)
            END IF

            # Process queued requests with new token
            processQueue(null, newTokens.jwtToken)

            originalRequest.headers.Authorization = `Bearer ${newTokens.jwtToken}`
            return axiosClient(originalRequest)
          } catch (refreshError) {
            processQueue(refreshError, null)
            # Clear auth and redirect to login
            localStorage.clear()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
          }
        END IF

        return Promise.reject(error)
      }
    )

  QUEUE_PROCESSOR: |
    function processQueue(error, token) {
      failedQueue.forEach(({ resolve, reject }) => {
        IF error THEN
          reject(error)
        ELSE
          resolve(token)
        END IF
      })
      failedQueue = []
    }

  CRITICAL_RULES: [
    "Only handle 401 — all other errors pass through",
    "_retry flag prevents infinite refresh loops",
    "Queue system ensures only ONE refresh call at a time",
    "On refresh failure: clear ALL localStorage, redirect to /login",
    "isRefreshing flag is module-level (not per-request)"
  ]
}
```

---

## Pattern 6.04: Token Refresh Call

```pseudo
WORKFLOW TokenRefresh_Implementation {
  ENDPOINT: "POST /api/v1/User/refreshToken"

  LOGIC: |
    async function refreshTokenCall() {
      refreshToken = localStorage.getItem('refreshToken')

      response = await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/api/v1/User/refreshToken`,
        null,
        { headers: { refreshToken: refreshToken } }
      )

      # Response: { success: boolean, data: { jwtToken, refreshToken? } }
      IF response.data.success THEN
        return response.data.data
      ELSE
        throw new Error('Token refresh failed')
      END IF
    }

  CRITICAL_RULES: [
    "refreshToken sent as HEADER (not body) — non-standard but project convention",
    "Use raw axios.post() NOT axiosClient — avoid interceptor loop",
    "Response may or may not include new refreshToken",
    "Only update refreshToken in localStorage if new one provided"
  ]
}
```

---

## Pattern 6.05: Auth API Methods

```pseudo
WORKFLOW AuthAPI_Implementation {
  METHODS: {
    authenticate: {
      endpoint: "POST /api/v1/User/Authenticate",
      payload: "{ userName, password, loginType }",
      returns: "{ success, data: { jwtToken, refreshToken, user } }"
    }
    fetchRedirectConfig: {
      endpoint: "GET /api/v1/User/GetLoginRedirect",
      returns: "{ data: { redirectUrl } }"
    }
  }

  LOCAL_STORAGE_KEYS: {
    JWT_TOKEN: "'jwtToken'",
    REFRESH_TOKEN: "'refreshToken'",
    AUTHED_INFOR: "'AUTHED_INFOR'   # User info JSON",
    USER_ID: "'userId'",
    ROLE: "'role'",
    DISPLAY_NAME: "'displayName'",
    CURRENT_LOCATION_ID: "'currentLocationId'",
    CURRENT_MODEL_ID: "'currentModelId'"
  }
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_INTERCEPTOR_LOOP: "Never use axiosClient for refresh call — use raw axios to avoid interceptor",
  NO_MULTIPLE_REFRESH: "Never allow concurrent refresh calls — use isRefreshing + queue",
  NO_EXPIRED_TOKEN: "Never send expired token — check expiration before attaching",
  NO_HARDCODED_URL: "Never hardcode API URL — always use REACT_APP_API_ENDPOINT",
  NO_SILENT_401: "Never swallow 401 — either refresh or redirect to login"
}
```
