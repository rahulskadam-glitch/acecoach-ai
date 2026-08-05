# Red-team review — v6.0.0

## Round 1: flow simplification

Resolved: root-page marketing overload, dashboard detour, repeated sport selection, and separate profile prerequisite. The first-analysis route now has one dominant decision per step.

## Round 2: authentication

Implemented strict local-path validation in the callback, provider-button gating, and preservation of sport in callback destination. Remaining operational dependency: each provider must still be configured correctly in the Supabase console and provider portal.

## Round 3: upload and ownership

Retained checksum protection, owner-scoped paths, signed downloads, orphan cleanup, and explicit delete. Browser refresh cannot reconstruct local file bytes; the UI does not claim otherwise.

## Round 4: analysis integrity

Retained no-score gates and explicit movement confirmation. Queued sessions are idempotent for the same video, engine version, and athlete-context fingerprint. The current API is still a synchronous analysis service behind a durable status record; a distributed production queue remains a future scaling step.

## Round 5: report comprehension

Reduced the active report to four primary sections and one main correction. The synchronized comparison retains a dark media canvas inside an otherwise light report to preserve video contrast.

## Round 6: coaching conversation

Attempted categories: invented metric, injury diagnosis, force, exact ball speed, professional equivalence, and unsafe volume. The deterministic fallback refuses unsupported claims and uses stored report values only. A future generative provider must pass the same schema and safety gates.

## Round 7: accessibility

Core journey uses semantic labels, visible focus states, 44-pixel controls, responsive stacking, reduced-motion handling, and non-colour status text. Full screen-reader testing remains a manual pre-production requirement.

## Round 8: package integrity

Required checks cover v6 version, active route imports, migration presence, package root, and exclusion of secrets/generated directories before ZIP creation.
