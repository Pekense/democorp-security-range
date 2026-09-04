import { NextResponse } from "next/server";

import { getSystemsHealth } from "@/lib/api";
import type { SystemsHealthResponse } from "@/types";

export async function GET() {
  const services = await getSystemsHealth();
  const payload: SystemsHealthResponse = {
    services,
    checked_at: new Date().toISOString(),
  };
  return NextResponse.json(payload);
}
