# Deploy reminder cron with Cloudflare Workers

This is the recommended push backend for Needle.

- Vercel still hosts the Next.js app and PWA shell
- Cloudflare Worker stores subscriptions, runs cron, and sends Web Push
- Cloudflare D1 stores subscriptions and delivery history

This removes the two biggest weaknesses in the old setup:

- reminders are no longer limited to a 15-minute GitHub Actions polling interval
- push state no longer depends on Upstash Redis or Vercel-side cron logic

## 1. Keep the Vercel app as-is

Your Vercel project should still have these environment variables for the web app:

```env
ALBUM_TIMEZONE=Asia/Shanghai
CRON_SECRET=replace-with-a-long-random-secret
PUSH_WORKER_API_URL=https://your-worker.workers.dev
```

Once `PUSH_WORKER_API_URL` is set, the Next.js `/api/push/*` routes proxy to the
Worker automatically, so the front-end UI does not need to change.

## 2. Create a new Worker

In Cloudflare, create:

- one Worker
- one D1 database

The repo includes the Worker and schema under:

- [`cloudflare/worker.js`](./cloudflare/worker.js)
- [`cloudflare/wrangler.toml.example`](./cloudflare/wrangler.toml.example)
- [`cloudflare/schema.sql`](./cloudflare/schema.sql)

Copy the example config to `cloudflare/wrangler.toml` locally before deployment.

## 3. Configure Worker variables

Set Worker vars:

```env
APP_URL=https://your-project.vercel.app
WEB_PUSH_SUBJECT=mailto:you@example.com
WEB_PUSH_VAPID_PUBLIC_KEY=...
```

Then add Worker secrets:

```bash
wrangler secret put CRON_SECRET
wrangler secret put WEB_PUSH_VAPID_PRIVATE_KEY
```

## 4. Cron trigger

The sample `wrangler.toml` uses a per-minute cron:

```toml
[triggers]
crons = ["* * * * *"]
```

That means Cloudflare will trigger the Worker every minute.

The Worker itself decides which subscriptions are due and sends the pushes.

## 5. Deploy

Create the D1 database:

```bash
wrangler d1 create needle-push
```

Copy the returned `database_id` into `cloudflare/wrangler.toml`, then apply the schema:

```bash
wrangler d1 execute needle-push --remote --file=./schema.sql
```

Then deploy from the `cloudflare` directory:

```bash
wrangler deploy
```

## 6. Manual verification

After deployment, you can test the Worker manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-worker.workers.dev/trigger
```

And you can still inspect the Vercel proxy endpoint directly:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/cron/push-notifications
```

## 7. Recommended cleanup

Once the Worker cron is live:

- remove any obsolete cron setup from your hosting platform
- remove any old push-storage env vars you no longer use

## 8. Why this is better than GitHub Actions

- Cron checks happen every minute instead of every 15 minutes
- Trigger timing is much closer to the reminder time users choose
- Subscription state lives in D1 instead of Redis plus Vercel route state

For this project size, that is the best tradeoff between reliability and complexity.
