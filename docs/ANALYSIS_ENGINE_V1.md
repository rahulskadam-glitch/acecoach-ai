# AceCoach AI Analysis Engine v1

> **Historical document.** This describes an earlier engine and is superseded by `RED_TEAM_REVIEW_V24.md` and the v2.4 implementation. Do not use its capability claims or setup steps as the current source of truth.


## What this release delivers

This release creates the first complete upload-to-report analysis workflow:

1. Athlete uploads a video.
2. The upload is stored in Supabase.
3. The athlete clicks **Analyze**.
4. A versioned analysis session and report are created.
5. The athlete is redirected to a professional multi-section report.

## Important disclosure

Version 1 is a **deterministic development engine**. It uses sport-specific coaching packs, athlete profile context, transparent weighted scoring, drill prescriptions, confidence, safety notes, and limitations. It does **not yet inspect the video frames or calculate pose landmarks**.

This is deliberate: it validates the product contract and database/report architecture before MediaPipe/OpenCV measurements are introduced.

## Included sport packs

- Tennis forehand
- Badminton smash
- Cricket fast bowling
- Squash backhand drive
- Table-tennis forehand drive

Other selected movements currently fall back to the closest pack for that sport. Dedicated packs should be added movement by movement.

## Database setup

Run the following migration once in the Supabase SQL Editor:

```text
supabase/006_analysis_engine.sql
```

The migration creates:

- `analysis_sessions`
- `analysis_reports`
- indexes
- row-level-security policies
- cascade cleanup when a video is deleted

## Testing

1. Run `npm install`.
2. Run `npm run dev`.
3. Sign in.
4. Open `/upload`.
5. Upload a short MP4 or MOV.
6. Click **Analyze** beside the completed upload.
7. Review the generated report.

## Quality gates completed

- TypeScript typecheck: passed
- ESLint: passed
- Next.js production build: passed

## Next technical layer

The next engine version should add asynchronous computer-vision processing:

- video-quality assessment
- frame extraction
- person and implement tracking
- movement repetition detection
- phase segmentation
- pose landmarks
- sport-specific kinematic metrics
- measured-confidence calibration

The existing report contract should remain stable while the deterministic measurements are replaced with measured outputs.
