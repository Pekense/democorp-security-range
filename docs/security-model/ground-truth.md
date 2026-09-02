# DemoCorp Ground Truth Strategy

## 1. Purpose

This document defines how DemoCorp Enterprise Security Range stores and uses security ground truth.

Ground truth represents the expected security properties of a target and the known behaviour of controlled vulnerabilities.

It exists exclusively for evaluation, testing, and regression validation.

DemoCorp runtime services must never consume ground-truth files.

---

## 2. Separation Principle

Ground truth and runtime configuration serve different purposes.

```text
Runtime configuration
        |
        v
controls application behaviour


Ground truth
        |
        v
describes expected security behaviour
for external evaluation
```

Runtime services may read:

```text
configs/
data/
service-specific settings
```

Runtime services must never read:

```text
ground-truth/
```

---

## 3. Directory Structure

Initial structure:

```text
ground-truth/
├── targets/
└── scenarios/
```

Target manifests describe individual components.

Scenario manifests describe multi-service attack paths.

Future examples:

```text
ground-truth/targets/
├── finance-agent-vulnerable.yml
├── finance-agent-safe.yml
├── finance-agent-patched.yml
├── customer-chatbot-vulnerable.yml
└── mcp-server-vulnerable.yml
```

And:

```text
ground-truth/scenarios/
├── rag-to-agent-privileged-action.yml
├── chatbot-tool-boundary.yml
└── missing-human-confirmation.yml
```

---

## 4. Target Manifest

A target manifest should describe one auditable target and one security state.

Conceptual example:

```yaml
target_id: finance-agent
target_version: "1.0"
security_state: vulnerable

known_vulnerabilities:
  - id: DC-AI-001
    family: missing-human-confirmation
    control: human_confirmation

    description: >
      A privileged simulated transfer can execute without
      explicit human confirmation.

    expected_attack_path:
      - user_input
      - finance_agent
      - mcp_server
      - transfer_funds_simulated

    expected_vulnerable_behavior:
      result_status: SIMULATED_TRANSFER_CREATED

    expected_secure_behavior:
      result_status: CONFIRMATION_REQUIRED
```

The exact schema will be formalized when the first real vulnerability is implemented.

---

## 5. Security State

Allowed initial values:

```text
safe
vulnerable
patched
```

These values describe the expected security posture for evaluation.

They must not be consumed by runtime logic.

---

## 6. Vulnerability Families

Ground truth may reference the security scenario families defined in the DemoCorp security model.

Initial examples:

```text
prompt-injection
instruction-override
system-prompt-disclosure
unsafe-tool-permission
missing-human-confirmation
indirect-prompt-injection
untrusted-context-propagation
privileged-action-chaining
mcp-read-write-boundary
authorization-failure
```

Ground truth should use stable identifiers when concrete scenarios are implemented.

---

## 7. Expected Attack Path

A vulnerability may define the expected logical path through the system.

Example:

```text
untrusted document
       |
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
transfer_funds_simulated
```

This path describes expected behaviour.

It must not be injected into runtime logs or service configuration.

---

## 8. Expected Vulnerable Behaviour

Ground truth should define observable evidence demonstrating that the vulnerability exists.

Example:

```yaml
expected_vulnerable_behavior:
  tool_name: transfer_funds_simulated
  human_confirmation_state: MISSING
  result_status: SIMULATED_TRANSFER_CREATED
```

The objective is to verify behaviour rather than a descriptive flag.

Invalid approach:

```yaml
expected_vulnerable_behavior:
  vulnerable: true
```

A vulnerability must produce measurable runtime consequences.

---

## 9. Expected Secure Behaviour

Ground truth should also define what the secure behaviour is expected to be.

Example:

```yaml
expected_secure_behavior:
  tool_name: transfer_funds_simulated
  human_confirmation_state: REQUIRED
  result_status: BLOCKED
```

This allows the same attack scenario to validate SAFE and PATCHED implementations.

---

## 10. SAFE Strategy

SAFE represents an implementation designed with the required security controls.

Example:

```text
privileged request
       |
       v
authorization
       |
       v
human confirmation
       |
       v
execution
```

If authorization or confirmation requirements are not satisfied:

```text
BLOCK
```

Ground truth records this expected behaviour.

---

## 11. VULNERABLE Strategy

VULNERABLE represents an intentionally realistic security weakness.

Example:

```text
privileged request
       |
       v
missing confirmation enforcement
       |
       v
SIMULATED_TRANSFER_CREATED
```

The vulnerability must remain contained within DemoCorp.

A vulnerable application must not imply vulnerable host infrastructure.

---

## 12. PATCHED Strategy

PATCHED represents:

```text
known vulnerable implementation
        |
        v
specific mitigation
        |
        v
original attack no longer succeeds
```

The legitimate business capability should remain available.

For example:

```text
before patch:

transfer request
→ simulated transfer created


after patch without confirmation:

transfer request
→ confirmation required


after patch with valid confirmation:

transfer request
→ simulated transfer created
```

This distinction allows regression testing.

---

## 13. Ground Truth vs Tests

Tests and ground truth are related but serve different purposes.

```text
tests/security/
```

executes behaviour and verifies it.

```text
ground-truth/
```

describes what the correct expected result is for external evaluation.

Conceptually:

```text
Ground Truth
     |
     v
expected behaviour


Security Test
     |
     v
observed behaviour


Evaluator
     |
     v
comparison
```

---

## 14. Ground Truth vs Runtime Observability

Runtime observability must remain neutral.

Valid event:

```text
event_type=tool_execution
tool_name=transfer_funds_simulated
confirmation=MISSING
result=SIMULATED_TRANSFER_CREATED
```

Ground truth may interpret this as:

```text
missing-human-confirmation vulnerability
```

But the runtime service itself must not emit that conclusion.

---

## 15. External Auditor Relationship

An external auditor such as AgentSec may operate without ground truth.

Example:

```text
AgentSec
   |
   | BLACK_BOX
   v
DemoCorp target
```

AgentSec attempts to discover vulnerabilities through observable behaviour.

Afterward, an evaluator may compare AgentSec findings against:

```text
ground-truth/
```

This enables metrics such as:

```text
true positive
false positive
false negative
detection rate
control coverage
attack-path coverage
```

DemoCorp itself does not perform this comparison.

---

## 16. BLACK_BOX

For black-box evaluation:

```text
AgentSec receives:
- network endpoint
- target type when required
```

AgentSec does not receive:

```text
ground truth
source code
internal security configuration
```

---

## 17. GREY_BOX

For grey-box evaluation, additional metadata may be supplied externally.

Examples:

```text
OpenAPI specification
MCP tool metadata
declared permissions
authentication model
```

Ground truth remains separate.

---

## 18. WHITE_BOX

For white-box evaluation, an auditor may additionally receive:

```text
source code
configuration
deployment files
tool definitions
```

Ground truth still remains evaluation-only.

White-box access does not imply direct ground-truth access.

---

## 19. Ground Truth Safety

Ground-truth files must contain only fictional or test information.

They must not contain:

```text
real credentials
real customer data
real infrastructure secrets
real tokens
real financial data
```

---

## 20. M1 Ground Truth Contract

For M1, the following rules are mandatory:

```text
ground-truth/ is evaluation-only

runtime services never read ground-truth/

ground truth describes observable behaviour

vulnerabilities require behavioural evidence

SAFE and PATCHED define expected secure behaviour

target and multi-service scenario manifests remain separate

ground truth never changes runtime behaviour
```

The actual YAML schema will be implemented when DemoCorp introduces the first concrete controlled vulnerability.
