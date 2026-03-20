import { NextRequest, NextResponse } from "next/server";
import { resetAllPushSubscriptionProgress } from "@/lib/push-store";
import { hasPushWorkerProxy, proxyPushWorkerRequest } from "@/lib/push-worker-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (hasPushWorkerProxy()) {
    const response = await proxyPushWorkerRequest("/api/cron/reset-push-progress", {
      method: "POST",
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

  await resetAllPushSubscriptionProgress();

  return NextResponse.json({
    ok: true,
    reset: true,
  });
}
