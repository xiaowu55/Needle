import { NextResponse } from "next/server";
import { getPushPublicKey, hasPushConfiguration } from "@/lib/push";

export async function GET() {
  return NextResponse.json({
    publicKey: getPushPublicKey(),
    configured: hasPushConfiguration(),
  });
}
