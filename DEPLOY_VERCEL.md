# Deploy on Vercel with GitHub Actions cron

This setup avoids Vercel Pro cron limits:

- Vercel hosts the app
- GitHub Actions triggers `/api/cron/push-notifications`
- Web Push logic still runs inside your deployed app

## 1. Push the repo to GitHub

This workspace is currently not a Git repository, so create the GitHub repo from your own account and push it from your machine.

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
WEB_PUSH_SUBJECT=mailto:you@example.com
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## 4. Add GitHub Actions secrets

In your GitHub repository settings, add:

- `APP_URL`
  Example: `https://your-project.vercel.app`
- `CRON_SECRET`
  Must match the same value used in Vercel

## 5. What the workflow does

The workflow file is:

`/.github/workflows/push-reminders.yml`

It runs every 15 minutes and calls:

`/api/cron/push-notifications`

That gives you much better reminder timing than Vercel Hobby cron.

## 6. Redis storage for Vercel

For Vercel, push subscriptions and delivery history should use Upstash Redis.

This project now supports that directly through:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If those are set, the app stores push subscriptions and heatmap history in Upstash.
If they are missing, the app falls back to local SQLite for local/self-hosted use.

## 7. Recommended rollout

Use this order:

1. Push repo to GitHub
2. Deploy to Vercel
3. Add env vars
4. Add GitHub Actions secrets
5. Manually run the `Push Reminders` workflow once
6. Test `/settings` and one browser subscription

## 8. Current product behavior

For now the settings UI only exposes:

- 每天
- 每周

The previous `每隔几小时` mode is hidden from the UI.
