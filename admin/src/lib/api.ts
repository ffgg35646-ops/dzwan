import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const ACCESS_TOKEN_KEY = "dzwan_access_token";

export function getStoredAccessToken(): string | null {
  if (!import.meta.env.DEV) return null;

  try {
    return window.localStorage.getItem(
      ACCESS_TOKEN_KEY,
    );
  } catch {
    return null;
  }
}

export function setAccessToken(
  token: string | null,
): void {
  if (!import.meta.env.DEV) return;

  try {
    if (token) {
      window.localStorage.setItem(
        ACCESS_TOKEN_KEY,
        token,
      );
    } else {
      window.localStorage.removeItem(
        ACCESS_TOKEN_KEY,
      );
    }
  } catch {
    // Ignore localStorage errors.
  }
}

const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || "/api")
  : "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    const url = config.url || "";

    if (
      token &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/logout")
    ) {
      config.headers = config.headers ?? {};
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

type RetryConfig =
  InternalAxiosRequestConfig & {
    _retry?: boolean;
  };

let refreshPromise: Promise<unknown> | null = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "حدث خطأ مؤقت. حاول مرة أخرى.",
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return "تعذر الاتصال بالخدمة حاليًا.";
  }

  const status = error.response.status;

  if (status === 401) {
    return "انتهت جلسة الدخول.";
  }

  if (status === 403) {
    return "ليس لديك صلاحية لتنفيذ هذه العملية.";
  }

  if (
    status === 400 ||
    status === 409 ||
    status === 422
  ) {
    return "تعذر تنفيذ العملية بالبيانات الحالية.";
  }

  if (status === 404) {
    return "البيانات المطلوبة غير موجودة.";
  }

  if (status >= 500) {
    return "حدث خطأ مؤقت في الخدمة.";
  }

  return fallback;
}

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const status = error.response?.status;

    const originalRequest =
      error.config as RetryConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      const url =
        originalRequest.url || "";

      if (
        !url.includes("/auth/login") &&
        !url.includes("/auth/refresh") &&
        !url.includes("/auth/logout")
      ) {
        originalRequest._retry = true;

        try {
          const refreshResponse: any =
            await refreshSession();

          const refreshedToken =
            refreshResponse?.data?.accessToken;

          if (
            typeof refreshedToken ===
              "string" &&
            refreshedToken
          ) {
            setAccessToken(
              refreshedToken,
            );
          }

          return api(originalRequest);
        } catch (refreshError) {
          console.error(
            "Session refresh failed:",
            refreshError,
          );

          setAccessToken(null);
          window.location.assign("/");

          return Promise.reject(error);
        }
      }
    }

    if (status === 403) {
      console.error(
        "===== DZWAN 403 =====",
        {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status,
          response:
            error.response?.data,
        },
      );
    }

    console.error(
      "API request failed:",
      error,
    );

    return Promise.reject(error);
  },
);
