# Risk register — v6.0.0

| Risk | Severity | Mitigation | Residual risk |
|---|---|---|---|
| OAuth provider configured incorrectly | High | Hide buttons unless provider is listed; callback allowlist | Live provider-console testing required |
| In-process analysis does not scale horizontally | High | Idempotent sessions and worker claim state | Managed queue required before high traffic |
| Analysis stage granularity is coarse | Medium | Show only stored server-confirmed stages | Python API needs event callbacks for finer stages |
| Browser refresh loses unsubmitted local file bytes | Medium | Draft fields persist; UI requests file reselection honestly | Full resumable multipart upload is future work |
| Existing secondary v5 pages retain older visual components | Medium | Core six-step journey and `/home` use v6 light design | Secondary-page visual consolidation remains |
| Social account linking collisions | Medium | Supabase provider identity model | Manual multi-provider account-link testing required |
| Deterministic coaching fallback has limited language breadth | Low | Safe, report-grounded answers and explicit refusal | Optional LLM can be added behind schema validation |
| Migration 022 not installed | High | Installation script and version checks | Journey persistence and coaching tables unavailable |
