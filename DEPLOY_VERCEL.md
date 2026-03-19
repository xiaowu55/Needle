# Deploy on Vercel with Cloudflare push worker

This is the current hosted setup:

- Vercel hosts the app
- Cloudflare Worker stores subscriptions, runs cron, and sends Web Push
- Vercel proxies `/api/push/*` and `/api/cron/push-notifications` to the Worker

## 1. Push the repo to GitHub

Push the repo to your GitHub account and import it into Vercel.

## 2. Import into Vercel

In Vercel:

1. Add New Project
2. Import the GitHub repository
3. Deploy as a Next.js project

## 3. Add Vercel environment variables

Set these in the Vercel dashboard:

```env
ALBUM_TIMEZONE=Asia/Shanghai
CRON_SECRET=replace-with-a-long-random-secret
PUSH_WORKER_API_URL=https://needle-push-cron.<your-subdomain>.workers.dev
```

`CRON_SECRET` must match the Cloudflare Worker secret with the same name.

## 4. Deploy the Cloudflare push worker

Follow [`DEPLOY_CLOUDFLARE_WORKER.md`](./DEPLOY_CLOUDFLARE_WORKER.md) to deploy:

- `needle-push-cron`
- `needle-push` D1
- the per-minute cron trigger

## 5. Recommended rollout

Use this order:

1. Push repo to GitHub
2. Deploy to Vercel
3. Add Vercel env vars
4. Deploy the Cloudflare push worker
5. Re-deploy Vercel so `PUSH_WORKER_API_URL` is available
6. Test `/settings` and one browser subscription

## 6. Current product behavior

For now the settings UI only exposes:

- 每天
- 每周

The previous `每隔几小时` mode is hidden from the UI.
