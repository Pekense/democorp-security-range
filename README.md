# DemoCorp Enterprise Security Range

DemoCorp Enterprise Security Range is a fictional, realistic, and fully controlled enterprise environment designed for security testing of AI-enabled applications.

It is intentionally built as an independent target system that can later be audited by external security tools such as AgentSec.

DemoCorp does not depend on AgentSec and does not contain knowledge of AgentSec internals, rules, findings, or evaluation logic.

---

## Purpose

The objective of DemoCorp is to provide a coherent enterprise environment containing multiple AI-enabled applications and business services.

The environment will eventually include:

* Backend REST API
* MCP Server
* Finance AI Agent
* Customer Chatbot
* RAG Assistant
* LLM Application
* Local LLM inference through Ollama

The project is not intended to be a collection of isolated mini-labs.

All services belong to the same fictional company and share customers, identities, orders, documents, accounts, and business processes.

---

## Core Principle

DemoCorp is the target.

AgentSec or any other external system is the auditor.

The intended relationship is:

```text
External Auditor
       |
       v
   DemoCorp
```

Never:

```text
DemoCorp
   |
   v
AgentSec internals
```

DemoCorp must remain functional even if AgentSec does not exist.

---

## Current Architecture

```text
                         External Auditor
                              |
                       democorp_audit
                              |
          -----------------------------------------
          |                  |                    |
          v                  v                    v
   Customer Chatbot     Finance Agent        RAG Assistant
          |                  |                    |
          |                  |                Vector Store
          |                  |
          -------------------+--------------------
                             |
                    democorp_internal
                             |
                         MCP Server
                             |
                        Backend API
                             |
                     DemoCorp Business Data
                             |
                           Ollama
```

The architecture uses two Docker trust zones.

---

## Docker Networks

### `democorp_audit`

Represents the externally observable attack surface.

Initial services attached to this network:

* Finance Agent
* Customer Chatbot
* RAG Assistant
* LLM Application

An external auditor may later connect to this network without receiving direct access to DemoCorp internal infrastructure.

---

### `democorp_internal`

Private DemoCorp service network.

Configured as:

```yaml
internal: true
```

Initial internal services include:

* Backend API
* MCP Server
* Ollama

Application-facing services may also connect to this network when they need to consume internal capabilities.

The purpose is to separate:

```text
auditable surface
```

from:

```text
internal enterprise infrastructure
```

---

## Services

### Backend API

Future authoritative source for DemoCorp business operations.

Planned capabilities include:

* customers
* accounts
* orders
* refunds
* notifications
* documents
* simulated transfers

---

### MCP Server

Future tool gateway between AI applications and business capabilities.

Initial tool categories:

```text
READ_ONLY
WRITE
PRIVILEGED
```

Example tools:

```text
crm_lookup
get_order
search_documents
send_notification
request_refund
transfer_funds_simulated
```

---

### Finance Agent

Future AI agent capable of requesting controlled business actions through the MCP Server.

Privileged actions will always remain simulated.

---

### Customer Chatbot

Future customer-facing AI application with a restricted capability set.

It must have fewer permissions than the Finance Agent.

---

### RAG Assistant

Future retrieval-augmented generation application using fictional DemoCorp corporate documents.

It will later support controlled scenarios involving:

* indirect prompt injection
* poisoned documents
* source provenance
* trust boundaries
* untrusted context propagation

---

### LLM Application

Future non-agentic LLM-enabled application.

Its purpose is also to preserve the architectural distinction:

```text
LLM Application != Chatbot != AI Agent
```

---

### Ollama

Local inference service.

Initial model preference:

```text
qwen2.5:7b
```

No cloud LLM provider is required for the initial implementation.

---

## Repository Structure

```text
democorp-security-range/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── services/
│   ├── backend-api/
│   ├── mcp-server/
│   ├── finance-agent/
│   ├── customer-chatbot/
│   ├── rag-assistant/
│   └── llm-application/
│
├── shared/
│   ├── schemas/
│   ├── observability/
│   └── correlation/
│
├── configs/
│   ├── safe/
│   ├── vulnerable/
│   └── patched/
│
├── data/
│   ├── customers/
│   ├── orders/
│   ├── documents/
│   └── identities/
│
├── ground-truth/
│   ├── targets/
│   └── scenarios/
│
├── docs/
│   ├── architecture/
│   ├── trust-boundaries/
│   └── security-model/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
│
└── scripts/
```

---

## Security Variants

Security-sensitive targets may eventually exist in three states.

### VULNERABLE

Contains a controlled but observable security weakness.

### SAFE

Implements the required security controls from the beginning.

### PATCHED

Represents the previously vulnerable implementation after applying a concrete mitigation.

The original attack must stop working while legitimate business functionality remains available.

Security states must modify real runtime behaviour.

A descriptive flag such as:

```text
vulnerable=true
```

is not considered sufficient.

---

## Ground Truth

Ground truth lives under:

```text
ground-truth/
```

It exists only for:

* evaluation
* regression testing
* benchmark validation
* expected attack-path definition

Runtime services must never read ground-truth files.

Ground truth does not control application behaviour.

---

## Observability

DemoCorp will use structured runtime events.

Core correlation fields:

```text
timestamp
service
event_type
request_id
trace_id
```

Security-sensitive flows may additionally contain:

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

The central correlation rule is:

```text
request_id = one service request

trace_id = the complete cross-service flow
```

---

## Range Safety

DemoCorp may contain intentionally vulnerable applications.

The environment itself must remain controlled.

Forbidden by default:

* real financial transactions
* real SMTP delivery
* real banking APIs
* cloud credentials
* arbitrary host shell execution
* Docker socket access
* privileged containers
* host network mode
* arbitrary host filesystem access
* remote scanning

Dangerous business actions must be simulated.

Example:

```text
transfer_funds_simulated(...)
```

may create a local fictional transfer record but must never move real funds.

---

## Shared Data Model

Initial business entities:

```text
Customer
Identity
Account
Order
Document
Refund
Notification
SimulatedTransfer
```

Important security distinction:

```text
Customer != Identity != Authorization
```

Ownership of a business object does not automatically imply authorization to perform every action against it.

---

## Audit Modes

DemoCorp is designed to support future external evaluation.

### BLACK_BOX

Auditor receives only externally reachable targets and required connection information.

### GREY_BOX

Auditor may additionally receive declared metadata such as:

* OpenAPI
* MCP tool metadata
* authentication model
* declared permissions

### WHITE_BOX

Auditor may additionally inspect:

* source code
* configuration
* deployment files
* tool definitions

Ground truth remains evaluation-only in all three modes.

---

## Running the M1 Foundation

Validate Docker Compose:

```bash
docker compose config --quiet
```

Start the environment:

```bash
docker compose up -d
```

Check services:

```bash
docker compose ps
```

Check the private network:

```bash
docker network inspect democorp_internal
```

Check the audit network:

```bash
docker network inspect democorp_audit
```

Stop the environment:

```bash
docker compose down
```

---

## DemoCorp Portal

`services/democorp-portal` is the Enterprise Security Operations Console: a Next.js (TypeScript, App
Router) web UI for operating and demonstrating DemoCorp. The Portal belongs to DemoCorp — it is not
part of AgentSec, does not import AgentSec, and never reads `ground-truth/`.

Start it together with the rest of the stack:

```bash
docker compose up -d --build democorp-portal
```

Open:

```text
http://localhost:3000
```

### Architecture

```text
Browser
   |
   v
DemoCorp Portal (Next.js Route Handlers)
   |
   +--> Backend API   (health)
   +--> MCP Server    (health)
   +--> Finance Agent (chat, tools, security-variant, confirmations, health)
   +--> Ollama        (health only)
```

The browser only ever talks to the Portal's own `/api/*` routes; it never learns Docker-internal
hostnames or ports. All calls to `backend-api`, `mcp-server`, `finance-agent`, and `ollama` are made
server-side, from Next.js Route Handlers (`app/api/*`) and Server Components, through `lib/api.ts`.

### Dependencies

* Node.js 22, Next.js 16, React 19, TypeScript — see `services/democorp-portal/package.json`.
* No external UI framework (no Tailwind, no component library) — a small hand-written CSS design
  system in `app/globals.css` plus CSS Modules per component.

### Local development

```bash
cd services/democorp-portal
npm install
npm run dev
```

### Tests

```bash
cd services/democorp-portal
npm run test
```

---

## Current Project Status

Current milestone:

```text
M1 — Architecture & Foundation
```

Completed foundation areas:

* independent repository
* service boundaries
* Docker topology
* internal network isolation
* audit network
* trust boundaries
* security model
* shared data model
* observability and correlation model
* ground-truth strategy
* SAFE / VULNERABLE / PATCHED strategy

Application services are currently placeholders.

No full Backend API, MCP Server, Finance Agent, Chatbot, RAG Assistant, or LLM Application has been implemented yet.

---

## Roadmap

```text
M1  Architecture & Foundation
M2  Backend API
M3  MCP Server
M4  Finance AI Agent
M5  Customer Chatbot
M6  RAG Assistant
M7  LLM Application
M8  SAFE / VULNERABLE / PATCHED variants
M9  Ground Truth + Observability implementation
M10 Integrated Enterprise Scenarios
M11 External Security Evaluation
```

Milestones should be completed incrementally.

DemoCorp should not be built all at once.

---

## Documentation

Architecture:

```text
docs/architecture/
```

Trust boundaries:

```text
docs/trust-boundaries/
```

Security model:

```text
docs/security-model/
```

These documents define the current architectural contracts and should be updated when significant architectural decisions change.

---

## Project Rule

The fundamental rule of DemoCorp is:

```text
DemoCorp is the TARGET.

The auditor is EXTERNAL.
```

The objective is to eventually be able to demonstrate:

> An external security tool discovered observable weaknesses in an independent enterprise environment that did not know how it would be audited.

