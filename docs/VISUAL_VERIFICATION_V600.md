# Visual verification record — v6.0.0

Active Next.js routes were rendered in the in-app browser at desktop and mobile viewports on 2 August 2026. Authenticated screens used `ACECOACH_VISUAL_QA=true`, a development-only route-rendering mode that is explicitly disabled when `NODE_ENV=production`; it creates no account and writes no database data.

## Captured active routes

| Screenshot | Active route / state |
|---|---|
| `01-sport-selection-desktop.png` | `/`, desktop |
| `02-sport-selection-mobile.png` | `/`, 320 px viewport |
| `03-authentication.png` | `/auth?sport=tennis` |
| `04-upload-and-intake.png` | `/start?sport=tennis` |
| `05-analysis-processing.png` | `/analysis/visual-qa`, confirmed processing state |
| `06-report-summary.png` | `/report/visual-qa#coach-summary` |
| `07-watch-and-compare.png` | `/report/visual-qa#watch-compare` |
| `08-practice-plan.png` | `/report/visual-qa#practice-reassess` |
| `09-coaching-conversation-desktop.png` | `/coach/visual-qa`, desktop |
| `10-coaching-conversation-mobile.png` | `/coach/visual-qa`, 375 px viewport |
| `11-returning-user-home.png` | `/home` |

The DOM inspection confirmed all five sport cards, exact v6 age bands, mandatory movement selection, four server-confirmed analysis stages, exactly four report sections, one primary correction, collapsed advanced analysis, grounded coaching context, and no horizontal overflow at the tested mobile widths.

Screenshots are stored in `docs/screenshots/v600/` and were captured from the active components rather than recreated as mock artwork.
