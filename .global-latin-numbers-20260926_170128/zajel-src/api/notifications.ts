import { api } from "./client";

export async function getNotifications() {
  const response = await api.get("/notifications");
  return response.data;
}

export async function markNotificationRead(
  id: string
) {
  const response = await api.patch(
    `/notifications/${id}/read`
  );
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch(
    "/notifications/read-all"
  );
  return response.data;
}
