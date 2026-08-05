# AceCoach Analysis Engine v2 Beta

> **Historical document.** This describes an earlier engine and is superseded by `RED_TEAM_REVIEW_V24.md` and the v2.4 implementation. Do not use its capability claims or setup steps as the current source of truth.


## Purpose

This release replaces ID-seeded development scores with deterministic, measured frame-by-frame 2D pose analysis. The same video, movement selection, model versions, and runtime should produce the same rounded measurements and score.

## Processing pipeline

1. Next.js creates a short-lived signed URL for the private Supabase video.
2. The Python analysis API downloads the exact object and calculates SHA-256.
3. OpenCV decodes every frame.
4. MediaPipe Pose estimates landmarks for every decoded frame.
5. The biomechanics layer calculates frame-level elbow, shoulder, knee, shoulder-pelvis separation, stance width, and normalized wrist-speed proxies.
6. A deterministic phase timeline is derived around peak wrist speed.
7. Declared scoring equations produce phase and metric scores.
8. The report stores the content fingerprint and full engine manifest.

## Important limitations

- Monocular 2D pose is not laboratory-grade 3D motion capture.
- Contact is currently approximated by peak wrist speed; implement and ball/shuttle detection are not yet included.
- Forces, moments, muscle activation, and injury diagnosis are outside scope.
- Comparisons are valid only under the same model versions and similar camera setup.

## Local setup

Run migration `supabase/008_analysis_engine_v2_foundation.sql`.

Start the analysis service:

```powershell
cd services/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

In another terminal, start Next.js:

```powershell
npm install
npm run dev
```

Ensure `.env.local` contains:

```text
ANALYSIS_API_URL=http://127.0.0.1:8000
```

The beta service accepts clips up to 60 seconds and 7,200 frames for predictable memory, response-size, and processing behavior. Longer footage should be segmented before analysis.
