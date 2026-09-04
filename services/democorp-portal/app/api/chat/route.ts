import { NextRequest, NextResponse } from "next/server";

import { UpstreamError, sendChatMessage } from "@/lib/api";
import type { ChatRequest } from "@/types";

export async function POST(request: NextRequest) {
  let payload: ChatRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof payload.message !== "string" || payload.message.trim() === "") {
    return NextResponse.json({ error: "Message must not be empty" }, { status: 422 });
  }

  try {
    const chatResponse = await sendChatMessage(payload);
    return NextResponse.json(chatResponse);
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Finance Agent is unreachable" }, { status: 503 });
  }
}
