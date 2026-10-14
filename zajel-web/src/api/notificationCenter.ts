import * as clientModule from "./client";

const client: any =
  (clientModule as any).client ??
  (clientModule as any).apiClient ??
  (clientModule as any).axiosClient ??
  (clientModule as any).default;

if (!client) {
  throw new Error("لم يتم العثور على API client داخل src/api/client.ts");
}


export type AppNotification = {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
};

export async function getMyNotifications(): Promise<AppNotification[]> {
  const candidates = [
    "/notifications",
    "/notifications/my",
    "/requirements-30-46/notifications",
  ];

  for (const path of candidates) {
    try {
      const res = await client.get(path);
      const data = res.data?.data ?? res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.notifications)) return data.notifications;
    } catch {
      // جرّب المسار التالي
    }
  }

  return [];
}

export async function markNotificationRead(id: string) {
  const candidates = [
    `/notifications/${id}/read`,
    `/notifications/${id}`,
  ];

  for (const path of candidates) {
    try {
      return await client.patch(path, { read: true });
    } catch {
      // تابع
    }
  }

  return null;
}
