# DemoCorp Trust Boundaries

## 1. Purpose

This document defines the main trust boundaries inside DemoCorp Enterprise Security Range.

A trust boundary exists whenever data, identity, instructions, or capabilities cross from one security context into another.

The purpose of these boundaries is to make security assumptions explicit and testable.

---

## 2. TB-01 — User Input to AI Application

```text
User
 |
 v
AI Application
```

### Risk

User-controlled input may contain:

* prompt injection;
* instruction override attempts;
* malicious formatting;
* requests for unauthorized actions;
* attempts to reveal hidden instructions.

### Security principle

User input must always be treated as untrusted.

The application must not assume that because the input is syntactically valid it is also authorized or safe.

### Future observable controls

Possible controls include:

* input classification;
* instruction hierarchy;
* tool restrictions;
* authorization checks;
* explicit denial of restricted actions.

---

## 3. TB-02 — Documents to RAG Assistant

```text
Corporate / External Document
           |
           v
      RAG Assistant
```

### Risk

Retrieved documents may contain:

* malicious instructions;
* poisoned content;
* misleading context;
* embedded prompt injection;
* untrusted source information.

### Security principle

Retrieved content is data.

It must not automatically become trusted application instructions.

### Future observable controls

Possible controls include:

* source provenance;
* trust classification;
* context separation;
* sanitization;
* metadata preservation;
* instruction filtering.

---

## 4. TB-03 — AI Agent to MCP Server

```text
Finance Agent
     |
     v
  MCP Server
```

### Risk

The LLM or agent may request:

* unauthorized tools;
* excessive permissions;
* privileged actions;
* chained operations;
* actions derived from untrusted context.

### Security principle

A tool request is not an authorization decision.

The MCP Server must independently decide whether a requested capability is allowed.

### Future observable controls

Possible controls include:

* tool allowlists;
* role-based tool permissions;
* capability classification;
* human confirmation;
* request context validation;
* source identity propagation.

---

## 5. TB-04 — MCP Server to Backend API

```text
MCP Server
    |
    v
Backend API
```

### Risk

The Backend API could incorrectly trust the MCP Server.

If this happens, an upstream compromise could become a business-level authorization bypass.

### Security principle

The Backend API must enforce its own authorization and business rules.

Upstream approval must not automatically imply backend authorization.

### Future observable controls

Possible controls include:

* authentication;
* authorization checks;
* business-rule validation;
* identity propagation;
* request-scoped permissions;
* audit events.

---

## 6. TB-05 — Capability Boundary

DemoCorp tools are classified into three levels.

```text
READ_ONLY
   |
WRITE
   |
PRIVILEGED
```

### READ_ONLY

Examples:

* `crm_lookup`
* `get_order`
* `search_documents`

Expected behaviour:

The operation reads information but does not modify DemoCorp business state.

---

### WRITE

Examples:

* `send_notification`
* `request_refund`

Expected behaviour:

The operation changes local DemoCorp state but does not perform a privileged simulated financial action.

---

### PRIVILEGED

Example:

* `transfer_funds_simulated`

Expected behaviour:

The operation may require stronger authorization and human confirmation.

It must never perform a real-world financial action.

---

## 7. TB-06 — Identity Boundary

```text
User Identity
     |
     v
Application
     |
     v
Tool
     |
     v
Backend
```

### Risk

Identity can be lost, altered, or incorrectly trusted while crossing services.

This may lead to:

* confused deputy problems;
* privilege escalation;
* unauthorized resource access;
* incorrect business decisions.

### Security principle

Identity and authorization context should remain explicit across service boundaries.

### Future observable fields

Possible fields include:

```text
actor_id
actor_type
role
request_id
trace_id
authorization_context
```

---

## 8. TB-07 — Untrusted Context Propagation

```text
Untrusted Source
      |
      v
RAG / Chatbot
      |
      v
Finance Agent
      |
      v
MCP Tool
```

### Risk

Content originating from an untrusted source may influence a more privileged component.

Example:

```text
poisoned document
      |
      v
RAG context
      |
      v
agent instruction
      |
      v
privileged tool request
```

### Security principle

Trust must not increase silently as data moves through the system.

Source identity and trust classification should be preserved where relevant.

---

## 9. TB-08 — Runtime vs Ground Truth

```text
DemoCorp Runtime

      X

Ground Truth
```

### Risk

If runtime services can read ground-truth manifests, the environment stops being an independent test target.

### Security principle

Ground truth must remain evaluation-only data.

Runtime services must never:

* read it;
* import it;
* query it;
* modify behaviour based on it.

---

## 10. TB-09 — DemoCorp vs Host

```text
DemoCorp Containers
        |
        X
        |
      Host OS
```

### Risk

A vulnerable service could accidentally gain access to the developer workstation.

### Security principle

DemoCorp must not require privileged host access.

Forbidden by default:

* Docker socket access;
* host shell execution;
* arbitrary host filesystem mounts;
* privileged containers;
* host network mode.

---

## 11. TB-10 — DemoCorp vs External Systems

```text
DemoCorp
   |
   X
   |
Internet / Cloud / Real Services
```

### Security principle

Potentially dangerous business actions must remain local and simulated.

DemoCorp must not require:

* real SMTP;
* banking APIs;
* real customer systems;
* production SaaS services;
* cloud credentials.

---

## 12. Why Trust Boundaries Matter

The security objective is not only to know whether a component is vulnerable.

We want to understand where a security assumption failed.

Example:

```text
Untrusted Document
      |
      | TB-02
      v
RAG Assistant
      |
      | TB-07
      v
Finance Agent
      |
      | TB-03
      v
MCP Server
      |
      | TB-05
      v
Privileged Tool
```

A successful attack path may therefore cross several trust boundaries.

This will later allow DemoCorp tests and external auditors to reason about complete attack chains rather than isolated vulnerabilities.
