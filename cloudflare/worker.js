async function triggerPushCheck(env) {
  if (!env.APP_URL) {
    throw new Error("Missing APP_URL.");
  }

  if (!env.CRON_SECRET) {
    throw new Error("Missing CRON_SECRET.");
  }

  const response = await fetch(`${env.APP_URL.replace(/\/$/, "")}/api/cron/push-notifications`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "User-Agent": "needle-cloudflare-cron",
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Push check failed: ${response.status} ${body}`);
  }

  return body;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    if (url.pathname === "/trigger") {
      try {
        const body = await triggerPushCheck(env);
        return new Response(body, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json; charset=utf-8",
            },
          },
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      triggerPushCheck(env).catch((error) => {
        console.error(
          "Needle Cloudflare cron failed:",
          error instanceof Error ? error.message : error,
        );
      }),
    );
  },
};
