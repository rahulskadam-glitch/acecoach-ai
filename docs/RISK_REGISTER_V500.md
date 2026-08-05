# AceCoach AI v5 risk register

| Risk | Severity | Likelihood | Impact | Mitigation in v5 | Residual risk / next action |
|---|---|---:|---|---|---|
| User believes “player-proportioned” means photorealistic same-player reconstruction | High | Medium | Trust loss | Explicit selector language and disclaimer | Rename again after usability test; do not launch player-textured claim until validated |
| Browser refresh cannot resume file bytes | Medium | High | User repeats selection | Safe pending metadata, clear recovery banner, checksum dedupe | Implement TUS/resumable storage |
| Client-computed checksum uses memory for large file | Medium | Medium | Mobile memory pressure | 500 MB limit; checksum only during upload | Add streaming hash or server checksum for mobile |
| Duplicate checksum record returns existing video while new object uploads | High | Low | Orphan storage | Client removes newly uploaded duplicate path | Add scheduled orphan reconciliation |
| Migration 021 absent | Medium | Medium | Support/checksum features fail | Explicit install gate and verification | Add schema capability check in UI |
| Pose-only engine produces misleading equipment/contact claims | Critical | Medium | Bad coaching | Proxy labels, reliability gates, withheld unsupported metrics | Build and validate racket/ball models |
| Reference silhouette seen as universal elite template | High | Medium | Technique oversimplification | Exemplar disclaimer and category lens | Independent coaching panel review |
| Current category references are deterministic templates, not population cohorts | High | High | False benchmarking interpretation | No percentile language | Build consented, representative reference data |
| Coach sharing is not a complete collaboration workflow | Medium | High | User expectation gap | Secure summary link retained; no false “coach workspace complete” claim | Add permissions, annotations, SLA, audit |
| Support description contains personal data | Medium | Medium | Privacy | Length control, control-character sanitization, no automatic attachment | Add PII warning and internal redaction |
| Feedback events could be abused by service code | Medium | Low | Product manipulation | Service-role-only tables and governance | Add admin authorization and immutable audit log |
| Payment preview is mistaken for live billing | Medium | Medium | Commercial confusion | Explicit payment-disabled copy | Separate public plan preview from live checkout |
| Large server action remains mixed-responsibility | High | High | Fragility | New boundaries and staged refactor | Split before major agent orchestration changes |
| No browser-rendered screenshots in constrained build environment | Medium | Medium | Packaging regression | Static verifier and dev/build checks | Add Playwright in CI and attach screenshots |
