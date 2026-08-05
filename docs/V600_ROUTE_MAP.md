# AceCoach AI v6.0.0 route map

## Canonical first-analysis journey

| Step | Route | Purpose | Primary action |
|---|---|---|---|
| 1 | `/` | Select one sport | Select sport |
| 2 | `/auth` | Sign in or create account | Continue with configured provider or email |
| 3 | `/start` | Upload and provide essential context | Analyze my video |
| 4 | `/analysis/[id]` | Show server-confirmed analysis state | Confirm movement or open report |
| 5 | `/report/[id]` | Understand one correction and practice plan | Start coaching conversation |
| 6 | `/coach/[id]` | Ask report-grounded coaching questions | Send question |

## Compatibility routes

- `/login` redirects to `/auth`.
- `/signup` redirects to `/auth`.
- `/upload` redirects to `/start`.
- `/dashboard` redirects to `/home`.
- Existing v5 report links that open `/analysis/[id]` are safely redirected to `/report/[id]` after completion.

## Returning-user destinations

- `/home`
- `/library`
- `/practice`
- `/progress`
- `/profile`
- `/support`
- `/settings`
- `/methodology`
- `/pricing`
