# DemoCorp Observability and Correlation

## 1. Purpose

This document defines the observability and correlation model for DemoCorp Enterprise Security Range.

The objective is to reconstruct security-relevant activity across services using structured events without exposing sensitive information or internal model reasoning.

Observability must describe what happened.

It must not reveal hidden reasoning or ground truth.

---

## 2. Design Principles

DemoCorp observability follows these rules:

1. All security-relevant events should be structured.
2. Cross-service activity must be correlatable.
3. Logs must preserve actor and source context where relevant.
4. Logs must not contain credentials or secrets.
5. Logs must not contain complete system prompts.
6. Logs must not contain chain-of-thought.
7. Runtime logs must not contain vulnerability labels from ground truth.
8. Each service logs its own decisions and actions.
9. Correlation must not depend on a specific AI framework.
10. Observability should support both operational debugging and external security evaluation.

---

## 3. Correlation Identifiers

DemoCorp uses two main correlation identifiers.

### request_id

Identifies one inbound request handled by a service.

Example:

```text
req-7f91c34a
```

A new request entering a service may receive its own `request_id`.

---

### trace_id

Identifies the complete business or security flow across multiple services.

Example:

```text
trace-a84e210c
```

The `trace_id` should remain stable as activity crosses service boundaries.

Example:

```text
User
 |
 | trace_id=trace-a84e210c
 v
RAG Assistant
 |
 | trace_id=trace-a84e210c
 v
Finance Agent
 |
 | trace_id=trace-a84e210c
 v
MCP Server
 |
 | trace_id=trace-a84e210c
 v
Backend API
```

This allows the complete path to be reconstructed later.

---

## 4. Request ID vs Trace ID

The distinction is important.

Example:

```text
trace_id = trace-001

RAG request:
request_id = req-101

Finance Agent request:
request_id = req-102

MCP request:
request_id = req-103

Backend request:
request_id = req-104
```

All four requests belong to the same trace:

```text
trace-001
```

Conceptually:

```text
TRACE
 |
 +-- REQUEST RAG
 |
 +-- REQUEST AGENT
 |
 +-- REQUEST MCP
 |
 +-- REQUEST BACKEND
```

---

## 5. Actor Identity

Security-sensitive events should preserve the actor responsible for the activity.

Initial fields:

```text
actor_id
actor_type
actor_role
```

Example:

```text
actor_id: USER-001
actor_type: customer
actor_role: customer
```

For service-to-service activity:

```text
actor_id: SVC-FINANCE-AGENT
actor_type: service
actor_role: finance_agent
```

When possible, the originating human identity should remain available separately from the technical service identity.

---

## 6. Source Identity

DemoCorp should preserve the origin of security-relevant context.

Initial fields:

```text
source_id
source_type
source_trust
```

Possible `source_type` values:

```text
user
document
tool
service
system
```

Possible `source_trust` values:

```text
trusted
untrusted
unknown
```

Example:

```text
source_id: DOC-099
source_type: document
source_trust: untrusted
```

This allows DemoCorp to observe paths such as:

```text
DOC-099
untrusted
   |
   v
RAG
   |
   v
Finance Agent
   |
   v
MCP
```

without putting vulnerability labels in runtime logs.

---

## 7. Event Structure

A security-relevant event should conceptually contain:

```json
{
  "timestamp": "2026-09-02T08:00:00Z",
  "event_type": "tool_request",
  "service": "finance-agent",
  "request_id": "req-123",
  "trace_id": "trace-456",
  "actor_id": "USER-001",
  "actor_type": "customer",
  "actor_role": "customer",
  "source_id": "DOC-099",
  "source_type": "document",
  "source_trust": "untrusted",
  "result_status": "requested"
}
```

Fields may be omitted when they do not apply to a specific event.

---

## 8. Event Types

Initial event families:

```text
request_received
request_completed

authentication_decision
authorization_decision

retrieval_request
retrieval_result

llm_request
llm_result

tool_request
tool_authorization
tool_execution
tool_result

human_confirmation_requested
human_confirmation_received

business_action_requested
business_action_completed
business_action_denied
```

These names describe runtime behaviour.

They must not describe whether the behaviour is vulnerable.

---

## 9. Tool Events

Tool-related events should contain fields such as:

```text
tool_name
tool_classification
authorization_decision
human_confirmation_state
result_status
```

Example:

```json
{
  "event_type": "tool_execution",
  "service": "mcp-server",
  "trace_id": "trace-456",
  "request_id": "req-789",
  "actor_id": "USER-001",
  "tool_name": "transfer_funds_simulated",
  "tool_classification": "PRIVILEGED",
  "authorization_decision": "ALLOW",
  "human_confirmation_state": "NOT_CONFIRMED",
  "result_status": "SIMULATED_TRANSFER_CREATED"
}
```

This event describes what occurred.

It does not say:

```text
vulnerability = true
```

That conclusion belongs to the evaluator.

---

## 10. Authorization Events

Authorization decisions should be explicit.

Example:

```json
{
  "event_type": "authorization_decision",
  "service": "backend-api",
  "trace_id": "trace-456",
  "actor_id": "USER-001",
  "resource": "ACC-001",
  "action": "transfer",
  "decision": "DENY",
  "reason_code": "ROLE_NOT_ALLOWED"
}
```

Reason codes should be concise and operational.

They should not expose sensitive implementation details.

---

## 11. Human Confirmation

Privileged actions may require explicit confirmation.

Possible states:

```text
NOT_REQUIRED
REQUIRED
PENDING
CONFIRMED
REJECTED
MISSING
```

Example:

```json
{
  "event_type": "human_confirmation_requested",
  "service": "finance-agent",
  "trace_id": "trace-456",
  "tool_name": "transfer_funds_simulated",
  "human_confirmation_state": "PENDING"
}
```

---

## 12. RAG and Source Provenance

Retrieval events should preserve document identity.

Example:

```json
{
  "event_type": "retrieval_result",
  "service": "rag-assistant",
  "trace_id": "trace-456",
  "documents": [
    {
      "document_id": "DOC-001",
      "source_id": "corporate-policy-store",
      "source_trust": "trusted"
    },
    {
      "document_id": "DOC-099",
      "source_id": "external-upload",
      "source_trust": "untrusted"
    }
  ]
}
```

The full document content should not need to be repeated in security logs.

---

## 13. LLM Observability

DemoCorp may log metadata about LLM interactions.

Allowed examples:

```text
provider
model
request_id
trace_id
input_source_types
tool_count
result_status
latency
```

Example:

```json
{
  "event_type": "llm_request",
  "service": "finance-agent",
  "provider": "ollama",
  "model": "qwen2.5:7b",
  "trace_id": "trace-456",
  "result_status": "submitted"
}
```

---

## 14. Forbidden Logging

DemoCorp must not log:

```text
passwords
authentication tokens
API keys
credentials
private keys
complete system prompts
complete hidden prompts
chain-of-thought
real personal data
real financial information
```

Sensitive information should be excluded rather than merely hidden after logging whenever possible.

---

## 15. Runtime vs Ground Truth

Runtime observability must remain neutral.

Valid runtime event:

```text
tool_execution
tool=transfer_funds_simulated
confirmation=MISSING
result=SIMULATED_TRANSFER_CREATED
```

Invalid runtime event:

```text
vulnerability=missing_human_confirmation
attack_successful=true
agentsec_should_detect=true
```

Security interpretation belongs outside DemoCorp runtime.

---

## 16. Example Cross-Service Trace

Scenario:

An untrusted document influences an agent that requests a privileged simulated transfer.

```text
DOC-099
source_trust=untrusted
        |
        v
RAG Assistant
trace=trace-900
        |
        v
Finance Agent
trace=trace-900
        |
        v
MCP Server
trace=trace-900
        |
        v
Backend API
trace=trace-900
        |
        v
TRF-001
```

Possible event sequence:

```text
1. retrieval_result
2. llm_request
3. tool_request
4. tool_authorization
5. tool_execution
6. business_action_completed
```

An external evaluator can reconstruct the chain by grouping events using:

```text
trace_id=trace-900
```

---

## 17. Framework Independence

Correlation must not depend on:

```text
LangChain traces
LangGraph internals
OpenAI internal traces
Anthropic internal traces
framework-specific callbacks
```

DemoCorp may use frameworks internally later, but its core observability contract remains:

```text
HTTP/MCP request
+
structured event
+
request_id
+
trace_id
```

This keeps the security range portable.

---

## 18. Future Storage

During early development, structured events may be written to:

```text
stdout
```

using JSON lines.

Example:

```text
{"event_type":"tool_request", ...}
{"event_type":"tool_execution", ...}
```

Docker can then expose them using:

```bash
docker logs <container>
```

Later, DemoCorp may introduce a centralized local event collector if necessary.

M1 does not require one.

---

## 19. M1 Observability Contract

The minimum correlation fields for M1 are:

```text
timestamp
service
event_type
request_id
trace_id
```

Security-sensitive flows should additionally support:

```text
actor_id
actor_type
actor_role

source_id
source_type
source_trust

tool_name
tool_classification

authorization_decision
human_confirmation_state

result_status
```

The central rule is:

```text
trace_id survives the complete cross-service path
```

while:

```text
request_id identifies an individual service request
```

This distinction will be required by future integration and security tests.
