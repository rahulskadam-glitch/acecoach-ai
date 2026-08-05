from __future__ import annotations

from typing import Any

import numpy as np

from .signal_analytics import robust_distribution, robust_outlier_indices


def coaching_playbook(
    action_type: str,
    coach_summary: dict[str, Any],
    priorities: list[dict[str, Any]],
    drills: list[dict[str, Any]],
    primary_goal: str | None,
) -> dict[str, Any]:
    primary = priorities[0] if priorities else None
    drill = drills[0] if drills else None
    cue = primary.get("cue") if primary else "Repeat the same shape at the same tempo."
    success = drill.get("successMetric") if drill else "Record at least six comparable repetitions with the full movement visible."
    visual = (
        f"At the highlighted frame, look for: {primary.get('nextStep', primary.get('finding', 'the target movement shape'))}"
        if primary
        else "Use the repetition markers to find the most repeatable movement window."
    )
    return {
        "todayFocus": primary.get("title") if primary else coach_summary.get("mainPriority", "Movement repeatability"),
        "athleteGoal": primary_goal,
        "feelCue": cue,
        "visualCue": visual,
        "commonCompensation": (
            "Do not force the correction with the hitting arm alone; preserve balance and spacing while the whole chain organizes."
            if primary
            else "Do not add several corrections at once. Establish a repeatable baseline first."
        ),
        "successTest": success,
        "transferChallenge": (
            f"Keep the cue during 8 controlled {action_type.replace('_', ' ')} repetitions, then test it in a moderate live feed"
            + (f" aligned to your goal: {primary_goal}." if primary_goal else ".")
        ),
        "coachQuestion": "Which highlighted frame best matches what you felt during the stroke?",
    }


def repetition_insights(repetitions: list[dict[str, Any]]) -> dict[str, Any]:
    if not repetitions:
        return {
            "clearestReferenceRepetition": None,
            "consistencyScore": None,
            "consistencyLabel": "No complete repetitions",
            "explanation": "Record complete movements from preparation through recovery to unlock repetition comparison.",
            "repetitions": [],
            "rhythmProfile": None,
            "outlierRepetitions": [],
            "phaseTiming": [],
        }

    durations = np.array([max(float(item.get("durationSeconds", 0.0)), 0.001) for item in repetitions], dtype=float)
    peaks = np.array([max(float(item.get("peakMotion", 0.0)), 0.0) for item in repetitions], dtype=float)
    duration_dist = robust_distribution(durations)
    peak_dist = robust_distribution(peaks)
    median_duration = duration_dist.median if duration_dist else float(np.median(durations))
    median_peak = peak_dist.median if peak_dist else float(np.median(peaks))
    duration_cv = float(np.std(durations) / max(float(np.mean(durations)), 1e-6)) if len(durations) > 1 else 0.0
    peak_cv = float(np.std(peaks) / max(float(np.mean(peaks)), 1e-6)) if len(peaks) > 1 and float(np.mean(peaks)) > 0 else 0.0
    outlier_indices = sorted(set(robust_outlier_indices(durations)) | set(robust_outlier_indices(peaks)))
    outlier_penalty = min(22.0, len(outlier_indices) * 7.0)
    consistency = int(round(max(0.0, min(100.0, 100.0 - (duration_cv * 58.0 + peak_cv * 32.0) * 100.0 - outlier_penalty))))
    label = "Stable rhythm" if consistency >= 80 else "Developing repeatability" if consistency >= 62 else "Variable repetitions"

    rows: list[dict[str, Any]] = []
    for item in repetitions:
        duration = float(item.get("durationSeconds", 0.0))
        peak = float(item.get("peakMotion", 0.0))
        visibility = float(item.get("meanVisibility", 0.0))
        duration_fit = max(0.0, 1.0 - abs(duration - median_duration) / max(median_duration, 1e-6))
        peak_fit = 1.0 if median_peak <= 0 else max(0.0, 1.0 - abs(peak - median_peak) / max(median_peak, 1e-6))
        review_score = int(round(max(0.0, min(100.0, visibility * 55.0 + duration_fit * 30.0 + peak_fit * 15.0))))
        strengths: list[str] = []
        watchouts: list[str] = []
        if visibility >= 0.85:
            strengths.append("Clear body tracking")
        else:
            watchouts.append("Landmark visibility drops during this repetition")
        if duration_fit >= 0.82:
            strengths.append("Rhythm close to your typical repetition")
        else:
            watchouts.append("Timing differs from your typical repetition")
        if int(item.get("index", len(rows))) in outlier_indices:
            watchouts.append("Robust signal analytics marked this repetition as an outlier")
        head_range = item.get("headMovementRange")
        if isinstance(head_range, (int, float)) and float(head_range) <= 0.09:
            strengths.append("Relatively quiet head-position proxy")
        elif isinstance(head_range, (int, float)):
            watchouts.append("More head-position movement than your steadier repetitions")
        rows.append({
            "index": int(item.get("index", len(rows))),
            "timestampSeconds": float(item.get("startSeconds", 0.0)),
            "reviewScore": review_score,
            "label": "Clearest self-reference" if review_score >= 80 else "Useful comparison" if review_score >= 62 else "Lower-confidence repetition",
            "strengths": strengths,
            "watchouts": watchouts,
        })

    phase_names = ["ready", "preparation", "loading", "acceleration", "contact_proxy", "follow_through", "recovery"]
    phase_totals = {phase: [] for phase in phase_names}
    for repetition in repetitions:
        timeline = repetition.get("phaseTimeline")
        if not isinstance(timeline, list) or len(timeline) < 2:
            continue
        ordered = sorted(
            [item for item in timeline if isinstance(item, dict) and isinstance(item.get("frameIndex"), int)],
            key=lambda item: int(item["frameIndex"]),
        )
        total_frames = max(1, int(repetition.get("endFrame", 0)) - int(repetition.get("startFrame", 0)))
        for idx, item in enumerate(ordered):
            phase = str(item.get("phase", ""))
            if phase not in phase_totals:
                continue
            next_frame = int(ordered[idx + 1]["frameIndex"]) if idx + 1 < len(ordered) else int(repetition.get("endFrame", item["frameIndex"]))
            phase_totals[phase].append(max(0.0, (next_frame - int(item["frameIndex"])) / total_frames))
    phase_timing = [
        {"phase": phase, "share": round(float(np.median(values)), 4)}
        for phase, values in phase_totals.items() if values
    ]

    best = max(rows, key=lambda row: (row["reviewScore"], -row["index"]))
    return {
        "clearestReferenceRepetition": best["index"],
        "consistencyScore": consistency if len(repetitions) >= 2 else None,
        "consistencyLabel": label if len(repetitions) >= 2 else "One repetition only",
        "explanation": "This is a self-consistency view based on tracking clarity, robust rhythm statistics, and similarity to your own typical repetition—not a technique grade or age-group percentile.",
        "repetitions": rows,
        "rhythmProfile": {
            "medianDurationSeconds": round(median_duration, 4),
            "durationIqrSeconds": round(duration_dist.iqr, 4) if duration_dist else 0.0,
            "durationCv": round(duration_cv, 4),
            "medianPeakMotion": round(median_peak, 6),
            "peakMotionIqr": round(peak_dist.iqr, 6) if peak_dist else 0.0,
            "peakMotionCv": round(peak_cv, 4),
        },
        "outlierRepetitions": outlier_indices,
        "phaseTiming": phase_timing,
    }

