# v6 change map

| User problem | Platform area | Implementation | Validation |
|---|---|---|---|
| Landing page overload | `/` | Sport-only light landing | Static verification and route render |
| Dashboard interruption | auth redirects | `/auth` continues to `/start`; `/dashboard` redirects `/home` | Typecheck and route map |
| Fragmented intake | `/start` | Combined upload, movement, and essential profile form | Mandatory-field and upload-state checks |
| Silent movement assumptions | analysis session | Explicit conflict card and confirmation actions | Existing classifier integrity tests |
| Fake-looking progress | `/analysis/[id]` | Server-confirmed stage polling; no countdown | Integration verification |
| Dense report | `/report/[id]` | Four-section light player report | V6 static checks and rendered route |
| Generic chatbot risk | `/coach/[id]` | Stored-report-only deterministic coaching fallback | Safety rules and red-team cases |
| Broken social buttons | `/auth` | Provider buttons controlled by environment list | Disabled providers absent by default |
| Lost journey context | journey module | Sport cookie, anonymous token, journey table | Migration and route tests |
| Data migration risk | Supabase | Additive migration 022 with RLS | SQL review and verification queries |
