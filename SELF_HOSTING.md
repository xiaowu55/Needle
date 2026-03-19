# Self-host on a VPS

This project works well on a single cloud server with:

- `Node.js 23+`
- `bun`
- `pm2`
- `caddy`
- a real domain with HTTPS

## 1. Prepare the server

Install the basics:

```bash
curl -fsSL https://deb.nodesource.com/setup_23.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g bun pm2
sudo apt-get install -y caddy
```

Confirm versions:

```bash
node -v
bun -v
pm2 -v
caddy version
```

`node:sqlite` is used by the app, so do not deploy this with an older Node runtime.

## 2. Clone and install

```bash
git clone <your-repo-url> album-daily
cd album-daily
bun install
```

## 3. Configure environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Fill at least:

```env
ALBUM_TIMEZONE=Asia/Shanghai
CRON_SECRET=replace-with-a-long-random-secret
WEB_PUSH_SUBJECT=mailto:you@example.com
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
```

## 4. Build and run with PM2

```bash
bun run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs album-daily
pm2 restart album-daily
```

The app listens on `127.0.0.1:3000`. SQLite data stays on disk under `data/push-subscriptions.db`.

## 5. Put Caddy in front

Copy the example file and replace the domain:

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudoedit /etc/caddy/Caddyfile
```

Then reload:

```bash
sudo systemctl reload caddy
```

Caddy will provision HTTPS automatically once DNS points to the server.

## 6. Add cron for push delivery checks

Edit cron:

```bash
crontab -e
```

Add the example job from `deploy/album-daily.crontab.example` and replace:

- `REPLACE_WITH_CRON_SECRET`
- `https://your-domain.com`

The example runs every 15 minutes so daily, weekly, and interval-based reminders all have a chance to fire on time.

## 7. Verify production

Open your site over `https://`.

Check these flows:

1. Open `/settings`
2. Enable push permission
3. Save a reminder schedule
4. Trigger the cron route manually:

```bash
curl -H "Authorization: Bearer <your-secret>" \
  https://your-domain.com/api/cron/push-notifications
```

5. Confirm the push arrives
6. Confirm the heatmap updates on `/settings`

## Notes

- Self-hosting keeps push subscriptions in local SQLite on the same server.
- Hosted deployments should prefer the Cloudflare Worker + D1 push backend instead.
- PWA install and Web Push both work much more reliably behind real HTTPS than on LAN IPs.
