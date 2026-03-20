import { NextRequest, NextResponse } from "next/server";
import { getAlbumDetailHref, getAlbumForSequence } from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";
import { hasPushConfiguration, isSubscriptionDue, sendPushNotification } from "@/lib/push";
import {
  listPushSubscriptions,
  markPushSubscriptionSent,
  removePushSubscription,
} from "@/lib/push-store";
import { hasPushWorkerProxy, proxyPushWorkerRequest } from "@/lib/push-worker-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (hasPushWorkerProxy()) {
    const response = await proxyPushWorkerRequest("/api/cron/push-notifications", {
      method: "GET",
      headers: {
        authorization: request.headers.get("authorization") || "",
      },
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPushConfiguration()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Missing Web Push configuration.",
    });
  }

  const subscriptions = await listPushSubscriptions();
  const results = [];

  for (const subscription of subscriptions) {
    const dueResult = isSubscriptionDue(subscription, new Date());

    if (!dueResult.due) {
      continue;
    }

    const { album } = getAlbumForSequence(subscription.sentCount);
    const coverUrl = await getAlbumCoverUrl(album);
    const payload = {
      title: `继续听 ${album.album}`,
      body: `${album.artist} · #${album.rank} · 点开继续读这张专辑`,
      icon: coverUrl,
      badge: "/apple-icon",
      url: getAlbumDetailHref(album.rank),
      tag: `album-daily-${album.rank}`,
    };

    try {
      await sendPushNotification(subscription, payload);
      await markPushSubscriptionSent(subscription.endpoint, dueResult.localDateKey);
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
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 0;

      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(subscription.endpoint);
      }

      results.push({
        endpoint: subscription.endpoint,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: subscriptions.length,
    results,
  });
}
