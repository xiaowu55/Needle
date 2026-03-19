CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  frequency TEXT NOT NULL,
  hour INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  weekday INTEGER,
  interval_hours INTEGER,
  time_zone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_sent_local_date_key TEXT,
  last_sent_at TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS push_delivery_history (
  endpoint TEXT NOT NULL,
  local_date_key TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  delivery_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (endpoint, local_date_key)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_schedule
ON push_subscriptions (frequency, hour, minute, weekday, time_zone);

CREATE INDEX IF NOT EXISTS idx_push_delivery_history_endpoint
ON push_delivery_history (endpoint, local_date_key DESC);
