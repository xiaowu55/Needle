# Needle

A minimal Next.js MVP for daily classic album discovery.

## What it does

- Loads album data from a local JSON file
- Picks one album per day deterministically
- Renders the album on a simple web page
- Shows album cover artwork with a fallback image
- Exposes a JSON endpoint for the current selection
- Includes a compact widget-style view for embedding or mobile shortcut use
- Includes a ready-to-paste Scriptable widget script for iPhone
- Includes Web Push subscription settings for PWA reminders

## Run locally

```bash
bun install
bun run dev
```

Then open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values you need.

- `ALBUM_TIMEZONE`: timezone used to determine "today"
- `CRON_SECRET`: bearer token for the cron endpoint
- `WEB_PUSH_SUBJECT`: contact URI for VAPID, usually `mailto:you@example.com`
- `WEB_PUSH_VAPID_PUBLIC_KEY`: public key used by the browser PushManager
- `WEB_PUSH_VAPID_PRIVATE_KEY`: private key used by the server to send pushes

## Routes

- `/` renders the current album
- `/settings` controls push reminder time and frequency
- `/widget` renders a compact widget-style card
- `/api/album` returns the current album as JSON
- `/api/cron/push-notifications` checks schedules and sends due web push notifications

## Scriptable widget

The fastest iPhone widget path is the Scriptable script at
`scriptable/album-daily-widget.js`.

Steps:

1. Deploy the app so your phone can reach it.
2. Replace `BASE_URL` in the Scriptable file with your deployed URL.
3. Paste the script into the Scriptable app on iPhone.
4. Add a small Scriptable widget and select this script.

## Notes

The app now ships with the full 500-album dataset in `data/albums.json`.

Push subscriptions are persisted in a local SQLite database under `data/push-subscriptions.db`.

For a single VPS deployment, use the self-hosting guide:
[`SELF_HOSTING.md`](./SELF_HOSTING.md)

For Vercel hosting with GitHub Actions triggering reminder checks:
[`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md)

## Local push test

1. Start the app with `bun run dev`.
2. Open `http://localhost:3000/settings`.
3. Allow notification permission and save a reminder schedule.
4. Manually trigger the cron route:

```bash
curl -H "Authorization: Bearer album-daily-local-secret" \
  http://127.0.0.1:3000/api/cron/push-notifications
```

5. If the current local time matches the saved schedule, the browser should receive a notification.
6. To avoid stale endpoints during testing, disable the reminder once and subscribe again before re-running the cron route.
