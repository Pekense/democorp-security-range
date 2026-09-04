import { NextResponse } from "next/server";

import { UpstreamError, getToolSummaries } from "@/lib/api";

export async function GET() {
  try {
    const tools = await getToolSummaries();
    return NextResponse.json(tools);
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 503;
    return NextResponse.json({ error: "MCP tool metadata is unavailable" }, { status });
  }
}
