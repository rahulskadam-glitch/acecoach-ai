# Provider-Agnostic AI Architecture

## Rule
No product component imports an AI vendor SDK directly. All requests go through the AI Router.

## Initial tasks
- `coaching_report`: reason over structured biomechanics and player context.
- `coach_chat`: conversational follow-up grounded in the report and tennis knowledge base.
- `frame_review`: review selected key frames only.
- `practice_plan`: create drills and a concrete next-session plan.

## Routing policy (future)
1. Enforce plan limits and budget.
2. Filter providers by task and regional availability.
3. Rank by quality, latency, and estimated cost.
4. Execute with timeout and safe fallback.
5. Validate structured output.
6. Record provider, model, prompt version, latency, token use, and estimated cost.

## Separation from computer vision
Pose estimation, ball tracking, court detection, and stroke segmentation are deterministic/video ML workloads. LLMs explain and personalize the structured output; they do not replace the biomechanics pipeline.
