import { NextResponse } from "next/server";

import { UpstreamError, getSecurityVariantInfo } from "@/lib/api";

export async function GET() {
  try {
    const info = await getSecurityVariantInfo();
    return NextResponse.json(info);
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 503;
    return NextResponse.json({ error: "Security variant is unavailable" }, { status });
  }
}
