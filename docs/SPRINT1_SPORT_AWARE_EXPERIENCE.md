# Sprint 1 — Sport-aware experience

## Delivered

- Added sport-specific hero copy, coaching focus areas, icons, and filming guidance to the shared sport registry.
- Rebuilt the landing hero around an interactive sport selector.
- Made the analysis preview, headline, CTA, and coaching language update with the selected sport.
- Connected the landing CTA to the upload flow through validated `sport` and `action` query parameters.
- Added sport-specific recording guidance to the upload experience.
- Preserved a single shared registry as the source of truth for landing and upload behavior.

## Validation

- TypeScript typecheck passed.
- ESLint passed.
- Next.js production build passed.

## Next recommended vertical slice

Create durable analysis jobs after upload, including queued status, processing stages, failure handling, and dashboard progress.
