import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type PushSchedule = {
  frequency: "daily" | "weekly" | "interval";
  hour: number;
  minute: number;
  weekday?: number;
  intervalHours?: number;
  timeZone: string;
};

export type StoredPushSubscription = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  schedule: PushSchedule;
  createdAt: string;
  updatedAt: string;
  lastSentLocalDateKey?: string;
  lastSentAt?: string;
  sentCount: number;
};

export type PushDeliveryHistoryEntry = {
  endpoint: string;
  localDateKey: string;
  deliveredAt: string;
  deliveryCount: number;
};

type SubscriptionRow = {
  endpoint: string;
  auth: string;
  p256dh: string;
  frequency: PushSchedule["frequency"];
  hour: number;
  minute: number;
  weekday: number | null;
  intervalHours: number | null;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
  lastSentLocalDateKey: string | null;
  lastSentAt: string | null;
  sentCount: number;
};

type DeliveryHistoryRow = {
  endpoint: string;
  localDateKey: string;
  deliveredAt: string;
  deliveryCount: number;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "push-subscriptions.db");
const LEGACY_STORE_FILE = path.join(
  process.env.TMPDIR || "/tmp",
  "album-daily-push-subscriptions.json",
);

let database: DatabaseSync | null = null;

function rowToSubscription(row: SubscriptionRow): StoredPushSubscription {
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
      intervalHours: row.intervalHours ?? undefined,
      timeZone: row.timeZone,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSentLocalDateKey: row.lastSentLocalDateKey || undefined,
    lastSentAt: row.lastSentAt || undefined,
    sentCount: row.sentCount,
  };
}

function migrateLegacyJson(db: DatabaseSync) {
  if (!existsSync(LEGACY_STORE_FILE)) {
    return;
  }

  try {
    const rawValue = readFileSync(LEGACY_STORE_FILE, "utf8");
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return;
    }

    const insert = db.prepare(`
      INSERT INTO push_subscriptions (
        endpoint, auth, p256dh, frequency, hour, minute, weekday, timeZone,
        intervalHours, createdAt, updatedAt, lastSentLocalDateKey, lastSentAt, sentCount
      ) VALUES (
        @endpoint, @auth, @p256dh, @frequency, @hour, @minute, @weekday, @timeZone,
        @intervalHours, @createdAt, @updatedAt, @lastSentLocalDateKey, @lastSentAt, @sentCount
      )
      ON CONFLICT(endpoint) DO UPDATE SET
        auth=excluded.auth,
        p256dh=excluded.p256dh,
        frequency=excluded.frequency,
        hour=excluded.hour,
        minute=excluded.minute,
        weekday=excluded.weekday,
        timeZone=excluded.timeZone,
        intervalHours=excluded.intervalHours,
        updatedAt=excluded.updatedAt,
        lastSentLocalDateKey=excluded.lastSentLocalDateKey,
        lastSentAt=excluded.lastSentAt,
        sentCount=excluded.sentCount;
    `);

    const migrate = (items: StoredPushSubscription[]) => {
      db.exec("BEGIN");

      try {
      for (const item of items) {
        insert.run({
          endpoint: item.endpoint,
          auth: item.keys.auth,
          p256dh: item.keys.p256dh,
          frequency: item.schedule.frequency,
          hour: item.schedule.hour,
          minute: item.schedule.minute,
          weekday: item.schedule.weekday ?? null,
          intervalHours: item.schedule.intervalHours ?? null,
          timeZone: item.schedule.timeZone,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          lastSentLocalDateKey: item.lastSentLocalDateKey || null,
          lastSentAt: null,
          sentCount: item.sentCount ?? (item.lastSentLocalDateKey ? 1 : 0),
        });
      }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    };

    migrate(parsed as StoredPushSubscription[]);
    renameSync(LEGACY_STORE_FILE, `${LEGACY_STORE_FILE}.migrated`);
  } catch {
    // Keep the legacy file in place if migration fails.
  }
}

function getDatabase() {
  if (database) {
    return database;
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);

  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      auth TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      frequency TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      weekday INTEGER,
      intervalHours INTEGER,
      timeZone TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastSentLocalDateKey TEXT,
      lastSentAt TEXT,
      sentCount INTEGER NOT NULL DEFAULT 0
    );
  `);

  const subscriptionColumns = db
    .prepare("PRAGMA table_info(push_subscriptions)")
    .all() as Array<{ name: string }>;

  if (!subscriptionColumns.some((column) => column.name === "intervalHours")) {
    db.exec(`
      ALTER TABLE push_subscriptions
      ADD COLUMN intervalHours INTEGER
    `);
  }

  if (!subscriptionColumns.some((column) => column.name === "lastSentAt")) {
    db.exec(`
      ALTER TABLE push_subscriptions
      ADD COLUMN lastSentAt TEXT
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS push_delivery_history (
      endpoint TEXT NOT NULL,
      localDateKey TEXT NOT NULL,
      deliveredAt TEXT NOT NULL,
      deliveryCount INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (endpoint, localDateKey)
    );
  `);

  const deliveryHistoryColumns = db
    .prepare("PRAGMA table_info(push_delivery_history)")
    .all() as Array<{ name: string }>;

  if (!deliveryHistoryColumns.some((column) => column.name === "deliveryCount")) {
    db.exec(`
      ALTER TABLE push_delivery_history
      ADD COLUMN deliveryCount INTEGER NOT NULL DEFAULT 1
    `);
  }

  migrateLegacyJson(db);
  database = db;
  return database;
}

export async function listPushSubscriptions() {
  const rows = getDatabase()
    .prepare("SELECT * FROM push_subscriptions ORDER BY createdAt ASC")
    .all() as SubscriptionRow[];

  return rows.map(rowToSubscription);
}

export async function upsertPushSubscription(
  subscription: StoredPushSubscription,
) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db
    .prepare(
      "SELECT createdAt, sentCount, lastSentLocalDateKey FROM push_subscriptions WHERE endpoint = ?",
    )
    .get(subscription.endpoint) as
    | {
        createdAt: string;
        sentCount: number;
        lastSentLocalDateKey: string | null;
        lastSentAt: string | null;
      }
    | undefined;

  db.prepare(`
    INSERT INTO push_subscriptions (
      endpoint, auth, p256dh, frequency, hour, minute, weekday, timeZone,
      intervalHours, createdAt, updatedAt, lastSentLocalDateKey, lastSentAt, sentCount
    ) VALUES (
      @endpoint, @auth, @p256dh, @frequency, @hour, @minute, @weekday, @timeZone,
      @intervalHours, @createdAt, @updatedAt, @lastSentLocalDateKey, @lastSentAt, @sentCount
    )
    ON CONFLICT(endpoint) DO UPDATE SET
      auth=excluded.auth,
      p256dh=excluded.p256dh,
      frequency=excluded.frequency,
      hour=excluded.hour,
      minute=excluded.minute,
      weekday=excluded.weekday,
      timeZone=excluded.timeZone,
      intervalHours=excluded.intervalHours,
      updatedAt=excluded.updatedAt,
      lastSentLocalDateKey=excluded.lastSentLocalDateKey,
      lastSentAt=excluded.lastSentAt,
      sentCount=excluded.sentCount;
  `).run({
    endpoint: subscription.endpoint,
    auth: subscription.keys.auth,
    p256dh: subscription.keys.p256dh,
    frequency: subscription.schedule.frequency,
    hour: subscription.schedule.hour,
    minute: subscription.schedule.minute,
    weekday: subscription.schedule.weekday ?? null,
    intervalHours: subscription.schedule.intervalHours ?? null,
    timeZone: subscription.schedule.timeZone,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastSentLocalDateKey: existing?.lastSentLocalDateKey || null,
    lastSentAt: existing?.lastSentAt || null,
    sentCount: existing?.sentCount || 0,
  });

  const row = db
    .prepare("SELECT * FROM push_subscriptions WHERE endpoint = ?")
    .get(subscription.endpoint) as SubscriptionRow;

  return rowToSubscription(row);
}

export async function removePushSubscription(endpoint: string) {
  getDatabase()
    .prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
    .run(endpoint);
}

export async function markPushSubscriptionSent(
  endpoint: string,
  localDateKey: string,
) {
  const db = getDatabase();
  const deliveredAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO push_delivery_history (
      endpoint, localDateKey, deliveredAt, deliveryCount
    ) VALUES (?, ?, ?, 1)
    ON CONFLICT(endpoint, localDateKey) DO UPDATE SET
      deliveredAt = excluded.deliveredAt,
      deliveryCount = push_delivery_history.deliveryCount + 1
  `).run(endpoint, localDateKey, deliveredAt);

  db.prepare(`
    UPDATE push_subscriptions
    SET lastSentLocalDateKey = ?,
        lastSentAt = ?,
        updatedAt = ?,
        sentCount = sentCount + 1
    WHERE endpoint = ?
  `).run(localDateKey, deliveredAt, deliveredAt, endpoint);
}

export async function getPushSubscriptionByEndpoint(endpoint: string) {
  const row = getDatabase()
    .prepare("SELECT * FROM push_subscriptions WHERE endpoint = ?")
    .get(endpoint) as SubscriptionRow | undefined;

  return row ? rowToSubscription(row) : null;
}

export async function removeAllPushSubscriptions() {
  getDatabase().prepare("DELETE FROM push_subscriptions").run();
  if (existsSync(LEGACY_STORE_FILE)) {
    unlinkSync(LEGACY_STORE_FILE);
  }
}

export async function listRecentPushDeliveryHistory(
  endpoint: string,
  limit = 30,
) {
  const rows = getDatabase()
    .prepare(`
      SELECT endpoint, localDateKey, deliveredAt
           , deliveryCount
      FROM push_delivery_history
      WHERE endpoint = ?
      ORDER BY localDateKey DESC
      LIMIT ?
    `)
    .all(endpoint, limit) as DeliveryHistoryRow[];

  return rows.reverse().map((row) => ({
    endpoint: row.endpoint,
    localDateKey: row.localDateKey,
    deliveredAt: row.deliveredAt,
    deliveryCount: row.deliveryCount,
  })) satisfies PushDeliveryHistoryEntry[];
}
