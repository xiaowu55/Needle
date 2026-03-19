import webpush from "web-push";
import albums from "../data/albums.json";

const DAILY_WEEKLY_GRACE_MINUTES = 30;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function textResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "text/plain; charset=utf-8");

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(body, {
    ...init,
    headers,
  });
}

function emptyResponse(status = 204) {
  return new Response(null, {
    status,
    headers: CORS_HEADERS,
  });
}

function hasPushConfiguration(env) {
  return Boolean(
    env.WEB_PUSH_VAPID_PUBLIC_KEY &&
      env.WEB_PUSH_VAPID_PRIVATE_KEY &&
      env.WEB_PUSH_SUBJECT,
  );
}

function getDateParts(date, timeZone) {
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

  const weekdayMap = {
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

function hashDateKey(dateKey) {
  return dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
}

function getAlbumForDate(date = new Date(), timeZone = "UTC") {
  if (!Array.isArray(albums) || albums.length === 0) {
    throw new Error("Album list is empty.");
  }

  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const index = hashDateKey(dateKey) % albums.length;

  return {
    album: albums[index],
    dateKey,
    index,
  };
}

function getAlbumDetailHref(rank) {
  return `/albums/${rank}`;
}

function normalizeSchedule(input) {
  const [hour, minute] = String(input.time || "09:00")
    .split(":")
    .map((value) => Number.parseInt(value, 10));

  return {
    frequency: input.frequency,
    hour,
    minute,
    weekday: input.frequency === "weekly" ? input.weekday ?? 1 : null,
    intervalHours: input.frequency === "interval" ? input.intervalHours ?? 6 : null,
    timeZone: input.timeZone,
  };
}

function rowToSubscription(row) {
  if (!row) {
    return null;
  }

  return {
    endpoint: row.endpoint,
    keys: {
      auth: row.auth,
      p256dh: row.p256dh,
    },
    schedule: {
      frequency: row.frequency,
      hour: row.hour,
      minute: row.minute,
      weekday: row.weekday ?? undefined,
      intervalHours: row.interval_hours ?? undefined,
      timeZone: row.time_zone,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSentLocalDateKey: row.last_sent_local_date_key ?? undefined,
    lastSentAt: row.last_sent_at ?? undefined,
    sentCount: row.sent_count,
  };
}

function isSubscriptionDue(subscription, now = new Date()) {
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

function configureWebPush(env) {
  if (!hasPushConfiguration(env)) {
    throw new Error("Missing WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, or WEB_PUSH_SUBJECT.");
  }

  webpush.setVapidDetails(
    env.WEB_PUSH_SUBJECT,
    env.WEB_PUSH_VAPID_PUBLIC_KEY,
    env.WEB_PUSH_VAPID_PRIVATE_KEY,
  );
}

async function sendPushNotification(env, subscription, payload) {
  configureWebPush(env);

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    JSON.stringify(payload),
  );
}

async function getPushSubscriptionByEndpoint(db, endpoint) {
  const result = await db
    .prepare(
      `SELECT *
       FROM push_subscriptions
       WHERE endpoint = ?1`,
    )
    .bind(endpoint)
    .first();

  return rowToSubscription(result);
}

async function listPushSubscriptions(db) {
  const result = await db
    .prepare(
      `SELECT *
       FROM push_subscriptions
       ORDER BY created_at ASC`,
    )
    .all();

  return (result.results || []).map((row) => rowToSubscription(row)).filter(Boolean);
}

async function upsertPushSubscription(db, subscription) {
  const existing = await getPushSubscriptionByEndpoint(db, subscription.endpoint);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO push_subscriptions (
         endpoint, auth, p256dh, frequency, hour, minute, weekday, interval_hours, time_zone,
         created_at, updated_at, last_sent_local_date_key, last_sent_at, sent_count
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
       ON CONFLICT(endpoint) DO UPDATE SET
         auth = excluded.auth,
         p256dh = excluded.p256dh,
         frequency = excluded.frequency,
         hour = excluded.hour,
         minute = excluded.minute,
         weekday = excluded.weekday,
         interval_hours = excluded.interval_hours,
         time_zone = excluded.time_zone,
         updated_at = excluded.updated_at,
         last_sent_local_date_key = excluded.last_sent_local_date_key,
         last_sent_at = excluded.last_sent_at,
         sent_count = excluded.sent_count`,
    )
    .bind(
      subscription.endpoint,
      subscription.keys.auth,
      subscription.keys.p256dh,
      subscription.schedule.frequency,
      subscription.schedule.hour,
      subscription.schedule.minute,
      subscription.schedule.weekday ?? null,
      subscription.schedule.intervalHours ?? null,
      subscription.schedule.timeZone,
      existing?.createdAt || now,
      now,
      existing?.lastSentLocalDateKey ?? null,
      existing?.lastSentAt ?? null,
      existing?.sentCount ?? 0,
    )
    .run();

  return getPushSubscriptionByEndpoint(db, subscription.endpoint);
}

async function removePushSubscription(db, endpoint) {
  await db.prepare("DELETE FROM push_delivery_history WHERE endpoint = ?1").bind(endpoint).run();
  await db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?1").bind(endpoint).run();
}

async function markPushSubscriptionSent(db, endpoint, localDateKey) {
  const deliveredAt = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO push_delivery_history (
         endpoint, local_date_key, delivered_at, delivery_count
       ) VALUES (?1, ?2, ?3, 1)
       ON CONFLICT(endpoint, local_date_key) DO UPDATE SET
         delivered_at = excluded.delivered_at,
         delivery_count = push_delivery_history.delivery_count + 1`,
    )
    .bind(endpoint, localDateKey, deliveredAt)
    .run();

  await db
    .prepare(
      `UPDATE push_subscriptions
       SET last_sent_local_date_key = ?1,
           last_sent_at = ?2,
           updated_at = ?2,
           sent_count = sent_count + 1
       WHERE endpoint = ?3`,
    )
    .bind(localDateKey, deliveredAt, endpoint)
    .run();
}

async function listRecentPushDeliveryHistory(db, endpoint, limit = 30) {
  const result = await db
    .prepare(
      `SELECT endpoint, local_date_key, delivered_at, delivery_count
       FROM push_delivery_history
       WHERE endpoint = ?1
       ORDER BY local_date_key DESC
       LIMIT ?2`,
    )
    .bind(endpoint, limit)
    .all();

  return (result.results || []).reverse().map((row) => ({
    endpoint: row.endpoint,
    localDateKey: row.local_date_key,
    deliveredAt: row.delivered_at,
    deliveryCount: row.delivery_count,
  }));
}

async function handlePushPublicKey(env) {
  return jsonResponse({
    publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY || "",
    configured: hasPushConfiguration(env),
  });
}

async function handlePushStatus(request, env) {
  const body = await request.json();
  const endpoint = body?.endpoint;

  if (!endpoint) {
    return jsonResponse({
      enabled: false,
      endpointKnown: false,
      sentCount: 0,
      schedule: null,
      deliveryHistory: [],
    });
  }

  const subscription = await getPushSubscriptionByEndpoint(env.DB, endpoint);

  if (!subscription) {
    return jsonResponse({
      enabled: false,
      endpointKnown: false,
      sentCount: 0,
      schedule: null,
      deliveryHistory: [],
    });
  }

  const history = await listRecentPushDeliveryHistory(env.DB, endpoint, 30);

  return jsonResponse({
    enabled: true,
    endpointKnown: true,
    sentCount: subscription.sentCount,
    schedule: subscription.schedule,
    deliveryHistory: history.map((entry) => ({
      dateKey: entry.localDateKey,
      count: entry.deliveryCount,
    })),
  });
}

async function handlePushSubscriptionSave(request, env) {
  const body = await request.json();
  const endpoint = body?.subscription?.endpoint;
  const auth = body?.subscription?.keys?.auth;
  const p256dh = body?.subscription?.keys?.p256dh;

  if (!endpoint || !auth || !p256dh) {
    return jsonResponse({ error: "Invalid subscription." }, { status: 400 });
  }

  const subscription = await upsertPushSubscription(env.DB, {
    endpoint,
    keys: { auth, p256dh },
    schedule: normalizeSchedule(body.schedule),
  });

  return jsonResponse({
    ok: true,
    subscription,
  });
}

async function handlePushSubscriptionDelete(request, env) {
  const body = await request.json();
  const endpoint = body?.endpoint;

  if (!endpoint) {
    return jsonResponse({ error: "Missing endpoint." }, { status: 400 });
  }

  await removePushSubscription(env.DB, endpoint);
  return jsonResponse({ ok: true });
}

async function runPushNotifications(env, authHeader) {
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPushConfiguration(env)) {
    return jsonResponse({
      ok: false,
      skipped: true,
      reason: "Missing Web Push configuration.",
    });
  }

  const subscriptions = await listPushSubscriptions(env.DB);
  const results = [];

  for (const subscription of subscriptions) {
    const dueResult = isSubscriptionDue(subscription, new Date());

    if (!dueResult.due) {
      continue;
    }

    const { album } = getAlbumForDate(new Date(), subscription.schedule.timeZone);
    const payload = {
      title: `继续听 ${album.album}`,
      body: `${album.artist} · #${album.rank} · 点开继续读这张专辑`,
      icon: `${env.APP_URL.replace(/\/$/, "")}/apple-icon`,
      badge: `${env.APP_URL.replace(/\/$/, "")}/apple-icon`,
      url: `${env.APP_URL.replace(/\/$/, "")}${getAlbumDetailHref(album.rank)}`,
      tag: `needle-${album.rank}`,
    };

    try {
      await sendPushNotification(env, subscription, payload);
      await markPushSubscriptionSent(env.DB, subscription.endpoint, dueResult.localDateKey);
      results.push({
        endpoint: subscription.endpoint,
        status: "sent",
        album: `${album.artist} - ${album.album}`,
      });
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 0;

      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(env.DB, subscription.endpoint);
      }

      results.push({
        endpoint: subscription.endpoint,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return jsonResponse({
    ok: true,
    checked: subscriptions.length,
    results,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return emptyResponse();
    }

    try {
      if (url.pathname === "/health") {
        return textResponse("ok");
      }

      if (url.pathname === "/trigger") {
        return runPushNotifications(env, request.headers.get("authorization"));
      }

      if (url.pathname === "/api/push/public-key" && request.method === "GET") {
        return handlePushPublicKey(env);
      }

      if (url.pathname === "/api/push/status" && request.method === "POST") {
        return handlePushStatus(request, env);
      }

      if (url.pathname === "/api/push/subscriptions" && request.method === "POST") {
        return handlePushSubscriptionSave(request, env);
      }

      if (url.pathname === "/api/push/subscriptions" && request.method === "DELETE") {
        return handlePushSubscriptionDelete(request, env);
      }

      if (url.pathname === "/api/cron/push-notifications") {
        return runPushNotifications(env, request.headers.get("authorization"));
      }

      return textResponse("Not found", { status: 404 });
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      runPushNotifications(env, `Bearer ${env.CRON_SECRET}`).catch((error) => {
        console.error("Needle Worker cron failed:", error instanceof Error ? error.message : error);
      }),
    );
  },
};
