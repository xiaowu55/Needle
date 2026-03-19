import webpush from "web-push";
import type { StoredPushSubscription } from "@/lib/push-store";

type DateParts = {
  weekday: number;
  hour: number;
  minute: number;
  dateKey: string;
};

const DAILY_WEEKLY_GRACE_MINUTES = 30;

function getDateParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[parts.weekday] ?? 0,
    hour: Number.parseInt(parts.hour, 10),
    minute: Number.parseInt(parts.minute, 10),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function getPushPublicKey() {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "";
}

export function hasPushConfiguration() {
  return Boolean(
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY &&
      process.env.WEB_PUSH_VAPID_PRIVATE_KEY &&
      process.env.WEB_PUSH_SUBJECT,
  );
}

function configureWebPush() {
  if (!hasPushConfiguration()) {
    throw new Error("Missing WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, or WEB_PUSH_SUBJECT.");
  }

  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT!,
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY!,
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY!,
  );
}

export function isSubscriptionDue(
  subscription: StoredPushSubscription,
  now = new Date(),
) {
  const localNow = getDateParts(now, subscription.schedule.timeZone);
  const currentMinuteOfDay = localNow.hour * 60 + localNow.minute;
  const scheduledMinuteOfDay =
    subscription.schedule.hour * 60 + subscription.schedule.minute;

  if (
    subscription.schedule.frequency !== "interval" &&
    subscription.lastSentLocalDateKey === localNow.dateKey
  ) {
    return {
      due: false,
      localDateKey: localNow.dateKey,
    };
  }

  if (subscription.schedule.frequency === "interval") {
    const intervalHours = subscription.schedule.intervalHours ?? 6;

    if (!subscription.lastSentAt) {
      return {
        due: true,
        localDateKey: localNow.dateKey,
      };
    }

    const elapsedMs = now.getTime() - new Date(subscription.lastSentAt).getTime();
    const intervalMs = intervalHours * 60 * 60 * 1000;

    return {
      due: elapsedMs >= intervalMs,
      localDateKey: localNow.dateKey,
    };
  }

  const withinGraceWindow =
    currentMinuteOfDay >= scheduledMinuteOfDay &&
    currentMinuteOfDay <= scheduledMinuteOfDay + DAILY_WEEKLY_GRACE_MINUTES;

  if (!withinGraceWindow) {
    return {
      due: false,
      localDateKey: localNow.dateKey,
    };
  }

  if (
    subscription.schedule.frequency === "weekly" &&
    localNow.weekday !== subscription.schedule.weekday
  ) {
    return {
      due: false,
      localDateKey: localNow.dateKey,
    };
  }

  return {
    due: true,
    localDateKey: localNow.dateKey,
  };
}

export async function sendPushNotification(
  subscription: StoredPushSubscription,
  payload: Record<string, unknown>,
) {
  configureWebPush();

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    JSON.stringify(payload),
  );
}
