import { PushDeviceModel } from "../models/PushDevice.js";

const EXPO_PUSH_URL =
  "https://exp.host/--/api/v2/push/send";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

async function sendExpoPushBatch(
  tokens: string[],
  payload: PushPayload
) {
  if (tokens.length === 0) {
    return {
      devices: 0,
      sent: 0,
      failed: 0,
    };
  }

  const uniqueTokens = [
    ...new Set(
      tokens
        .map((token) => String(token).trim())
        .filter(Boolean)
    ),
  ];

  let sent = 0;
  let failed = 0;

  for (const batch of chunks(uniqueTokens, 100)) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          batch.map((token) => ({
            to: token,
            sound: "default",
            title: payload.title,
            body: payload.body,
            badge: 1,
            data: payload.data || {},
          }))
        ),
      });

      const result = await response.json() as any;

      if (!response.ok) {
        failed += batch.length;

        console.error(
          "Expo push HTTP error:",
          response.status,
          result
        );

        continue;
      }

      const tickets = Array.isArray(result?.data)
        ? result.data
        : [];

      for (let i = 0; i < batch.length; i++) {
        const ticket = tickets[i];

        if (ticket?.status === "ok") {
          sent++;
          continue;
        }

        failed++;
      }
    } catch (error) {
      failed += batch.length;

      console.error(
        "Expo push request error:",
        error
      );
    }
  }

  return {
    devices: uniqueTokens.length,
    sent,
    failed,
  };
}

export async function sendExpoPushToTokens(
  tokens: string[],
  payload: PushPayload
) {
  return sendExpoPushBatch(tokens, payload);
}

export async function sendExpoPushToUsers(
  userIds: string[],
  payload: PushPayload
) {
  if (userIds.length === 0) {
    return {
      devices: 0,
      sent: 0,
      failed: 0,
    };
  }

  const devices = await PushDeviceModel.find(
    {
      userId: {
        $in: userIds,
      },
    },
    {
      token: 1,
    }
  ).lean();

  return sendExpoPushBatch(
    devices.map((device) => device.token),
    payload
  );
}
