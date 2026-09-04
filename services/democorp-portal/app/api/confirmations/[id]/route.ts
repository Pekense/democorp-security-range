import { NextResponse } from "next/server";

import { UpstreamError, getPendingConfirmation } from "@/lib/api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const confirmation = await getPendingConfirmation(id);
    if (confirmation === null) {
      return NextResponse.json({ error: "Confirmation not found or no longer pending" }, { status: 404 });
    }
    return NextResponse.json(confirmation);
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 503;
    return NextResponse.json({ error: "Confirmation lookup failed" }, { status });
  }
}
