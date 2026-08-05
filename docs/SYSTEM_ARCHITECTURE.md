# AceCoach AI System Architecture

## Product intent
AceCoach AI is an AI-native tennis intelligence platform, not a single-model wrapper. The MVP serves players; the architecture leaves clean expansion paths for coaches, academies, and federations.

## Experience layer
- Next.js web application: public dark-theme marketing pages and authenticated coaching workspace.
- Future clients: mobile app, coach portal, academy portal, and public API.

## Platform domains
- Identity and access: Supabase Auth, cookie-based SSR sessions, route protection, roles.
- Player: profile, level, age, handedness, ranking system/value, goals.
- Video: private storage, metadata, lifecycle status, signed access.
- Analysis: processing jobs, biomechanics metrics, reports, recommendations.
- Progress: longitudinal player model (the future Digital Twin).

## AI architecture
Application features call an `AiRouter`, never a vendor SDK directly. Providers implement one interface and may include OpenAI, Anthropic, Gemini, xAI, DeepSeek, Mistral, or local models. Routing will later consider task capability, quality, latency, region, cost, availability, and fallback policy.

## Video intelligence pipeline
Upload -> validation -> private object storage -> job creation -> transcode/frame extraction -> pose/court/ball detection -> stroke segmentation -> biomechanics -> structured metrics -> AI coaching report -> persisted result.

The LLM receives compact structured tennis metrics, not every video frame. This keeps cost and hallucination risk under control.

## Evolution strategy
The MVP is a modular monolith plus asynchronous Python analysis service. Do not introduce microservices or an event bus until workload and team boundaries justify them. Domain events and job records provide the migration seam.
