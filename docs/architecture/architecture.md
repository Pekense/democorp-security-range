# DemoCorp Enterprise Security Range — Architecture

## 1. Purpose

DemoCorp Enterprise Security Range is a fictional but realistic enterprise environment designed for controlled security testing of AI-enabled applications.

DemoCorp is an independent target system.

It must not depend on, import, or contain knowledge of AgentSec or any other external auditing product.

The environment must operate independently and expose realistic application and AI security surfaces that external tools can assess using black-box, grey-box, or white-box methodologies.

---

## 2. Design Principles

The architecture follows these principles:

1. DemoCorp is the target, not the auditor.
2. All services must operate locally.
3. Dangerous actions must be simulated.
4. No real financial transactions, emails, cloud actions, or remote scanning are allowed.
5. Security vulnerabilities must produce observable behaviour.
6. SAFE, VULNERABLE, and PATCHED variants must differ functionally.
7. Ground truth must remain outside the runtime application.
8. Services should communicate using explicit APIs or protocols.
9. Trust boundaries must be identifiable and testable.
10. Components should represent one coherent fictional enterprise rather than isolated security labs.

---

## 3. High-Level Architecture

```text
                         DemoCorp Portal
                               |
          ------------------------------------------------
          |                      |                       |
          v                      v                       v
   Customer Chatbot        Finance AI Agent        RAG Assistant
          |                      |                       |
          |                      |                  Vector Store
          |                      |                       |
          +----------------------+-----------------------+
                                 |
                            MCP Server
                       /         |          \
                      /          |           \
                    CRM        Orders       Notifications
                                 |
                         Privileged Actions
                                 |
                            Backend API
                                 |
                         DemoCorp Business Data


               AI-enabled services
                       |
                       v
                  LLM Service
                       |
                    Ollama
                  qwen2.5:7b
```

The diagram represents logical relationships. Not every connection must exist in the first implementation.

---

## 4. Services

### 4.1 Backend API

Directory:

`services/backend-api/`

Responsibilities:

* manage customers;
* manage accounts;
* expose order information;
* manage refund requests;
* create simulated notifications;
* create simulated transfers;
* expose corporate documents;
* enforce application-level authorization where appropriate.

The Backend API is the authoritative source for DemoCorp business operations.

It must not contain AI-specific attack logic.

It must not know whether it is being audited.

---

### 4.2 MCP Server

Directory:

`services/mcp-server/`

Responsibilities:

* expose business capabilities as tools;
* classify tools according to risk;
* communicate with the Backend API;
* enforce tool-level permissions where required;
* propagate correlation identifiers;
* expose structured metadata about tool capabilities.

Initial tool categories:

#### READ_ONLY

* `crm_lookup`
* `get_order`
* `search_documents`

#### WRITE

* `send_notification`
* `request_refund`

#### PRIVILEGED

* `transfer_funds_simulated`

Dangerous operations must never perform real-world actions.

---

### 4.3 Finance AI Agent

Directory:

`services/finance-agent/`

Responsibilities:

* receive user requests;
* communicate with the configured LLM;
* reason about available business tools;
* request MCP tool execution;
* return business responses to users;
* propagate request and trace identifiers.

The Finance Agent represents an AI application capable of taking controlled actions.

It must not access the Backend API database directly.

Business actions should normally pass through explicit tool or API boundaries.

---

### 4.4 Customer Chatbot

Directory:

`services/customer-chatbot/`

Responsibilities:

* answer customer questions;
* provide FAQ information;
* retrieve permitted order information;
* access a restricted subset of tools;
* interact with the configured LLM.

The chatbot must have fewer capabilities than the Finance Agent.

This distinction is intentional and will later allow testing of privilege and capability boundaries.

---

### 4.5 RAG Assistant

Directory:

`services/rag-assistant/`

Responsibilities:

* retrieve DemoCorp documents;
* construct LLM context;
* preserve document/source identity;
* maintain source provenance;
* distinguish trusted and untrusted context where required.

Future security scenarios will include:

* indirect prompt injection;
* poisoned documents;
* provenance failures;
* untrusted context propagation.

Retrieved documents must be treated as data, not automatically as trusted instructions.

---

### 4.6 LLM Application

Directory:

`services/llm-application/`

Responsibilities:

* provide a non-agentic AI application;
* process prompts or documents;
* communicate with the configured LLM;
* demonstrate security characteristics of a normal LLM-enabled application.

It should not require:

* an agent loop;
* MCP;
* privileged tools;
* autonomous business actions.

This component provides a clear architectural distinction between an LLM application and an AI agent.

---

## 5. LLM Layer

Initial inference provider:

* Ollama

Initial model:

* `qwen2.5:7b`

The architecture should eventually expose an internal provider abstraction so the model backend can be replaced without redesigning the business services.

Conceptually:

```text
LLMProvider
    |
    +-- OllamaProvider
    |
    +-- FutureProvider
```

Cloud providers are not part of the initial implementation.

---

## 6. Communication Model

Services communicate using explicit network interfaces.

Expected logical communication:

```text
Customer Chatbot
    |
    +--> Backend API
    +--> MCP Server
    +--> LLM Service


Finance Agent
    |
    +--> MCP Server
    +--> LLM Service


RAG Assistant
    |
    +--> Document/Vector Store
    +--> LLM Service


MCP Server
    |
    +--> Backend API
```

Direct access between service internals should be avoided.

For example:

```text
Finance Agent --> Backend database
```

should not occur.

Instead:

```text
Finance Agent
      |
      v
MCP Server
      |
      v
Backend API
```

provides observable and enforceable boundaries.

---

## 7. Initial Port Plan

Proposed local ports:

| Component        | Internal Port | Host Port |
| ---------------- | ------------: | --------: |
| Backend API      |          8000 |      8000 |
| MCP Server       |          8001 |      8001 |
| Finance Agent    |          8002 |      8002 |
| Customer Chatbot |          8003 |      8003 |
| RAG Assistant    |          8004 |      8004 |
| LLM Application  |          8005 |      8005 |
| Ollama           |         11434 |     11434 |

These ports are an initial architecture contract and may be revised before implementation if a concrete technical reason appears.

Not every service needs to remain exposed to the host in the final architecture.

Internal-only services should eventually remain accessible only through the DemoCorp Docker network.

---

## 8. Shared Enterprise Data

DemoCorp services represent the same fictional company.

Initial business entities:

```text
Customer
Account
Order
Document
Identity
Refund
Notification
SimulatedTransfer
```

Example relationships:

```text
Customer
   |
   +--> Account
   |
   +--> Orders
   |
   +--> Documents
   |
   +--> Refunds
```

Services must not maintain unrelated fictional datasets when the same business entity can be shared coherently.

---

## 9. Trust Boundaries

The architecture contains several explicit trust boundaries.

### TB-01 — User Input Boundary

```text
User
 |
 v
AI Application
```

User input is untrusted.

---

### TB-02 — Retrieval Boundary

```text
Documents
 |
 v
RAG Assistant
```

Retrieved content is untrusted unless explicitly validated.

Document content must not automatically become trusted application instructions.

---

### TB-03 — AI to Tool Boundary

```text
LLM / Agent
 |
 v
MCP Server
```

An LLM requesting an action does not imply authorization.

Tool execution requires independent policy decisions.

---

### TB-04 — Tool to Business Boundary

```text
MCP Server
 |
 v
Backend API
```

The Backend API must independently enforce business rules and authorization where required.

---

### TB-05 — Capability Boundary

```text
READ_ONLY
   |
WRITE
   |
PRIVILEGED
```

Capabilities must be distinguishable.

Access to a low-risk tool must not imply access to a privileged tool.

---

## 10. Security Variants

DemoCorp will eventually support three states:

### VULNERABLE

Contains a real security weakness producing observable insecure behaviour.

### SAFE

Implements security controls from the beginning.

### PATCHED

Starts from the vulnerable behaviour and applies a specific mitigation while preserving legitimate functionality.

The three variants must not merely change descriptive vulnerability flags.

Security controls must alter actual runtime behaviour.

---

## 11. Ground Truth Separation

Ground truth is stored under:

`ground-truth/`

Runtime services must never consume this directory.

Ground truth exists exclusively for:

* external evaluation;
* regression testing;
* benchmark comparison;
* validation of expected attack paths.

Conceptually:

```text
DemoCorp Runtime
      X
      |
      | no dependency
      |
Ground Truth
```

An external evaluator may compare observations against ground truth.

DemoCorp itself may not.

---

## 12. Observability

All services should eventually emit structured events containing fields such as:

```text
timestamp
service
event_type
request_id
trace_id
source_identity
tool_name
tool_classification
authorization_decision
human_confirmation_state
result_status
```

Logs must not contain:

* passwords;
* API tokens;
* credentials;
* complete system prompts;
* chain-of-thought;
* real secrets.

Correlation identifiers should allow reconstruction of cross-service activity.

Example:

```text
untrusted_document
        |
        | trace_id=abc
        v
RAG Assistant
        |
        v
Finance Agent
        |
        v
MCP Server
        |
        v
privileged simulated action
```

---

## 13. Range Safety

The environment must remain safe to execute locally.

Forbidden by default:

* real financial transactions;
* real SMTP delivery;
* real cloud operations;
* host shell execution;
* arbitrary command execution;
* Docker socket access;
* host filesystem access outside the project;
* remote scanning;
* uncontrolled Internet actions.

Potentially dangerous capabilities must return simulated results.

Example:

```text
transfer_funds_simulated(...)
```

may create a local business record representing a transfer but must never communicate with a financial institution.

---

## 14. Dependency Rule

DemoCorp must never depend on AgentSec.

Forbidden examples:

```text
import agentsec
```

or:

```text
DemoCorp --> AgentSec API
```

or application logic designed around AgentSec findings.

The intended relationship is exclusively:

```text
AgentSec
    |
    | external observation/testing
    v
DemoCorp
```

DemoCorp must remain useful and executable if AgentSec does not exist.

---

## 15. Architecture Status

This document defines the initial M1 architecture contract.

Implementation details may evolve, but architectural changes affecting:

* trust boundaries;
* service responsibilities;
* communication paths;
* security isolation;
* ground-truth separation;

must be explicitly documented rather than introduced accidentally during development.
