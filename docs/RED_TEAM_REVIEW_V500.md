# AceCoach AI v5 red-team review

## Round 1 — Architecture and integration

**Attack:** Search for route-owned biomechanics, direct service-role use in client code, duplicate domain types, and unused “promised” components.  
**Findings:** analysis server action and comparison component remain large; feature boundaries were incomplete.  
**Resolution:** added public domain contracts for storage, jobs, analysis, practice, billing, upload state, and observability. Kept working logic in place under a strangler plan.  
**Open:** enforce dependency rules and split analysis action.

## Round 2 — Media reliability and data loss

**Attack:** refresh during upload, repeat upload, metadata-registration failure, delete another user’s video, download guessed ID.  
**Findings:** no refresh record, no direct download, no checksum dedupe.  
**Resolution:** safe pending record, bounded upload retry, registration rollback, SHA-256 unique owner index, owner-checked signed download, existing owner-checked delete.  
**Open:** true byte resume and scheduled orphan scan.

## Round 3 — AI and biomechanics integrity

**Attack:** selected forehand but detected backhand; unsupported sport; weak capture; no repetition; low-confidence contact; same video rerun.  
**Resolution retained:** confirmation gate, no-score behavior, quality messages, engine-version context.  
**Additional v5 control:** visible Trust Summary and methodology labels.  
**Open critical:** trained movement classification, object tracking, independent metric validation. No claims were added for these.

## Round 4 — Motion-twin visual honesty

**Attack:** overlay clutter, bone-like reference, duplicate player under twin, generic gender inference, universal-pro template.  
**Resolution:** player video clean by default; optional one-guide toggle; filled tapered vector silhouette; profile/selector choice rather than appearance inference; explicit non-motion-capture disclaimer.  
**Open critical:** same-player textured avatar, segmentation, temporal inpainting, and learned retargeting are not implemented and must not be claimed.

## Round 5 — Usability and duplication

**Personas:** beginner, junior/parent, advanced athlete, coach, biomechanist.  
**Attack tasks:** find main correction, see evidence, understand cue, know success target, start practice, find advanced detail.  
**Resolution:** primary priority appears once; “Show me”; success target; four numbered sections; advanced details collapsed; Practice added to navigation.  
**Open:** formal five-second moderated usability test and accessibility audit.

## Round 6 — Security and privacy

**Attack:** cross-user signed URL, guessed video ID, direct support writes, raw video in diagnostic report, malicious control characters, feedback poisoning.  
**Resolution:** owner filters and path checks; 60-second signed URL; service-role-only support writes; sanitized diagnostic description; no raw media/pose/secrets; service-role-only feedback decision tables.  
**Open:** complete IDOR/SSRF/prompt-injection automated suite, PII redaction, rate limiting for support.

## Round 7 — Commercial trust and final package

**Attack:** hidden limits, payment before cancellation/export works, surprise renewal, lost historical reports, nested ZIP root, secrets/generated artifacts.  
**Resolution:** centralized plan matrix; payment disabled; renewal and historical-access language; clean-package checklist and v5 verifier.  
**Open:** live billing is blocked until cancellation, refund, export, and historical access are end-to-end tested.

## Release decision

v5 can be released as a **review-led trust and architecture foundation** after typecheck, lint, Python tests, static integration verification, and build/dev route checks. It must not be marketed as a validated same-player generative motion twin, full coach marketplace, live CV practice counter, or calibrated biomechanics platform.
