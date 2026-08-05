# Phase 1 Refactor Report

## Why this refactor was necessary
The prototype had a strong UI but mixed browser/server Supabase patterns, guessed cookie names, a deprecated Next.js middleware convention, duplicate and mismatched routes, uncaught Server Action errors, incomplete database relationships, and a mock API ID bug. Those issues made authentication appear inconsistent even when Supabase itself was working.

## Important corrections
- Replaced generic Supabase clients with official SSR browser/server clients.
- Added cookie refresh through Next.js 16 Proxy.
- Made server actions return stable results to client forms instead of throwing ordinary user errors as HTTP 500s.
- Added the Auth callback and password update flow.
- Restored the real Signup page and moved verification UI to `/signup/success`.
- Fixed navigation and logout behavior.
- Added ownership foreign keys and deletion cascades.
- Rebuilt RLS/storage policies as explicit owner-scoped rules.
- Added automatic profile creation from signup metadata.
- Added application config, logging, global error UI, and an environment template.
- Added a provider-neutral AI contract/router, preserving the multi-model architecture discussed for OpenAI, Anthropic, Gemini, xAI, DeepSeek, Mistral, and local models.
- Corrected the mock analysis API so POST and GET use the same analysis ID.
- Restricted development CORS instead of allowing every origin with credentials.

## Deliberately deferred
- Real OpenCV/MediaPipe processing.
- Job queue and event bus.
- AI provider SDK adapters.
- Billing and regional pricing.
- Coach/academy portals.

These remain architectural extension points, not premature infrastructure in the MVP.
