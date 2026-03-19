import { NextRequest, NextResponse } from "next/server";
import {
  removePushSubscription,
  upsertPushSubscription,
  type PushSchedule,
} from "@/lib/push-store";
import { hasPushWorkerProxy, proxyPushWorkerRequest } from "@/lib/push-worker-proxy";

type SubscribeBody = {
  subscription: {
    endpoint: string;
    keys?: {
      auth?: string;
      p256dh?: string;
    };
  };
  schedule: {
    frequency: "daily" | "weekly" | "interval";
    time: string;
    weekday?: number;
    intervalHours?: number;
    timeZone: string;
  };
};

function normalizeSchedule(input: SubscribeBody["schedule"]): PushSchedule {
  const [hour, minute] = input.time.split(":").map((value) => Number.parseInt(value, 10));
  return {
    frequency: input.frequency,
    hour,
    minute,
    weekday: input.frequency === "weekly" ? input.weekday ?? 1 : undefined,
    intervalHours: input.frequency === "interval" ? input.intervalHours ?? 6 : undefined,
    timeZone: input.timeZone,
  };
}

export async function POST(request: NextRequest) {
  if (hasPushWorkerProxy()) {
    const body = await request.text();
    const response = await proxyPushWorkerRequest("/api/push/subscriptions", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
      },
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  }

  try {
    const body = (await request.json()) as SubscribeBody;
    const endpoint = body.subscription?.endpoint;
    const auth = body.subscription?.keys?.auth;
    const p256dh = body.subscription?.keys?.p256dh;

    if (!endpoint || !auth || !p256dh) {
      return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
    }

    const subscription = await upsertPushSubscription({
      endpoint,
      keys: {
        auth,
        p256dh,
      },
      schedule: normalizeSchedule(body.schedule),
      createdAt: "",
      updatedAt: "",
      sentCount: 0,
    });

    return NextResponse.json({
      ok: true,
      subscription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save push subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (hasPushWorkerProxy()) {
    const body = await request.text();
    const response = await proxyPushWorkerRequest("/api/push/subscriptions", {
      method: "DELETE",
      body,
      headers: {
        "content-type": "application/json",
      },
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  }

  try {
    const body = (await request.json()) as { endpoint?: string };

    if (!body.endpoint) {
      return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
    }

    await removePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove push subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
