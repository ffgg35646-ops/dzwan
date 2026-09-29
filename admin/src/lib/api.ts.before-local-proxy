
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const apiUrl =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:4000/api";

export const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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
          await refreshSession();
          return api(originalRequest);
        } catch (refreshError) {
          console.error(
            "Session refresh failed:",
            refreshError,
          );

          window.location.assign("/");
          return Promise.reject(error);
        }
      }
    }

    console.error(
      "API request failed:",
      error,
    );

    return Promise.reject(error);
  },
);
