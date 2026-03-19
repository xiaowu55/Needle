import { NextRequest, NextResponse } from "next/server";
import {
  getPushSubscriptionByEndpoint,
  listRecentPushDeliveryHistory,
} from "@/lib/push-store";
import { hasPushWorkerProxy, proxyPushWorkerRequest } from "@/lib/push-worker-proxy";

export const dynamic = "force-dynamic";

type PushStatusBody = {
  endpoint?: string;
};

export async function POST(request: NextRequest) {
  if (hasPushWorkerProxy()) {
    const body = await request.text();
    const response = await proxyPushWorkerRequest("/api/push/status", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
      },
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  }

  const body = (await request.json()) as PushStatusBody;

  if (!body.endpoint) {
    return NextResponse.json({
      enabled: false,
      endpointKnown: false,
      sentCount: 0,
      schedule: null,
      deliveryHistory: [],
    });
  }

  const subscription = await getPushSubscriptionByEndpoint(body.endpoint);

  if (!subscription) {
    return NextResponse.json({
      enabled: false,
      endpointKnown: false,
      sentCount: 0,
      schedule: null,
      deliveryHistory: [],
    });
  }

  const history = await listRecentPushDeliveryHistory(body.endpoint, 30);

  return NextResponse.json({
    enabled: true,
    endpointKnown: true,
    sentCount: subscription.sentCount,
    schedule: subscription.schedule,
    deliveryHistory: history.map((entry) => ({
      dateKey: entry.localDateKey,
      count: entry.deliveryCount,
    })),
  });
}
