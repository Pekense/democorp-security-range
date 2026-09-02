# DemoCorp Data Model

## 1. Purpose

This document defines the initial shared business data model used across DemoCorp Enterprise Security Range.

The goal is to ensure that all services operate over one coherent fictional enterprise rather than isolated datasets.

The model is intentionally small during M1. It will evolve only when new business functionality requires it.

---

## 2. Design Principles

The data model follows these rules:

1. DemoCorp services share the same enterprise concepts.
2. Business entities and security identities are different concepts.
3. Every state-changing operation should preserve who requested it.
4. Dangerous actions must remain simulated.
5. IDs must be stable and suitable for logs and correlation.
6. No real customer information or secrets are allowed.
7. Runtime services must not depend on ground-truth data.

---

## 3. Core Entities

Initial entities:

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

Conceptual relationships:

```text
Customer
   |
   +---- Identity
   |
   +---- Account
   |
   +---- Orders
            |
            +---- Refunds

Document
   |
   +---- source / trust metadata

Identity
   |
   +---- requests business operations
```

---

## 4. Customer

Represents a DemoCorp customer as a business entity.

Example:

```text
customer_id: CUST-001
name: Alice Romero
email: alice.romero@example.test
status: active
```

Initial fields:

```text
customer_id
name
email
status
```

### Security note

A Customer is not the same thing as an authenticated Identity.

A business record does not automatically represent who is currently performing an action.

---

## 5. Identity

Represents an actor capable of interacting with DemoCorp.

Possible actors:

```text
customer
employee
finance_operator
support_operator
service
```

Example:

```text
identity_id: USER-001
identity_type: customer
role: customer
customer_id: CUST-001
status: active
```

Initial fields:

```text
identity_id
identity_type
role
customer_id
status
```

`customer_id` may be optional because not every identity represents a customer.

Example:

```text
identity_id: EMP-001
identity_type: employee
role: finance_operator
customer_id: null
```

### Security importance

Keeping Identity separate from Customer allows DemoCorp to test:

```text
authorization
impersonation
privilege escalation
confused deputy scenarios
identity propagation failures
```

---

## 6. Account

Represents a fictional DemoCorp financial account.

Example:

```text
account_id: ACC-001
customer_id: CUST-001
balance: 8500.00
currency: EUR
status: active
```

Initial fields:

```text
account_id
customer_id
balance
currency
status
```

All balances are fictional.

No account represents a real financial institution.

---

## 7. Order

Represents a product or service order.

Example:

```text
order_id: ORD-1001
customer_id: CUST-001
product_name: DemoCorp Business Laptop
amount: 1299.00
currency: EUR
status: delivered
```

Initial fields:

```text
order_id
customer_id
product_name
amount
currency
status
```

Possible status values:

```text
pending
processing
shipped
delivered
cancelled
```

---

## 8. Refund

Represents a refund request associated with an order.

Example:

```text
refund_id: REF-001
order_id: ORD-1001
requested_by: USER-001
amount: 1299.00
status: requested
```

Initial fields:

```text
refund_id
order_id
requested_by
amount
status
```

Possible status values:

```text
requested
approved
rejected
simulated_completed
```

### Security importance

`requested_by` must preserve the identity responsible for the request.

This allows us to distinguish:

```text
who owns the order
```

from:

```text
who requested the refund
```

Those may not always be the same identity.

---

## 9. Notification

Represents a simulated outbound business notification.

Example:

```text
notification_id: NOT-001
recipient: alice.romero@example.test
channel: email
message_type: refund_status
requested_by: USER-001
status: simulated
```

Initial fields:

```text
notification_id
recipient
channel
message_type
requested_by
status
```

Notifications must never be delivered to real external systems.

Expected result:

```text
SIMULATED_NOTIFICATION
```

---

## 10. SimulatedTransfer

Represents a privileged but fully simulated financial operation.

Example:

```text
transfer_id: TRF-001
source_account_id: ACC-001
destination_account_id: ACC-002
amount: 500.00
currency: EUR
requested_by: USER-001
status: simulated
```

Initial fields:

```text
transfer_id
source_account_id
destination_account_id
amount
currency
requested_by
status
```

Possible status values:

```text
requested
confirmation_required
denied
simulated
```

### Critical safety rule

A `SimulatedTransfer` must never:

```text
contact a bank
call a financial API
move real funds
reach external infrastructure
```

It only creates local DemoCorp state.

---

## 11. Document

Represents information that can later be retrieved by the RAG Assistant.

Example:

```text
document_id: DOC-001
title: DemoCorp Refund Policy
document_type: policy
source_id: corporate-policy-store
trust_level: trusted
```

Initial fields:

```text
document_id
title
document_type
source_id
trust_level
path
```

Possible document types:

```text
policy
manual
faq
procedure
product_information
```

Possible trust levels:

```text
trusted
untrusted
unknown
```

### Security importance

The trust level describes the origin/context of the document.

It must not automatically determine whether its contents are safe instructions.

For example:

```text
trusted corporate source
        !=
safe prompt instructions
```

This distinction will become important in RAG security scenarios.

---

## 12. Identity and Ownership

DemoCorp must distinguish three concepts:

```text
identity
ownership
authorization
```

Example:

```text
USER-001
    |
    v
represents CUST-001
    |
    v
owns ACC-001
```

This does not automatically mean:

```text
USER-001 may perform every operation on ACC-001
```

Authorization remains an explicit security decision.

---

## 13. Request Attribution

Every state-changing business operation should preserve:

```text
requested_by
```

Where useful, runtime events will additionally contain:

```text
request_id
trace_id
actor_id
```

Example:

```text
USER-001
   |
   | request_id=req-123
   | trace_id=trace-456
   v
Finance Agent
   |
   v
MCP Server
   |
   v
transfer_funds_simulated
   |
   v
TRF-001
requested_by=USER-001
```

The business record preserves attribution even after the request has completed.

---

## 14. IDs

Initial ID conventions:

```text
CUST-###   Customer
USER-###   Customer/user identity
EMP-###    Employee identity
SVC-###    Service identity
ACC-###    Account
ORD-####   Order
REF-###    Refund
NOT-###    Notification
TRF-###    Simulated transfer
DOC-###    Document
```

These IDs are intended for readability inside a controlled range.

They are not intended to imitate production globally unique identifiers.

Runtime correlation identifiers such as `request_id` and `trace_id` should use separate generated values.

---

## 15. Initial Example Dataset

Conceptually, DemoCorp may start with:

```text
Customer
CUST-001
Alice Romero

Identity
USER-001
role=customer
customer_id=CUST-001

Account
ACC-001
customer_id=CUST-001
balance=8500 EUR

Order
ORD-1001
customer_id=CUST-001
amount=1299 EUR

Document
DOC-001
DemoCorp Refund Policy

Employee Identity
EMP-001
role=finance_operator
```

Additional records will be added when required by concrete scenarios.

---

## 16. Shared Data Strategy

DemoCorp services should consume common business information through explicit service interfaces.

The preferred runtime flow is:

```text
Application
     |
     v
MCP / Backend API
     |
     v
Business Data
```

Services should not independently copy and mutate business datasets without a specific architectural reason.

For example:

```text
Finance Agent --> Backend database directly
```

is discouraged.

Preferred:

```text
Finance Agent
     |
     v
MCP Server
     |
     v
Backend API
```

---

## 17. Data vs Ground Truth

Business data:

```text
data/
```

belongs to the fictional company and can be consumed by runtime services where appropriate.

Ground truth:

```text
ground-truth/
```

belongs to the evaluation system.

They must remain separate.

Conceptually:

```text
DemoCorp Business Data
        |
        v
DemoCorp Runtime


Ground Truth
        X
DemoCorp Runtime
```

---

## 18. Future Evolution

The model may later include entities such as:

```text
Role
Permission
Session
ToolExecution
Approval
AuditEvent
Product
SupportTicket
```

These should only be added when required by actual functionality.

M1 intentionally avoids over-designing the database before the business flows exist.

---

## 19. M1 Data Model Contract

For M1, the minimum agreed entities are:

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

The most important security rules are:

```text
Customer != Identity

ownership != authorization

requested_by must survive state-changing operations

dangerous operations remain simulated

runtime data != ground truth
```
