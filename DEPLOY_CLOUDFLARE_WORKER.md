# Deploy reminder cron with Cloudflare Workers

This is the recommended timing setup for Needle if you want push reminders to feel
closer to real-time.

- Vercel still hosts the Next.js app and sends the Web Push notification
- Upstash Redis still stores subscriptions and delivery history
- Cloudflare Workers Cron runs every minute and triggers the Vercel push endpoint

This removes the biggest weakness in the GitHub Actions setup: reminders are no
longer limited to a 15-minute polling interval.

## 1. Keep the Vercel app as-is

Your Vercel project should still have these environment variables:

```env
ALBUM_TIMEZONE=Asia/Shanghai
CRON_SECRET=replace-with-a-long-random-secret
WEB_PUSH_SUBJECT=mailto:you@example.com
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

`CRON_SECRET` is the important bridge here. The Worker will call the Vercel route
using that bearer token.

## 2. Create a new Worker

In Cloudflare, create a Worker dedicated to reminder scheduling.

The repo already includes a minimal Worker under:

- [`cloudflare/worker.js`](./cloudflare/worker.js)
- [`cloudflare/wrangler.toml.example`](./cloudflare/wrangler.toml.example)

Copy the example config to `cloudflare/wrangler.toml` locally before deployment.

## 3. Configure Worker variables

Set:

```env
APP_URL=https://your-project.vercel.app
```

Then add the secret:

```bash
wrangler secret put CRON_SECRET
```

Use the exact same value as the `CRON_SECRET` in Vercel.

## 4. Cron trigger

The sample `wrangler.toml` uses:

```toml
[triggers]
crons = ["* * * * *"]
```

That means Cloudflare will trigger the Worker every minute.

The Worker then calls:

`/api/cron/push-notifications`

on your Vercel deployment.

## 5. Deploy

From the `cloudflare` directory:

```bash
wrangler deploy
```

## 6. Manual verification

After deployment, you can test the Worker manually:

```bash
curl https://your-worker.workers.dev/trigger
```

And you can still inspect the Vercel endpoint directly:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/cron/push-notifications
```

## 7. Recommended cleanup

Once the Worker cron is live, disable the GitHub Actions cron workflow. Running both
at the same time is unnecessary and makes timing harder to reason about.

## 8. Why this is better than GitHub Actions

- Cron checks happen every minute instead of every 15 minutes
- Trigger timing is much closer to the reminder time users choose
- You keep the current Vercel + Upstash push backend without rewriting it

For this project size, that is the best tradeoff between reliability and complexity.
