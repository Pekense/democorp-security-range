# Publication security review

Review date: 2026-10-06. Source revision: `bdbfe89d58642043dedc5a57357509cab7c9f55c` (`main`).

## Scope and method

The one remote branch and its eight reachable commits were inspected through the authenticated GitHub API. Gitleaks `8.30.1` scanned 119 distinct current/historical text blobs with default rules and 100% redaction. Additional checks covered credential formats, assignments, private addresses and known employer-specific references.

The portal's binary `favicon.ico` could not be read through the text API and was excluded. Unreachable Git objects, untracked files, repository settings/secrets, PR/issue attachments, workflow artifacts and live deployments are outside scope. This is not a dependency-vulnerability audit or a full penetration test.

## Results

- No Gitleaks matches or operational credentials were identified in the scanned content.
- `.env.example` contains local configuration rather than operational secrets.
- Customer/order data inspected are fictional laboratory fixtures; customer email addresses use `example.test`.
- No known employer-specific reference was identified by the additional checks.

## Deployment findings

| Finding | Implication / recommended action |
| --- | --- |
| Ollama publishes `11434:11434` | Bind to `127.0.0.1:11434:11434` on shared/networked hosts |
| Three placeholder services declare all-interface host ports | Remove unused mappings or bind them to loopback before implementing/listening |
| Backend API joins the audit network | Do not describe it as accessible only from the internal network |
| Portal, APIs and confirmation flow lack enterprise identity controls | Local lab use only; add authentication and authorization before shared deployment |
| VULNERABLE confirmation variant is intentional | Keep isolated and restore SAFE after demonstrations |

These configuration changes were identified, not silently applied. The updated README documents the existing behavior and limitations. Docker network segmentation does not replace authentication.

## Validation actually performed

| Check | Result |
| --- | --- |
| Backend API unit suite | 5 passed |
| MCP tool unit suite | 5 passed |
| Finance Agent + missing-confirmation security suite | 26 passed |
| Portal Vitest suite | 16 passed across four files |
| Portal production build | Passed |

Python suites ran in separate processes because each service uses the package name `app`. Backend fixture paths were pointed to the repository data in the test process because `/data` is normally a container mount. Finance tests used the repository `configs` through `FINANCE_AGENT_CONFIG_ROOT`. No source changes were needed for these adaptations.

The agent tests use fake LLM/MCP clients. Docker is unavailable in this review environment; Compose execution, network isolation and live Ollama end-to-end behavior were not validated. The excluded favicon was not required for the portal build.

## Publication assessment

No operational-secret blocker was identified within the stated scope. The source can be presented as an intentionally controlled laboratory once these caveats are visible. This does not authorize or certify a network-facing deployment. Customer Chatbot, RAG Assistant and LLM Application remain placeholders.
