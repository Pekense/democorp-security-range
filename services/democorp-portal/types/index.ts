export type SecurityVariant = "vulnerable" | "safe" | "patched";

export type PolicyOrigin =
  | "baseline_unenforced"
  | "secure_by_design"
  | "mitigation_applied";

export type ToolClassification = "READ_ONLY" | "PRIVILEGED";

export interface ChatRequest {
  message: string;
  confirmation_id?: string | null;
}

export interface ToolData {
  tool_name: string;
  result: Record<string, unknown>;
}

export interface ChatResponse {
  response: string;
  request_id: string;
  trace_id: string;
  tools_used: string[];
  tool_data: ToolData[];
  confirmation_required: boolean;
  confirmation_id: string | null;
  security_variant: SecurityVariant;
}

export interface ToolSummary {
  name: string;
  description: string;
  classification: ToolClassification;
  read_only: boolean;
  dangerous_capability: boolean;
  requires_human_confirmation: boolean;
}

export interface SecurityVariantInfo {
  security_variant: SecurityVariant;
  policy_origin: PolicyOrigin;
}

export interface PendingConfirmationInfo {
  confirmation_id: string;
  tool_name: string;
  tool_arguments: Record<string, unknown>;
  security_variant: SecurityVariant;
}

export type ServiceStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

export interface ServiceHealth {
  id: string;
  name: string;
  type: string;
  port: number;
  status: ServiceStatus;
  detail?: string;
}

export interface SystemsHealthResponse {
  services: ServiceHealth[];
  checked_at: string;
}

/** One completed or pending Finance Agent interaction, kept client-side for the Trace Explorer. */
export interface TraceRecord {
  request_id: string;
  trace_id: string;
  user_message: string;
  response: ChatResponse;
  timestamp: string;
}
