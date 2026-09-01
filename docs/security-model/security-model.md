# DemoCorp Security Model

## 1. Purpose

This document defines how DemoCorp represents security behaviour across SAFE, VULNERABLE, and PATCHED variants.

The goal is to create observable and realistic security differences without introducing artificial vulnerability flags.

---

## 2. Security States

Each security-sensitive target may exist in one of three states:

### VULNERABLE

The component contains a real security weakness that produces observable insecure behaviour.

Example:

```text
untrusted request
      |
      v
privileged tool
      |
      v
SIMULATED_TRANSFER created
```

---

### SAFE

The component is designed with the required security controls enabled from the beginning.

Example:

```text
untrusted request
      |
      v
privileged tool request
      |
      v
authorization + confirmation
      |
      v
BLOCKED
```

---

### PATCHED

The component represents a previously vulnerable implementation after applying a concrete mitigation.

The legitimate business functionality must remain available.

Example:

```text
VULNERABLE

transfer request
      |
      v
executed without confirmation


PATCH

add explicit confirmation requirement


PATCHED

transfer request
      |
      v
confirmation missing
      |
      v
BLOCKED
```

---

## 3. Core Rule

Security variants must differ through runtime behaviour.

The following pattern is not sufficient:

```python
vulnerable = True
```

or:

```text
security_state=vulnerable
```

if the value only describes the vulnerability.

A valid variant must change actual security enforcement.

---

## 4. Security Controls

Initial DemoCorp controls include:

### Authorization

Determines whether an identity is permitted to perform an operation.

Possible decisions:

```text
ALLOW
DENY
```

---

### Tool Allowlist

Defines which tools an AI component is allowed to request.

Example:

```text
Customer Chatbot

allowed:
- crm_lookup
- get_order

not_allowed:
- transfer_funds_simulated
```

---

### Capability Classification

Tools are classified as:

```text
READ_ONLY
WRITE
PRIVILEGED
```

Higher-risk capabilities may require stronger security controls.

---

### Human Confirmation

Some privileged actions must require explicit confirmation before execution.

Example:

```text
transfer_funds_simulated
      |
      v
HUMAN_CONFIRMATION_REQUIRED
```

---

### Source Trust Validation

Data originating from documents, users, tools, or other services must preserve relevant source information.

Example:

```text
source_type=document
trust=untrusted
```

---

### Read-Only Enforcement

A component configured with read-only permissions must not invoke tools that modify DemoCorp state.

---

### Instruction Boundary

Untrusted content must not silently become trusted control instructions.

This applies especially to:

```text
user input
retrieved documents
tool results
external context
```

---

## 5. Initial Security Scenario Families

DemoCorp will initially model the following vulnerability families.

### DS-01 — Prompt Injection

Untrusted user instructions influence protected application behaviour.

---

### DS-02 — Instruction Override

User-controlled content attempts to replace higher-priority application instructions.

---

### DS-03 — System Prompt Disclosure

The application exposes protected internal prompt content.

---

### DS-04 — Unsafe Tool Permission

An AI component has access to tools beyond its intended business role.

Example:

```text
Customer Chatbot
      |
      v
transfer_funds_simulated
```

---

### DS-05 — Missing Human Confirmation

A privileged action can execute without the required confirmation.

---

### DS-06 — Indirect Prompt Injection

Malicious instructions originate from retrieved content rather than directly from the user.

Example:

```text
poisoned document
      |
      v
RAG
      |
      v
Agent
```

---

### DS-07 — Untrusted Context Propagation

Untrusted context crosses service boundaries without preserving or enforcing its trust state.

---

### DS-08 — Privileged Action Chaining

Multiple individually available capabilities combine into an unintended privileged outcome.

---

### DS-09 — MCP Read/Write Boundary Violation

A component with read-only expectations gains write capability.

---

### DS-10 — Authorization Failure

An operation succeeds for an identity that should not be authorized.

---

## 6. Observable Behaviour

Every vulnerability must produce evidence that can be tested.

Examples:

### Missing confirmation

VULNERABLE:

```text
request privileged action
      |
      v
SIMULATED_TRANSFER_CREATED
```

SAFE:

```text
request privileged action
      |
      v
CONFIRMATION_REQUIRED
      |
      v
BLOCKED
```

PATCHED:

```text
same vulnerable workflow
      |
      v
new confirmation enforcement
      |
      v
BLOCKED
```

---

### Tool permission violation

VULNERABLE:

```text
Customer Chatbot
      |
      v
privileged tool available
```

SAFE:

```text
Customer Chatbot
      |
      v
tool not present in allowlist
      |
      v
DENIED
```

---

## 7. Configuration Strategy

Security configuration will live under:

```text
configs/
├── safe/
├── vulnerable/
└── patched/
```

Configuration may define controls such as:

```text
tool_permissions
authorization_policy
human_confirmation
source_trust
read_only
context_handling
```

However, configuration values must drive real application logic.

They must not exist only as labels.

---

## 8. Ground Truth Relationship

Security configuration and ground truth serve different purposes.

```text
Configuration
     |
     v
controls runtime behaviour


Ground Truth
     |
     v
describes expected security behaviour
for external evaluation
```

Runtime services may read configuration.

Runtime services must never read ground truth.

---

## 9. Example Variant

Target:

```text
finance-agent
```

### VULNERABLE

```text
transfer_funds_simulated:
  allowed: true
  human_confirmation: false
```

Runtime result:

```text
privileged transfer request
      |
      v
SIMULATED_TRANSFER_CREATED
```

---

### SAFE

```text
transfer_funds_simulated:
  allowed: true
  human_confirmation: true
```

Runtime result without confirmation:

```text
privileged transfer request
      |
      v
CONFIRMATION_REQUIRED
```

---

### PATCHED

The vulnerable implementation receives the mitigation:

```text
human_confirmation: true
```

The original exploit must stop working while legitimate confirmed transfers remain available.

---

## 10. Testing Requirement

Every implemented vulnerability must eventually include three tests:

```text
test_vulnerable_behavior
test_safe_behavior
test_patched_behavior
```

The expected relationship is:

```text
VULNERABLE
attack succeeds

SAFE
attack fails

PATCHED
same attack that previously succeeded now fails
```

Legitimate functionality should continue to work when appropriate.

---

## 11. Security Principle

DemoCorp is designed to contain vulnerabilities intentionally, but it must never become dangerous to the host or external systems.

Therefore:

```text
security weakness inside DemoCorp
        !=
unsafe laboratory infrastructure
```

The applications may be intentionally vulnerable.

The range itself must remain controlled.
