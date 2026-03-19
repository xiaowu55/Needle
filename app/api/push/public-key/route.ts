import { NextResponse } from "next/server";
import { getPushPublicKey, hasPushConfiguration } from "@/lib/push";
import { hasPushWorkerProxy, proxyPushWorkerRequest } from "@/lib/push-worker-proxy";

export async function GET() {
  if (hasPushWorkerProxy()) {
    const response = await proxyPushWorkerRequest("/api/push/public-key", {
      method: "GET",
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.json({
    publicKey: getPushPublicKey(),
    configured: hasPushConfiguration(),
  });
}
