# AceCoach AI v6.0.0

**Release:** Simple Athlete Journey

AceCoach is a multi-sport, video-led coaching platform organized around one clear path:

**Choose sport → Sign in → Upload → Analyze → Report → Coach**

## v6 highlights

- sport-only landing page with tennis, badminton, squash, cricket, and table tennis;
- authentication that preserves the selected sport and goes directly to intake;
- configuration-gated Google, Apple, Microsoft, and Facebook sign-in plus email auth;
- combined upload, mandatory movement selection, essential profile context, and consent;
- visible upload-complete state, replace, delete, checksum, and duplicate protection;
- server-confirmed analysis stages and explicit movement-conflict resolution;
- four-section light report with one primary correction and technical detail collapsed;
- synchronized human motion comparison preserved from v5;
- persistent report-grounded coaching conversation with deterministic safety boundaries;
- returning-user home that does not interrupt the first analysis journey.

## Install

See `docs/INSTALL_V600.md`.

```bash
npm install
npm run setup:analysis
npm run typecheck
npm run lint
npm run test:analysis
npm run verify:v6
npm run dev:all
```

`npm run dev:all` starts both the Next.js app on port 3000 and the Python analysis API on port 8000. It installs the isolated Python environment, verifies the MediaPipe pose model, loads `.env.local` for both services, and stops both processes together.

With both services running, use `npm run verify:runtime` to check the connected Supabase schema, coaching-persistence mode, video-storage allowlist, and analysis health endpoint. Open `http://localhost:3000/version` and confirm version **6.0.0**. Apply migrations 022 through 029 in numeric order. Environments awaiting the additive longitudinal migrations continue saving analysis reports; multi-session and cross-stroke development insights begin after migrations 026–027 are available, with policy/index hardening in 028–029.

OAuth buttons are displayed only for providers listed in `NEXT_PUBLIC_AUTH_PROVIDERS`. Add a provider only after it is enabled in Supabase and its external provider console.

## Scientific and implementation boundary

The active engine remains monocular and pose-led. It does not claim calibrated 3D, forces, joint loading, injury diagnosis, genuine cohort percentiles, exact ball contact, or photorealistic player reconstruction. The coaching conversation is a deterministic, stored-report-grounded fallback unless a separately validated model provider is integrated.
