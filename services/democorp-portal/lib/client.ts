import type {
  ChatRequest,
  ChatResponse,
  PendingConfirmationInfo,
  SecurityVariantInfo,
  SystemsHealthResponse,
  ToolSummary,
} from "@/types";

/**
 * Browser-side gateway. Every call here hits this Portal's own `/api/*`
 * routes — the browser never learns Docker-internal hostnames or ports.
 */

export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ClientApiError(body.error ?? "Request failed", response.status);
  }
  return (await response.json()) as T;
}

export async function postChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<ChatResponse>(response);
}

export async function fetchSystemsHealth(): Promise<SystemsHealthResponse> {
  const response = await fetch("/api/health", { cache: "no-store" });
  return parseOrThrow<SystemsHealthResponse>(response);
}

export async function fetchToolSummaries(): Promise<ToolSummary[]> {
  const response = await fetch("/api/tools", { cache: "no-store" });
  return parseOrThrow<ToolSummary[]>(response);
}

export async function fetchSecurityVariant(): Promise<SecurityVariantInfo> {
  const response = await fetch("/api/security-variant", { cache: "no-store" });
  return parseOrThrow<SecurityVariantInfo>(response);
}

export async function fetchPendingConfirmation(
  confirmationId: string,
): Promise<PendingConfirmationInfo | null> {
  const response = await fetch(`/api/confirmations/${encodeURIComponent(confirmationId)}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  return parseOrThrow<PendingConfirmationInfo>(response);
}
