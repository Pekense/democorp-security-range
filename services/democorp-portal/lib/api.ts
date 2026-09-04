import "server-only";

import type {
  ChatRequest,
  ChatResponse,
  PendingConfirmationInfo,
  SecurityVariantInfo,
  ServiceHealth,
  ToolSummary,
} from "@/types";

/**
 * Server-side gateway to the DemoCorp backend services.
 *
 * These functions resolve Docker-internal hostnames (backend-api, mcp-server,
 * finance-agent, ollama) and must only be called from Route Handlers or
 * Server Components — never shipped to the browser bundle. Browser code goes
 * through `lib/client.ts`, which talks to this Portal's own `/api/*` routes.
 */

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend-api:8000";
const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://mcp-server:8001";
const FINANCE_AGENT_URL = process.env.FINANCE_AGENT_URL ?? "http://finance-agent:8002";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://ollama:11434";

const HEALTH_TIMEOUT_MS = 3_000;
const CHAT_TIMEOUT_MS = 120_000;

export class UpstreamError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function checkServiceHealth(url: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, { method: "GET" }, timeoutMs);
    return response.ok;
  } catch {
    return false;
  }
}

interface ServiceDescriptor {
  id: string;
  name: string;
  type: string;
  port: number;
  healthUrl: string;
}

const SERVICE_DESCRIPTORS: ServiceDescriptor[] = [
  {
    id: "backend-api",
    name: "Backend API",
    type: "REST API",
    port: 8000,
    healthUrl: `${BACKEND_API_URL}/health`,
  },
  {
    id: "mcp-server",
    name: "MCP Server",
    type: "Tool Gateway",
    port: 8001,
    healthUrl: `${MCP_SERVER_URL}/health`,
  },
  {
    id: "finance-agent",
    name: "Finance Agent",
    type: "AI Agent",
    port: 8002,
    healthUrl: `${FINANCE_AGENT_URL}/health`,
  },
  {
    id: "ollama",
    name: "Ollama",
    type: "LLM Runtime",
    port: 11434,
    healthUrl: OLLAMA_BASE_URL,
  },
];

export async function getSystemsHealth(): Promise<ServiceHealth[]> {
  return Promise.all(
    SERVICE_DESCRIPTORS.map(async (service) => {
      const online = await checkServiceHealth(service.healthUrl);
      return {
        id: service.id,
        name: service.name,
        type: service.type,
        port: service.port,
        status: online ? "ONLINE" : "OFFLINE",
      } satisfies ServiceHealth;
    }),
  );
}

export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  const response = await fetchWithTimeout(
    `${FINANCE_AGENT_URL}/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
    CHAT_TIMEOUT_MS,
  );

  if (!response.ok) {
    if (response.status === 422) {
      throw new UpstreamError("Message must not be empty", 422);
    }
    throw new UpstreamError("Finance Agent request failed", 503);
  }

  return (await response.json()) as ChatResponse;
}

export async function getToolSummaries(): Promise<ToolSummary[]> {
  const response = await fetchWithTimeout(`${FINANCE_AGENT_URL}/tools`, { method: "GET" }, HEALTH_TIMEOUT_MS);
  if (!response.ok) {
    throw new UpstreamError("MCP tool metadata is unavailable", 503);
  }
  return (await response.json()) as ToolSummary[];
}

export async function getSecurityVariantInfo(): Promise<SecurityVariantInfo> {
  const response = await fetchWithTimeout(
    `${FINANCE_AGENT_URL}/security-variant`,
    { method: "GET" },
    HEALTH_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new UpstreamError("Security variant is unavailable", 503);
  }
  return (await response.json()) as SecurityVariantInfo;
}

export async function getPendingConfirmation(
  confirmationId: string,
): Promise<PendingConfirmationInfo | null> {
  const response = await fetchWithTimeout(
    `${FINANCE_AGENT_URL}/confirmations/${encodeURIComponent(confirmationId)}`,
    { method: "GET" },
    HEALTH_TIMEOUT_MS,
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new UpstreamError("Confirmation lookup failed", 503);
  }
  return (await response.json()) as PendingConfirmationInfo;
}
