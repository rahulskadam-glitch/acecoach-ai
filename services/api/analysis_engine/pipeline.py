from __future__ import annotations

import hashlib
import platform
import sys
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
import scipy

from .biomechanics import BIOMECHANICS_VERSION, SCORING_VERSION, compute_frame_metrics, score_from_measurements
from .biomechanical_profile import PROFILE_VERSION, build_biomechanical_profile
from .classifier import CLASSIFIER_VERSION, classify_movement
from .evidence import EVIDENCE_VERSION
from .experience import (
    coaching_playbook as build_coaching_playbook,
    repetition_insights as build_repetition_insights,
)
from .pose import POSE_MODEL_VERSION, extract_pose_frames
from .signal_analytics import SIGNAL_ANALYTICS_VERSION
from .ontology_reasoner import ground_report_in_ontology, ontology_manifest_hash
from .sport_rules import KNOWLEDGE_VERSION, build_coaching
from .stroke_guide import GUIDE_EVIDENCE_ID, STROKE_GUIDE_VERSION, guide_for
from .temporal import TEMPORAL_MODEL_VERSION, RepetitionWindow
from .video import download_video

ENGINE_VERSION = "movement-intelligence-v1.10.0"
REPORT_VERSION = "6.7.0-ontology-complete-stroke-report"
ONTOLOGY_VERSION = "4.1.0"
ONTOLOGY_REASONER_VERSION = "4.1.1-complete-chain"
MAX_REPORT_FRAMES = 1200
SUPPORTED_TECHNIQUE_SPORTS = {"tennis"}


def _runtime_manifest() -> dict[str, str]:
    """Return only stable runtime attributes that can affect numeric output."""
    return {
        "python": platform.python_version(),
        "platform": f"{platform.system()}-{platform.machine()}",
        "numpy": np.__version__,
        "opencv": cv2.__version__,
        "mediapipe": getattr(mp, "__version__", "unknown"),
        "scipy": scipy.__version__,
    }


def _runtime_signature(runtime: dict[str, str]) -> str:
    return "|".join(f"{key}={runtime[key]}" for key in sorted(runtime))


def _label(action: str) -> str:
    return action.replace("_", " ").title()


CAMERA_LABELS = {
    "side": "side view",
    "rear": "rear view",
    "front": "front view",
    "diagonal": "diagonal view",
    "unknown": "camera view not supplied",
}
SITUATION_LABELS = {
    "controlled_practice": "controlled practice or feed",
    "neutral_rally": "neutral rally ball",
    "attacking": "attacking ball",
    "defensive_on_run": "defensive or on-the-run ball",
    "return_of_serve": "return of serve",
    "unknown": "shot situation not supplied",
}
INTENT_LABELS = {
    "consistency": "consistency and control",
    "depth": "depth",
    "heavy_topspin": "heavier topspin",
    "flatter_drive": "flatter drive",
    "angle": "creating angle",
    "approach": "approaching the net",
    "defensive_height": "defensive height and time",
    "unknown": "shot intention not supplied",
}


def _analysis_context(payload: Any) -> dict[str, Any]:
    camera_angle = getattr(payload, "camera_angle", None) or "unknown"
    shot_situation = getattr(payload, "shot_situation", None) or "unknown"
    shot_intent = getattr(payload, "shot_intent", None) or "unknown"
    athlete_question = getattr(payload, "athlete_question", None)
    athlete_height_cm = getattr(payload, "height_cm", None)
    context_supplied = shot_situation != "unknown" and shot_intent != "unknown"
    statement = (
        f"Read as a {SITUATION_LABELS.get(shot_situation, _label(shot_situation))} with an intention of "
        f"{INTENT_LABELS.get(shot_intent, _label(shot_intent))}. "
        "These labels were supplied by the athlete; body positions and timing come from the video."
        if context_supplied
        else "Shot situation or intention was not supplied. Technique observations are shown without a tactical judgment."
    )
    return {
        "cameraAngle": camera_angle,
        "cameraAngleLabel": CAMERA_LABELS.get(camera_angle, _label(camera_angle)),
        "shotSituation": shot_situation,
        "shotSituationLabel": SITUATION_LABELS.get(shot_situation, _label(shot_situation)),
        "shotIntent": shot_intent,
        "shotIntentLabel": INTENT_LABELS.get(shot_intent, _label(shot_intent)),
        "athleteQuestion": athlete_question,
        "source": "athlete_supplied" if context_supplied else "partially_supplied_or_unspecified",
        "statement": statement,
        "athleteHeightCm": athlete_height_cm,
        "heightSource": "athlete_supplied" if athlete_height_cm is not None else "not_supplied",
        "calibrationStatement": (
            f"Athlete-supplied height ({athlete_height_cm:.0f} cm) is used only to contextualize body-relative reach and spacing."
            if athlete_height_cm is not None
            else "Add athlete height to improve body-relative reach and spacing context."
        ),
    }


def _sample_frame_metrics(frame_metrics: list[dict], important_frames: set[int]) -> tuple[list[dict], int]:
    if len(frame_metrics) <= MAX_REPORT_FRAMES:
        return frame_metrics, 1
    stride = max(1, (len(frame_metrics) + MAX_REPORT_FRAMES - 1) // MAX_REPORT_FRAMES)
    selected = {
        index
        for index in range(0, len(frame_metrics), stride)
    }
    selected.update(index for index in important_frames if 0 <= index < len(frame_metrics))
    return [frame_metrics[index] for index in sorted(selected)], stride


def _phase_time(timeline: list[dict[str, Any]], *phases: str) -> float | None:
    match = next((item for item in timeline if item.get("phase") in phases), None)
    value = match.get("timestampSeconds") if match else None
    return float(value) if isinstance(value, (int, float)) else None


def _action_cues(action_type: str) -> dict[str, str]:
    if action_type == "two_handed_backhand":
        return {
            "hands": "Top hand drives the path; bottom hand guides.",
            "backlift": "Coil early; shoulder to the ball.",
            "finish": "High and away, over the shoulder, recover.",
        }
    if action_type == "one_handed_backhand":
        return {
            "hands": "Make space. Reach through the ball.",
            "backlift": "Turn early. Set the racket above the hand.",
            "finish": "Extend through, then recover your base.",
        }
    if action_type == "serve":
        return {
            "hands": "Loose arm, reach up through contact.",
            "backlift": "Let the racket organize behind you without forcing it.",
            "finish": "Land balanced and find the next ball.",
        }
    return {
        "hands": "Make space. Meet it in front.",
        "backlift": "Turn together. Let the racket organize behind you.",
        "finish": "Finish balanced, then recover.",
    }


def _body_region_review(
    action_type: str,
    biomechanical_profile: dict[str, Any],
    coaching_areas: list[dict[str, Any]],
    timeline: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    metrics = biomechanical_profile.get("metrics", [])
    cue = _action_cues(action_type)
    definitions = [
        ("head", "Head & eyes", {"head"}, ["body_position"], "contact", ("contact_proxy",), "See the ball through the strike."),
        ("hands", "Hands & contact space", {"hitting_hand", "support_hand", "arms", "hitting_arm", "support_arm"}, ["contact_spacing", "hand_swing_path"], "contact", ("contact_proxy",), cue["hands"]),
        ("grip", "Grip & racket face", set(), [], "contact", ("contact_proxy",), "Confirm your grip before the next set."),
        ("backlift", "Shoulders & backlift", {"shoulders", "trunk", "hitting_shoulder", "support_shoulder"}, ["backlift_preparation"], "preparation", ("preparation", "loading"), cue["backlift"]),
        ("hips", "Hips & weight transfer", {"pelvis", "balance", "left_hip", "right_hip", "hitting_hip", "support_hip"}, ["lower_body_loading"], "loading", ("loading", "acceleration"), "Load first. Transfer through the shot."),
        ("knees", "Knees: load then drive", {"left_leg", "right_leg", "hitting_leg", "support_leg", "lower_body"}, ["lower_body_loading", "lower_body_extension"], "loading", ("loading", "acceleration"), "Load first. Drive through second."),
        ("feet", "Feet & hitting base", {"base", "hitting_ankle", "support_ankle"}, ["footwork_base"], "preparation", ("ready", "preparation"), "Adjust, set, hit, recover."),
        ("finish", "Finish & body balance", {"balance", "repeatability", "timing"}, ["ending_position", "repeatability"], "follow_through", ("follow_through", "recovery"), cue["finish"]),
    ]
    result: list[dict[str, Any]] = []
    for region_id, title, metric_regions, area_ids, phase, timeline_phases, default_cue in definitions:
        matching_areas = [item for item in coaching_areas if item.get("id") in area_ids]
        area = min(matching_areas, key=lambda item: float(item.get("score", 100))) if matching_areas else None
        evidence = [
            {
                "id": item["id"],
                "label": item["label"],
                "displayValue": item["displayValue"],
                "confidence": item["confidence"],
                "measurementBasis": item["measurementBasis"],
            }
            for item in metrics
            if item.get("status") == "available" and item.get("region") in metric_regions
        ][:3]
        if region_id == "grip":
            result.append({
                "id": region_id,
                "title": title,
                "status": "needs_confirmation",
                "coachNote": "I cannot identify your grip or racket-face angle reliably from body landmarks alone. Tell AceCoach the grip, or use a close side view where the hand and handle are clear.",
                "whyItMatters": "Grip changes the natural contact height, arm shape, spin window, and racket-face behavior.",
                "cue": default_cue,
                "phase": phase,
                "timestampSeconds": _phase_time(timeline, *timeline_phases),
                "measurementStatus": "athlete_confirmation",
                "evidence": [],
            })
            continue
        status = area.get("status", "developing") if area else ("developing" if evidence else "not_visible")
        note = (
            area.get("observation")
            if area
            else f"I checked {', '.join(item['label'].lower() for item in evidence[:2])}. No separate fault was confirmed in this body area."
            if evidence
            else "This body area was not clear enough for a dependable coaching call."
        )
        result.append({
            "id": region_id,
            "title": title,
            "status": status,
            "coachNote": note,
            "whyItMatters": area.get("whyItMatters") if area else "This link helps the stroke stay balanced, repeatable, and connected to the next movement.",
            "cue": area.get("cue") if area else default_cue,
            "phase": phase,
            "timestampSeconds": (
                float(area["timestampSeconds"])
                if area and isinstance(area.get("timestampSeconds"), (int, float))
                else _phase_time(timeline, *timeline_phases)
            ),
            "measurementStatus": "video_estimate" if evidence else "not_visible",
            "evidence": evidence,
        })
    return result


def _executive_bullets(
    coach_summary: dict[str, Any],
    strengths: list[dict[str, Any]],
    priorities: list[dict[str, Any]],
    coaching_playbook: dict[str, Any],
    analysis_context: dict[str, Any],
) -> list[dict[str, Any]]:
    priority = priorities[0] if priorities else {}
    strength = strengths[0] if strengths else {}
    return [
        {
            "id": "read",
            "label": "My read",
            "text": coach_summary.get("headline", "Here is the clearest pattern in the full video."),
            "timestampSeconds": priority.get("timestampSeconds"),
        },
        {
            "id": "keep",
            "label": "Keep",
            "text": coach_summary.get("strongestQuality") or strength.get("evidence") or "Keep the parts of the movement that remain balanced and repeatable.",
            "timestampSeconds": strength.get("timestampSeconds"),
        },
        {
            "id": "fix",
            "label": "Fix first",
            "text": coach_summary.get("mainPriority", "Make one clear change before adding another."),
            "timestampSeconds": priority.get("timestampSeconds"),
        },
        {
            "id": "feel",
            "label": "Feel",
            "text": coaching_playbook.get("feelCue", "One change, then play the next ball."),
            "timestampSeconds": priority.get("timestampSeconds"),
        },
    ]


def _point_location(title: str) -> tuple[str, str]:
    normalized = title.lower()
    if "knee drive" in normalized or "extension" in normalized:
        return "knees", "acceleration"
    if "head" in normalized or "body position" in normalized:
        return "head", "contact"
    if "contact" in normalized or "hand" in normalized or "spacing" in normalized:
        return "hands", "contact"
    if "preparation" in normalized or "backlift" in normalized or "shoulder" in normalized:
        return "backlift", "preparation"
    if any(word in normalized for word in ("lower-body", "load", "transfer", "hip")):
        return "hips", "loading"
    if any(word in normalized for word in ("foot", "base", "ankle")):
        return "feet", "preparation"
    if any(word in normalized for word in ("finish", "recovery", "ending")):
        return "finish", "follow_through"
    return "head", "contact"


def _strength_copy(title: str, evidence: str) -> tuple[str, str, str, str]:
    normalized = title.lower()
    if "preparation" in normalized or "backlift" in normalized:
        return (
            "Your preparation gives you time",
            "You organize the turn and backlift before the forward swing instead of starting everything at the last moment.",
            "Early, connected preparation lets the trunk and both arms work together.",
            "well-organized preparation",
        )
    if "contact" in normalized or "spacing" in normalized:
        return (
            "You create useful contact space",
            "At the likely strike moment, your hands have room to travel instead of being trapped against your body.",
            "Space gives you a longer swing corridor and more control of direction.",
            "useful contact space",
        )
    if "knee drive" in normalized or "extension" in normalized:
        return (
            "Your legs release after the load",
            "The visible knee drive follows the loading position instead of staying passive.",
            "A load-then-drive sequence connects the ground-up chain to the forward swing.",
            "a connected load-then-drive leg sequence",
        )
    if "lower-body" in normalized or "load" in normalized:
        return (
            "Your lower body gives the stroke a base",
            "The video shows a usable platform underneath the swing.",
            "A stable platform helps the upper body rotate without rushing.",
            "a usable lower-body base",
        )
    readable = title[:1].upper() + title[1:]
    return readable, evidence, "Keep this quality while changing the main priority.", title.lower()


def _priority_copy(title: str, next_step: str, finding: str) -> tuple[str, str, str]:
    normalized = title.lower()
    if "head" in normalized or "body position" in normalized:
        return (
            "Keep your head quieter through contact",
            "Your head and upper body move too much through the strike window. Keep the eyes and head quieter while the arms complete the shot.",
            "quieter head and upper-body control through contact",
        )
    if "finish" in normalized or "recovery" in normalized:
        return (
            "Complete the finish, then recover",
            "Let both hands finish high and away from your face, hold your balance briefly, then make the first recovery step.",
            "a complete finish and quicker recovery",
        )
    if any(word in normalized for word in ("foot", "base", "ankle")):
        return (
            "Build a more usable hitting base",
            "Use small adjustment steps, set a comfortable base, strike, and leave yourself room to recover instead of getting stuck.",
            "a more functional hitting base",
        )
    if "knee drive" in normalized or "extension" in normalized:
        return (
            "Drive the legs after you load",
            "Keep the knee bend as the load, stay supported into the strike window, then drive upward and forward through the finish.",
            "a clearer load-then-drive leg sequence",
        )
    if any(word in normalized for word in ("lower-body", "load", "transfer", "hip", "knee")):
        return (
            "Load the legs before you turn through",
            "Stay lower into the ball, organize the outside leg, and transfer through the shot before rising into recovery.",
            "better leg load and weight transfer",
        )
    if any(word in normalized for word in ("contact", "spacing", "hand")):
        return (
            "Meet the ball with more space",
            "Keep both arms connected and meet the likely strike window in front, with room between your hands and torso.",
            "cleaner contact spacing",
        )
    readable = title[:1].upper() + title[1:]
    return readable, next_step or finding, title.lower()


def _join_natural(items: list[str]) -> str:
    if not items:
        return "the parts that are already balanced"
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def _combined_area_status(*items: dict[str, Any] | None) -> str:
    statuses = {item.get("status") for item in items if item}
    if "priority" in statuses:
        return "priority"
    if "developing" in statuses:
        return "developing"
    return "working"


def _profile_metric(profile: dict[str, Any] | None, metric_id: str) -> dict[str, Any] | None:
    if not profile:
        return None
    return next(
        (
            item
            for item in profile.get("metrics", [])
            if item.get("id") == metric_id and item.get("status") == "available"
        ),
        None,
    )


def _profile_value(profile: dict[str, Any] | None, metric_id: str) -> float | None:
    metric = _profile_metric(profile, metric_id)
    value = metric.get("value") if metric else None
    return float(value) if isinstance(value, (int, float)) else None


def _profile_display(profile: dict[str, Any] | None, metric_id: str) -> str:
    metric = _profile_metric(profile, metric_id)
    return str(metric.get("displayValue")) if metric else "not visible enough"


def _range_status(value: float | None, working_max: float, developing_max: float) -> str:
    if value is None:
        return "confirm"
    if value <= working_max:
        return "working"
    if value <= developing_max:
        return "developing"
    return "priority"


def _positive_change_status(value: float | None, working_min: float, developing_min: float) -> str:
    if value is None:
        return "confirm"
    if value >= working_min:
        return "working"
    if value >= developing_min:
        return "developing"
    return "priority"


def _negative_change_status(value: float | None, working_max: float, developing_max: float) -> str:
    if value is None:
        return "confirm"
    if value <= working_max:
        return "working"
    if value <= developing_max:
        return "developing"
    return "priority"


def _timing_status(value: float | None) -> str:
    if value is None:
        return "confirm"
    if 0.0 <= value <= 0.25:
        return "working"
    if -0.06 <= value <= 0.32:
        return "developing"
    return "priority"


def _backhand_phase_body_checks(
    coaching_areas: list[dict[str, Any]],
    biomechanical_profile: dict[str, Any] | None,
) -> dict[str, list[dict[str, Any]]]:
    areas = {str(item.get("id")): item for item in coaching_areas}
    prep_status = _combined_area_status(areas.get("backlift_preparation"))
    feet_status = _combined_area_status(areas.get("footwork_base"))
    space_status = _combined_area_status(areas.get("contact_spacing"))
    finish_status = _combined_area_status(areas.get("ending_position"))
    extension_observation = str((areas.get("lower_body_extension") or {}).get("observation") or "The post-load knee drive was not visible enough.")

    knee_load_candidates = [
        value
        for value in (
            _profile_value(biomechanical_profile, "load_hitting_knee_change"),
            _profile_value(biomechanical_profile, "load_support_knee_change"),
        )
        if value is not None
    ]
    knee_load = min(knee_load_candidates) if knee_load_candidates else None
    knee_extension_candidates = [
        value
        for value in (
            _profile_value(biomechanical_profile, "accel_hitting_knee_extension"),
            _profile_value(biomechanical_profile, "accel_support_knee_extension"),
        )
        if value is not None
    ]
    knee_extension = max(knee_extension_candidates) if knee_extension_candidates else None
    prep_head = _profile_value(biomechanical_profile, "prep_head_stability")
    load_head = _profile_value(biomechanical_profile, "load_head_stability")
    finish_head = _profile_value(biomechanical_profile, "finish_head_stability")
    hip_timing = _profile_value(biomechanical_profile, "accel_pelvis_to_shoulder_timing")
    support_speed = _profile_value(biomechanical_profile, "accel_support_wrist_speed")
    hitting_speed = _profile_value(biomechanical_profile, "accel_hitting_wrist_speed")
    hand_speed_readout = (
        f"Support-hand speed proxy {_profile_display(biomechanical_profile, 'accel_support_wrist_speed')}; "
        f"dominant-hand proxy {_profile_display(biomechanical_profile, 'accel_hitting_wrist_speed')}."
        if support_speed is not None and hitting_speed is not None
        else "Hand-role force could not be measured from this view."
    )

    def check(
        check_id: str,
        body_part: str,
        status: str,
        finding: str,
        measurement_basis: str,
        camera_boundary: str | None = None,
    ) -> dict[str, Any]:
        item: dict[str, Any] = {
            "id": check_id,
            "bodyPart": body_part,
            "status": status,
            "finding": finding,
            "measurementBasis": measurement_basis,
        }
        if camera_boundary:
            item["cameraBoundary"] = camera_boundary
        return item

    return {
        "ready": [
            check("ready-feet-knees", "Feet & knees", feet_status, f"Ready base: {_profile_display(biomechanical_profile, 'prep_base_width')}; left/right knee angles: {_profile_display(biomechanical_profile, 'prep_left_knee')} / {_profile_display(biomechanical_profile, 'prep_right_knee')}.", "pose_estimate"),
            check("ready-hips", "Hips", "developing", f"Visible hip-line orientation: {_profile_display(biomechanical_profile, 'prep_pelvis_line')}.", "image_plane_proxy", "The net line is not calibrated, so square-to-net is not claimed."),
            check("ready-hands", "Hands", "confirm", "Confirm both hands begin relaxed on the racket and the racket is centered in front.", "athlete_or_racket_confirmation", "Pose landmarks do not measure grip pressure or handle position."),
            check("ready-head", "Head & eyes", _range_status(prep_head, 0.10, 0.20), f"Early head-movement range: {_profile_display(biomechanical_profile, 'prep_head_stability')}.", "body_scaled_pose_range"),
            check("ready-racket", "Racket", "confirm", "Confirm the racket starts in front near waist height without blocking vision.", "racket_confirmation", "The racket is not tracked."),
        ],
        "preparation": [
            check("prep-hands", "Hands", "confirm", "Both hands should complete the grip organization together during the first turn.", "athlete_or_close_view_confirmation", "Pose cannot identify bevels or whether one hand changed late."),
            check("prep-knees", "Knees", _negative_change_status(knee_load, -5.0, -1.0), f"Largest visible knee-angle change into load: {knee_load:.1f}°." if knee_load is not None else "Knee-load change was not visible enough.", "world_pose_angle_proxy"),
            check("prep-hips", "Hips & shoulders", prep_status, f"Visible shoulder turn {_profile_display(biomechanical_profile, 'backswing_shoulder_turn')}; hip turn {_profile_display(biomechanical_profile, 'backswing_pelvis_turn')}.", "image_plane_rotation_proxy", "This supports a unit-turn read but is not laboratory 3D rotation."),
            check("prep-head", "Head & eyes", _range_status(prep_head, 0.10, 0.20), f"Head-movement range during early preparation: {_profile_display(biomechanical_profile, 'prep_head_stability')}.", "body_scaled_pose_range"),
            check("prep-racket", "Racket", "confirm", "Checkpoint: racket head above the hands in a compact take-back.", "racket_confirmation", "Exact racket-head height requires racket tracking."),
        ],
        "load_drop": [
            check("load-hands", "Hands & wrists", "confirm", "Keep both wrists organized and laid back rather than floppy during the drop.", "hand_and_racket_confirmation", "Wrist joint angle and grip pressure are not measured."),
            check("load-knees", "Knees", _negative_change_status(knee_load, -5.0, -1.0), f"The load event changed the more-flexing knee by {abs(knee_load):.1f}°." if knee_load is not None else "The knee-load event was not visible enough.", "world_pose_angle_proxy"),
            check("load-hips", "Hips", "developing", f"Visible shoulder–hip separation at load: {_profile_display(biomechanical_profile, 'load_separation')}.", "image_plane_rotation_proxy", "This is camera-dependent and not a direct axial-rotation measurement."),
            check("load-head", "Head & eyes", _range_status(load_head, 0.12, 0.22), f"Head-movement range through loading: {_profile_display(biomechanical_profile, 'load_head_stability')}.", "body_scaled_pose_range"),
            check("load-racket", "Racket", "confirm", "Checkpoint: racket head drops below the hand line; face may close slightly for a topspin/depth ball.", "racket_confirmation", "Racket height, string angle, and wrist layback require racket tracking."),
        ],
        "forward_swing": [
            check("swing-hands", "Hands", "confirm", f"Top/non-dominant hand should lead the path; bottom/dominant hand guides. {hand_speed_readout}", "paired_wrist_speed_proxy", "Wrist speed does not measure force or grip dominance."),
            check("swing-knees", "Knees", _positive_change_status(knee_extension, 5.0, 1.0), f"Largest visible knee extension after loading: {knee_extension:.1f}°." if knee_extension is not None else "Post-load knee drive was not visible enough.", "world_pose_angle_proxy"),
            check("swing-hips", "Hips → shoulders", _timing_status(hip_timing), f"Hip-to-shoulder peak timing: {_profile_display(biomechanical_profile, 'accel_pelvis_to_shoulder_timing')} (positive means the shoulders followed the hips).", "pose_sequence_proxy", "Image-plane turn timing is camera-dependent."),
            check("swing-head", "Head & eyes", _range_status(finish_head, 0.12, 0.22), f"Head hold from likely contact into recovery: {_profile_display(biomechanical_profile, 'finish_head_stability')}.", "body_scaled_pose_range"),
            check("swing-racket", "Racket", "confirm", "Confirm a low-to-high forward path without an early wrist flip.", "racket_confirmation", "Racket path and face are not tracked."),
        ],
        "contact": [
            check("contact-hands", "Hands & elbows", space_status, f"Hand-to-torso space: dominant {_profile_display(biomechanical_profile, 'contact_hitting_hand_space')}; support {_profile_display(biomechanical_profile, 'contact_support_hand_space')}. Elbow angles: {_profile_display(biomechanical_profile, 'contact_hitting_elbow')} / {_profile_display(biomechanical_profile, 'contact_support_elbow')}.", "body_scaled_and_world_pose_proxy", "The exact ball-contact frame is estimated from peak whole-chain motion."),
            check("contact-knees", "Knees", _positive_change_status(knee_extension, 5.0, 1.0), "Stay supported through the likely strike window; the load should release into the later drive rather than disappear before contact.", "world_pose_sequence_proxy"),
            check("contact-hips", "Hips & shoulders", _timing_status(hip_timing), f"Visible shoulder–hip separation near likely contact: {_profile_display(biomechanical_profile, 'contact_separation')}.", "image_plane_rotation_proxy"),
            check("contact-head", "Head & eyes", _combined_area_status(areas.get("body_position")), f"Contact-to-recovery head-movement range: {_profile_display(biomechanical_profile, 'finish_head_stability')}. Keep the eyes at the strike window until the ball has left.", "body_scaled_pose_range"),
            check("contact-racket", "Racket face", "confirm", "Confirm a vertical-to-slightly-closed face matched to the intended height and spin.", "racket_and_ball_confirmation", "Exact contact, ball height, spin, and racket face are not detected."),
        ],
        "finish": [
            check("finish-hands", "Hands & elbows", finish_status, f"Post-contact hand travel: dominant {_profile_display(biomechanical_profile, 'finish_hitting_wrist_travel')}; support {_profile_display(biomechanical_profile, 'finish_support_wrist_travel')}.", "body_scaled_pose_displacement"),
            check("finish-knees", "Knees", _combined_area_status(areas.get("lower_body_extension")), f"{extension_observation} Continue the drive into the finish without standing up before the strike window.", "world_pose_angle_proxy"),
            check("finish-hips", "Hips & torso", finish_status, f"Post-contact hip-line travel {_profile_display(biomechanical_profile, 'finish_pelvis_turn')}; shoulder-line travel {_profile_display(biomechanical_profile, 'finish_shoulder_turn')}.", "image_plane_rotation_proxy"),
            check("finish-head", "Head & eyes", _range_status(finish_head, 0.12, 0.22), f"Head-movement range after likely contact: {_profile_display(biomechanical_profile, 'finish_head_stability')}. Release the gaze only after the strike window.", "body_scaled_pose_range"),
            check("finish-racket", "Racket", "confirm", "For this topspin/depth pattern, finish high after swinging through; confirm the face closes naturally rather than staying open.", "racket_confirmation", "The exact racket face and racket-head finish are not tracked."),
        ],
        "recovery": [
            check("recovery-feet", "Feet & knees", feet_status, f"Recovery base: {_profile_display(biomechanical_profile, 'finish_recovery_base')}; knee angles: {_profile_display(biomechanical_profile, 'finish_hitting_knee')} / {_profile_display(biomechanical_profile, 'finish_support_knee')}.", "body_scaled_and_world_pose_proxy"),
            check("recovery-hips", "Hips & balance", finish_status, f"Post-contact balance-point range: {_profile_display(biomechanical_profile, 'finish_com_stability')}.", "body_scaled_pose_range"),
            check("recovery-hands", "Hands", "confirm", "Re-center both hands and the racket as the recovery step begins.", "racket_confirmation", "Racket re-centering is not tracked."),
            check("recovery-head", "Head & eyes", "confirm", "After the strike-window hold, release the eyes to the ball and opponent for the next read.", "athlete_confirmation"),
            check("recovery-racket", "Racket", "confirm", "Return the racket to a neutral ready position before the opponent strikes again.", "racket_confirmation", "Opponent contact and racket position are not detected."),
        ],
    }


def _two_handed_backhand_framework(
    action_type: str,
    coaching_areas: list[dict[str, Any]],
    biomechanical_profile: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    if action_type != "two_handed_backhand":
        return []
    areas = {str(item.get("id")): item for item in coaching_areas}
    preparation = areas.get("backlift_preparation")
    feet = areas.get("footwork_base")
    load = areas.get("lower_body_loading")
    extension = areas.get("lower_body_extension")
    space = areas.get("contact_spacing")
    head = areas.get("body_position")
    swing = areas.get("hand_swing_path")
    finish = areas.get("ending_position")
    phase_checks = _backhand_phase_body_checks(coaching_areas, biomechanical_profile)

    return [
        {
            "id": "backhand-preparation",
            "step": 1,
            "label": "Preparation",
            "title": "Coil early and move to the ball",
            "status": _combined_area_status(preparation, feet),
            "summary": (
                ("Your shoulder turn and backlift timing are already organized. " if preparation and preparation.get("status") == "strength" else "Start the shoulder coil early and show the back shoulder to the incoming ball. ")
                + ("Use a quick pivot and adjustment steps to arrive on a more functional base. " if feet and feet.get("status") == "priority" else "Keep the feet active so the body arrives with space. ")
                + "Set the racket head above the hands during this early preparation."
            ),
            "coachCue": "Turn early. Racket head above the hands.",
            "cameraBoundary": "Grip change and exact racket-head position need a clear hand-and-racket view.",
            "checks": [
                {
                    "id": "early-coil",
                    "label": "Early shoulder coil",
                    "status": _combined_area_status(preparation),
                    "finding": "The turn is organized before the forward swing." if preparation and preparation.get("status") == "strength" else "Begin the shoulder coil before the ball enters the strike window.",
                },
                {
                    "id": "pivot-move",
                    "label": "Pivot and adjustment steps",
                    "status": _combined_area_status(feet),
                    "finding": "The arrival base needs a quicker pivot, movement, and set sequence." if feet and feet.get("status") == "priority" else "The feet create a usable arrival base.",
                },
                {
                    "id": "two-hands-together",
                    "label": "Both hands organize together",
                    "status": "confirm",
                    "finding": "Confirm the top and bottom hands complete the grip organization together during the first unit turn.",
                    "cameraBoundary": "Body landmarks do not identify bevels or the exact grip-change moment.",
                },
                {
                    "id": "racket-organized",
                    "label": "Racket above the hands",
                    "status": "confirm",
                    "finding": "Confirm the racket is organized above the hands before it drops.",
                    "cameraBoundary": "Racket tracking is not available in this recording.",
                },
                {
                    "id": "preparation-head-hold",
                    "label": "Head stays quiet during the turn",
                    "status": phase_checks["preparation"][3]["status"],
                    "finding": phase_checks["preparation"][3]["finding"],
                },
            ],
            "timestampSeconds": (preparation or feet or {}).get("timestampSeconds"),
            "bodyRegionId": "backlift" if preparation and preparation.get("status") == "priority" else "feet",
            "phase": "preparation",
        },
        {
            "id": "backhand-power-position",
            "step": 2,
            "label": "Power position & drop",
            "title": "Load the outside leg, then let the racket drop",
            "status": _combined_area_status(load, space),
            "summary": (
                ("The lower body creates a usable platform. " if load and load.get("status") == "strength" else "Stay lower and load the back or outside leg before the forward swing. ")
                + ("Your hands keep useful room from the torso. " if space and space.get("status") == "strength" else "Keep both elbows and hands away from the body so there is room to accelerate. ")
                + "After the Stage 1 setup above the hands, allow the racket head to drop below the hand line before acceleration."
            ),
            "coachCue": "Load. Arms away. Racket head below the hands.",
            "cameraBoundary": "String angle and exact racket height are not measured without racket tracking.",
            "checks": [
                {
                    "id": "outside-leg-load",
                    "label": "Back or outside-leg load",
                    "status": _combined_area_status(load),
                    "finding": "The legs create a usable platform for the forward swing." if load and load.get("status") == "strength" else "Stay lower and organize the back or outside leg before turning through.",
                    "cameraBoundary": "Video shows body position, not an exact weight percentage or ground force.",
                },
                {
                    "id": "arm-space",
                    "label": "Both arms away from the torso",
                    "status": _combined_area_status(space),
                    "finding": "The hands preserve useful room from the torso." if space and space.get("status") == "strength" else "Create more room between the elbows, hands, and torso before acceleration.",
                },
                {
                    "id": "chin-shoulder",
                    "label": "Chin over the back shoulder",
                    "status": _combined_area_status(head),
                    "finding": "Head control needs to become quieter as the stroke approaches contact." if head and head.get("status") == "priority" else "The head stays supported over the shoulder line.",
                },
                {
                    "id": "racket-drop-below-hands",
                    "label": "Racket head drops below the hand line",
                    "status": "confirm",
                    "finding": "Confirm the racket head moves from above the hands in Stage 1 to below the hand line before acceleration.",
                    "cameraBoundary": "Racket height and string angle require a clear racket-and-hand view.",
                },
                {
                    "id": "load-hip-separation",
                    "label": "Hips organize before the release",
                    "status": phase_checks["load_drop"][2]["status"],
                    "finding": phase_checks["load_drop"][2]["finding"],
                    "cameraBoundary": phase_checks["load_drop"][2].get("cameraBoundary"),
                },
            ],
            "timestampSeconds": (load or space or {}).get("timestampSeconds"),
            "bodyRegionId": "hips",
            "phase": "loading",
        },
        {
            "id": "backhand-contact",
            "step": 3,
            "label": "Contact",
            "title": "Make space and keep the head quiet",
            "status": _combined_area_status(head, space, extension, swing),
            "summary": (
                ("Keep the head and upper body quieter through the strike window. " if head and head.get("status") == "priority" else "Preserve your head position while the hands travel through the likely contact window. ")
                + ("Your hands preserve useful room from the torso. " if space and space.get("status") == "strength" else "Create enough room for both arms to extend in the intended direction. ")
                + "After the knee-bend load, drive the legs through the swing while the top, non-dominant hand leads the path and the bottom hand guides."
            ),
            "coachCue": "Load, drive, top hand through. Keep the head quiet.",
            "cameraBoundary": "The engine estimates a likely strike window and movement sequence; exact ball contact, hand force, and racket-face angle require additional sensing.",
            "checks": [
                {
                    "id": "knee-drive-after-load",
                    "label": "Knees drive after they load",
                    "status": phase_checks["forward_swing"][1]["status"],
                    "finding": phase_checks["forward_swing"][1]["finding"],
                    "cameraBoundary": "Knee angles are pose estimates, not ground-force measurements.",
                },
                {
                    "id": "hips-lead-shoulders",
                    "label": "Hips lead the upper-body release",
                    "status": phase_checks["forward_swing"][2]["status"],
                    "finding": phase_checks["forward_swing"][2]["finding"],
                    "cameraBoundary": phase_checks["forward_swing"][2].get("cameraBoundary"),
                },
                {
                    "id": "two-hand-roles",
                    "label": "Top hand drives; bottom hand guides",
                    "status": "confirm",
                    "finding": phase_checks["forward_swing"][0]["finding"],
                    "cameraBoundary": phase_checks["forward_swing"][0].get("cameraBoundary"),
                },
                {
                    "id": "quiet-contact",
                    "label": "Quiet head through contact",
                    "status": _combined_area_status(head),
                    "finding": "Keep the head and upper body quieter while both arms complete the strike." if head and head.get("status") == "priority" else "Preserve the head position through the likely strike window.",
                },
                {
                    "id": "contact-in-front",
                    "label": "Contact space in front",
                    "status": _combined_area_status(space),
                    "finding": "The hands preserve a useful contact-space proxy." if space and space.get("status") == "strength" else "Create more room so the likely strike window can stay in front.",
                    "cameraBoundary": "This is a body-spacing proxy; exact ball contact is not detected.",
                },
                {
                    "id": "extend-direction",
                    "label": "Extension in the intended direction",
                    "status": _combined_area_status(space),
                    "finding": "Keep both arms connected and send the hands through the intended ball line before the finish develops.",
                },
                {
                    "id": "contact-racket-face",
                    "label": "Racket face at contact",
                    "status": "confirm",
                    "finding": "Confirm the racket face matches the intended height, spin, and direction.",
                    "cameraBoundary": "Racket-face angle and ball response require racket and ball tracking.",
                },
            ],
            "timestampSeconds": (head or space or {}).get("timestampSeconds"),
            "bodyRegionId": "head" if head and head.get("status") == "priority" else "hands",
            "phase": "contact",
        },
        {
            "id": "backhand-finish-recovery",
            "step": 4,
            "label": "Finish & recovery",
            "title": "Swing through, finish the elbow above the nose, and recover",
            "status": _combined_area_status(finish, feet, extension),
            "summary": (
                ("Let the non-dominant side carry through the intended line before the finish develops. " if finish and finish.get("status") == "priority" else "The hands travel through the intended line into a natural finish. ")
                + ("Regain a functional base and begin the first recovery step without rushing." if feet and feet.get("status") == "priority" else "Use the existing momentum to recover in balance.")
            ),
            "coachCue": "Through first. Elbow above the nose. Recover.",
            "cameraBoundary": "The camera can estimate hand path, balance, and recovery timing, but not ball quality or the exact racket finish.",
            "checks": [
                {
                    "id": "swing-through",
                    "label": "Hands travel through before finishing",
                    "status": _combined_area_status(finish),
                    "finding": "Carry the hands through the intended line before allowing the racket to finish." if finish and finish.get("status") == "priority" else "The hand path continues through before the finish develops.",
                },
                {
                    "id": "finish-knee-extension",
                    "label": "Leg drive continues into the finish",
                    "status": phase_checks["finish"][1]["status"],
                    "finding": phase_checks["finish"][1]["finding"],
                    "cameraBoundary": "This is a knee-angle estimate, not a force measurement.",
                },
                {
                    "id": "head-releases-after-contact",
                    "label": "Head releases only after contact",
                    "status": phase_checks["finish"][3]["status"],
                    "finding": phase_checks["finish"][3]["finding"],
                },
                {
                    "id": "lead-elbow-above-nose",
                    "label": "Lead elbow finishes above the nose line",
                    "status": _combined_area_status(finish),
                    "finding": "For this topspin/depth pattern, let the lead elbow rise above the nose line after the hands travel through. Flatter, defensive, and high-ball finishes can vary.",
                },
                {
                    "id": "recover",
                    "label": "Balanced first recovery step",
                    "status": _combined_area_status(finish, feet),
                    "finding": "Complete the swing, regain the base, and make the first recovery step without rushing." if (finish and finish.get("status") == "priority") or (feet and feet.get("status") == "priority") else "The finish leaves a usable base for recovery.",
                },
            ],
            "timestampSeconds": (finish or feet or {}).get("timestampSeconds"),
            "bodyRegionId": "finish",
            "phase": "follow_through",
        },
    ]


def _two_handed_backhand_audit(
    action_type: str,
    coaching_areas: list[dict[str, Any]],
    analysis_context: dict[str, Any],
    biomechanical_profile: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if action_type != "two_handed_backhand":
        return None
    areas = {str(item.get("id")): item for item in coaching_areas}
    feet = areas.get("footwork_base")
    preparation = areas.get("backlift_preparation")
    load = areas.get("lower_body_loading")
    extension = areas.get("lower_body_extension")
    head = areas.get("body_position")
    swing = areas.get("hand_swing_path")
    space = areas.get("contact_spacing")
    finish = areas.get("ending_position")
    body_checks = _backhand_phase_body_checks(coaching_areas, biomechanical_profile)
    situation = str(analysis_context.get("shotSituation", "unknown"))
    intent = str(analysis_context.get("shotIntent", "unknown"))
    if situation in {"defensive_on_run", "return_of_serve"}:
        stance_note = "For this situation, a compact preparation and open or outside-leg pattern may protect time and recovery; do not force a neutral step-in pattern."
    else:
        stance_note = "When time and spacing allow, a neutral or semi-closed base can support forward transfer; an open stance remains valid for width, pace, disguise, or faster recovery."
    if intent in {"power", "attack"}:
        path_note = "An attacking intention may use more extension and a flatter path, provided the player still has margin and balance."
    elif intent in {"consistency", "depth"}:
        path_note = "A consistency or depth intention usually benefits from net clearance, progressive acceleration, and enough spin to bring the ball down."
    else:
        path_note = "Judge swing shape against the intended height, spin, direction, and court position; one finish is not correct for every ball."

    complete_reference = GUIDE_EVIDENCE_ID
    supplied_reference = "athlete-supplied-backhand-phase-rubric"
    return {
        "version": "two-handed-backhand-reference-rubric-v2.0.0",
        "title": "Seven-phase technical backhand reference",
        "synthesis": "The complete stroke guide, the athlete-supplied backhand phase model, and six established coaching references were translated into separate checks for hands, knees, hips, head, and racket. AceCoach scores visible body motion and explicitly withholds claims about grip pressure, hand force, racket face, exact ball contact, and ball result when those signals are not tracked.",
        "stylePrinciple": "Build a repeatable personal backhand instead of copying one professional silhouette. Bent or straighter arms, compact or slightly larger preparation, and neutral or open stance can all be functional when they match the ball and preserve spacing, sequencing, balance, and recovery.",
        "checkpoints": [
            {
                "id": "ready-position",
                "step": 1,
                "label": "Ready position",
                "status": _combined_area_status(feet, head),
                "summary": "Start in an athletic base with soft knees, both hands relaxed on the racket, and the head level enough to read the opponent's strike.",
                "cue": "Balanced, soft, ready.",
                "measurement": "Pose-estimated base width, knee shape, balance point, and early head stability; hand and racket setup are confirmation-only.",
                "cameraBoundary": "The camera does not identify grip pressure, racket angle, gaze target, or opponent-contact timing.",
                "contextNote": "Ready width and knee bend should fit the athlete and court position; shoulder-width is a starting reference, not a universal target.",
                "sourceIds": [complete_reference, supplied_reference, "venus-williams-backhand-fundamentals", "coach-adri-two-handed-backhand-masterclass"],
                "timestampSeconds": (feet or head or {}).get("timestampSeconds"),
                "bodyRegionId": "feet",
                "phase": "preparation",
                "bodyChecks": body_checks["ready"],
            },
            {
                "id": "preparation-unit-turn",
                "step": 2,
                "label": "Preparation / unit turn",
                "status": _combined_area_status(feet, preparation),
                "summary": "Organize both hands together, turn the shoulders, hips, and racket as one unit, begin the knee load, and keep the racket head above the hands before the drop.",
                "cue": "Both hands set; turn as one.",
                "measurement": "Pose-estimated preparation timing, shoulder/hip line change, knee-angle change, and head stability; grip and racket height require confirmation.",
                "cameraBoundary": "Grip bevels, the exact racket-head line, and true 3D trunk rotation are not measured.",
                "contextNote": stance_note,
                "sourceIds": [complete_reference, supplied_reference, "venus-williams-backhand-fundamentals", "mouratoglou-fluid-backhand", "nathan-pasha-five-step-backhand"],
                "timestampSeconds": (feet or preparation or {}).get("timestampSeconds"),
                "bodyRegionId": "backlift",
                "phase": "preparation",
                "bodyChecks": body_checks["preparation"],
            },
            {
                "id": "load-drop",
                "step": 3,
                "label": "Load and drop",
                "status": _combined_area_status(preparation, load, head),
                "summary": "Reach the distinct knee-bend load, preserve a strong trunk position and quiet head, then allow the racket head to fall below the hand line before acceleration.",
                "cue": "Bend and load; let it drop.",
                "measurement": "Pose-estimated knee flexion, body lowering, arm space, head stability, and visible shoulder–hip separation.",
                "cameraBoundary": "Exact weight, ground force, wrist layback, racket height, and string angle are not measured.",
                "contextNote": "The depth of the load varies with ball height and time; the important distinction is that loading happens before the later knee drive.",
                "sourceIds": [complete_reference, supplied_reference, "top-tennis-training-three-step-backhand", "nathan-pasha-five-step-backhand", "coach-adri-two-handed-backhand-masterclass"],
                "timestampSeconds": (load or preparation or {}).get("timestampSeconds"),
                "bodyRegionId": "hips",
                "phase": "loading",
                "bodyChecks": body_checks["load_drop"],
            },
            {
                "id": "forward-swing",
                "step": 4,
                "label": "Forward swing",
                "status": _combined_area_status(load, extension, swing),
                "summary": "Release the chain from legs to hips to trunk to arms. The knees drive after loading, the hips lead the upper body, and the top non-dominant hand leads the swing path while the bottom hand guides.",
                "cue": "Load, drive, top hand through.",
                "measurement": "Pose-estimated knee extension, hip-to-shoulder timing, arm and wrist speed progression, and head stability.",
                "cameraBoundary": "Pose speed cannot measure force from either hand, grip pressure, muscle activation, or racket-head speed.",
                "contextNote": "The top-hand role is a coaching instruction. The paired wrist-speed readout is supporting movement evidence, not proof of which hand produced force.",
                "sourceIds": [complete_reference, supplied_reference, "mouratoglou-fluid-backhand", "coach-adri-two-handed-backhand-masterclass", "nathan-pasha-five-step-backhand"],
                "timestampSeconds": (extension or swing or load or {}).get("timestampSeconds"),
                "bodyRegionId": "knees" if extension and extension.get("status") == "priority" else "hands",
                "phase": "acceleration",
                "bodyChecks": body_checks["forward_swing"],
            },
            {
                "id": "contact",
                "step": 5,
                "label": "Contact",
                "status": _combined_area_status(space, head, swing),
                "summary": "Keep the head fixed on the likely strike window, preserve usable arm space, stay supported by the knees, and meet the ball before the finish develops.",
                "cue": "See the hit; make room.",
                "measurement": "Pose-estimated head stability, arm space, elbow shape, knee sequence, and shoulder–hip relationship around a likely contact proxy.",
                "cameraBoundary": "Exact contact, ball height, spin, trajectory, racket face, and whether the strings brushed or drove the ball are not detected.",
                "contextNote": path_note,
                "sourceIds": [complete_reference, supplied_reference, "venus-williams-backhand-fundamentals", "top-tennis-training-three-step-backhand", "coach-adri-two-handed-backhand-masterclass", "nathan-pasha-five-step-backhand"],
                "timestampSeconds": (space or head or swing or {}).get("timestampSeconds"),
                "bodyRegionId": "head" if head and head.get("status") == "priority" else "hands",
                "phase": "contact",
                "bodyChecks": body_checks["contact"],
            },
            {
                "id": "follow-through-finish",
                "step": 6,
                "label": "Follow-through / finish",
                "status": _combined_area_status(finish, extension),
                "summary": "Continue low-to-high and through the ball, let the elbows finish high for this topspin/depth pattern, extend the knees into the finish, and release the head only after contact.",
                "cue": "Through first; finish high.",
                "measurement": "Pose-estimated post-contact hand travel, knee extension, head hold, hip/shoulder travel, and balance.",
                "cameraBoundary": "The engine cannot confirm string orientation, the exact racket-head finish, or ball quality without racket and ball tracking.",
                "contextNote": "A high over-shoulder finish is common for topspin/depth; flatter, defensive, high-ball, and directional backhands can finish differently without being faults.",
                "sourceIds": [complete_reference, supplied_reference, "venus-williams-backhand-fundamentals", "mouratoglou-fluid-backhand", "top-tennis-training-three-step-backhand", "tennis-tv-atp-backhand-variations"],
                "timestampSeconds": (finish or extension or {}).get("timestampSeconds"),
                "bodyRegionId": "finish",
                "phase": "follow_through",
                "bodyChecks": body_checks["finish"],
            },
            {
                "id": "recovery",
                "step": 7,
                "label": "Recovery",
                "status": _combined_area_status(finish, feet),
                "summary": "Re-establish the athletic base, re-center the hands and racket, and move toward the recovery position for the opponent's next possible reply.",
                "cue": "Finish, reset, ready.",
                "measurement": "Pose-estimated recovery base, balance-point stability, knee shape, and reset timing.",
                "cameraBoundary": "Court geometry, opponent position, gaze target, and exact racket re-centering are not detected.",
                "contextNote": "The best recovery point depends on shot direction, court position, and the opponent's options; center is not always the correct destination.",
                "sourceIds": [complete_reference, supplied_reference, "venus-williams-backhand-fundamentals", "coach-adri-two-handed-backhand-masterclass", "tennis-tv-atp-backhand-variations"],
                "timestampSeconds": (feet or finish or {}).get("timestampSeconds"),
                "bodyRegionId": "feet",
                "phase": "follow_through",
                "bodyChecks": body_checks["recovery"],
            },
        ],
    }


def _generic_stroke_audit(
    action_type: str,
    coaching_areas: list[dict[str, Any]],
    analysis_context: dict[str, Any],
) -> dict[str, Any] | None:
    guide = guide_for(action_type)
    if not guide:
        return None
    areas = {str(item.get("id")): item for item in coaching_areas}
    checkpoints: list[dict[str, Any]] = []

    for step, phase_definition in enumerate(guide["phases"], start=1):
        body_checks: list[dict[str, Any]] = []
        phase_areas: list[dict[str, Any]] = []
        for index, check_definition in enumerate(phase_definition["checks"], start=1):
            area_id = check_definition.get("areaId")
            area = areas.get(str(area_id)) if area_id else None
            if area:
                phase_areas.append(area)
                status = _combined_area_status(area)
                observation = str(area.get("observation") or "The body position was visible enough for a coaching read.")
                finding = f"Video read: {observation} Coaching checkpoint: {check_definition['target']}"
                measurement_basis = str(area.get("measurementBasis") or "pose_estimate")
            else:
                status = "confirm"
                finding = f"Confirm from a clear view: {check_definition['target']}"
                measurement_basis = "athlete_or_racket_confirmation"

            body_check: dict[str, Any] = {
                "id": f"{phase_definition['id']}-{index}",
                "bodyPart": check_definition["bodyPart"],
                "status": status,
                "finding": finding,
                "measurementBasis": measurement_basis,
            }
            camera_boundary = check_definition.get("cameraBoundary")
            if camera_boundary:
                body_check["cameraBoundary"] = camera_boundary
            body_checks.append(body_check)

        unique_phase_areas = list({str(area.get("id")): area for area in phase_areas}.values())
        status = _combined_area_status(*unique_phase_areas) if unique_phase_areas else "confirm"
        timestamp = next(
            (
                float(area["timestampSeconds"])
                for area in unique_phase_areas
                if isinstance(area.get("timestampSeconds"), (int, float))
            ),
            None,
        )
        checkpoints.append({
            "id": phase_definition["id"],
            "step": step,
            "label": phase_definition["label"],
            "status": status,
            "summary": phase_definition["summary"],
            "cue": phase_definition["cue"],
            "measurement": phase_definition["measurement"],
            "cameraBoundary": phase_definition["cameraBoundary"],
            "contextNote": phase_definition["contextNote"],
            "sourceIds": [GUIDE_EVIDENCE_ID],
            "timestampSeconds": timestamp,
            "bodyRegionId": phase_definition["bodyRegionId"],
            "phase": phase_definition["phase"],
            "bodyChecks": body_checks,
        })

    phase_count = len(checkpoints)
    supplied_context = str(analysis_context.get("statement") or "")
    return {
        "version": f"{STROKE_GUIDE_VERSION}:{action_type}",
        "title": f"{phase_count}-phase {guide['displayName'].lower()} technical reference",
        "synthesis": (
            f"The complete stroke guide is applied to this {guide['displayName'].lower()} from first movement through recovery. "
            "Each phase connects the visible feet and knees, hips and shoulders, hands, and head. Exact grip, racket face, pronation, spin, ball contact, and ball result stay marked Confirm when pose-only video cannot support the claim. "
            f"{supplied_context}"
        ).strip(),
        "stylePrinciple": guide["stylePrinciple"],
        "checkpoints": checkpoints,
    }


def _stroke_technical_audit(
    action_type: str,
    coaching_areas: list[dict[str, Any]],
    analysis_context: dict[str, Any],
    biomechanical_profile: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    backhand_audit = _two_handed_backhand_audit(action_type, coaching_areas, analysis_context, biomechanical_profile)
    if backhand_audit:
        return backhand_audit
    return _generic_stroke_audit(action_type, coaching_areas, analysis_context)


def _pyramid_summary(
    action_type: str,
    coach_summary: dict[str, Any],
    strengths: list[dict[str, Any]],
    priorities: list[dict[str, Any]],
    drills: list[dict[str, Any]],
    coaching_playbook: dict[str, Any],
    analysis_context: dict[str, Any],
    coaching_areas: list[dict[str, Any]],
    biomechanical_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    working_points: list[dict[str, Any]] = []
    working_phrases: list[str] = []
    for index, item in enumerate(strengths[:2]):
        title, summary, why, short = _strength_copy(str(item.get("title", "Working quality")), str(item.get("evidence", "")))
        region, phase = _point_location(str(item.get("title", "")))
        working_phrases.append(short)
        working_points.append({
            "id": f"strength-{index + 1}",
            "title": title,
            "summary": summary,
            "whyItMatters": why,
            "timestampSeconds": item.get("timestampSeconds"),
            "bodyRegionId": region,
            "phase": phase,
        })

    improvement_points: list[dict[str, Any]] = []
    change_phrases: list[str] = []
    for index, item in enumerate(priorities[:3]):
        title, summary, short = _priority_copy(
            str(item.get("title", "Improvement area")),
            str(item.get("nextStep", "")),
            str(item.get("finding", "")),
        )
        region, phase = _point_location(str(item.get("title", "")))
        change_phrases.append(short)
        improvement_points.append({
            "id": f"improvement-{index + 1}",
            "title": title,
            "summary": summary,
            "whyItMatters": item.get("impact", "This makes the stroke more balanced and repeatable."),
            "cue": item.get("cue", "Make one clear change at a time."),
            "timestampSeconds": item.get("timestampSeconds"),
            "bodyRegionId": region,
            "phase": phase,
        })

    first_instruction = (
        improvement_points[0]["title"][:1].lower() + improvement_points[0]["title"][1:]
        if improvement_points
        else "make one clear change at a time"
    )
    change_sentence = (
        f"First, {first_instruction}. After that, work on {_join_natural(change_phrases[1:])}."
        if len(change_phrases) > 1
        else f"First, {first_instruction}."
    )
    primary = priorities[0] if priorities else {}
    drill = drills[0] if drills else {}
    movement = _label(action_type).lower()
    return {
        "headline": f"{working_points[0]['title'] if working_points else 'Keep what already works'}. {improvement_points[0]['title'] if improvement_points else 'Make one clear change first'}.",
        "bottomLine": f"Your {movement} already shows {_join_natural(working_phrases)}. {change_sentence}",
        "synthesisNote": "This answer combines the full-video pattern, phase timing, body-position estimates, repetition evidence, and the available biomechanical checks. It leaves out anything the camera cannot support.",
        "strengths": working_points,
        "improvements": improvement_points,
        "firstAction": {
            "title": improvement_points[0]["title"] if improvement_points else "Make one clear change first",
            "reason": primary.get("impact", coach_summary.get("whyItMatters", "Make the movement more repeatable.")),
            "cue": coaching_playbook.get("feelCue", primary.get("cue", "One change at a time.")),
            "drillName": drill.get("name", "Slow rehearsal"),
            "successMetric": drill.get("successMetric", "Repeat the movement with stable balance."),
        },
        "framework": _two_handed_backhand_framework(action_type, coaching_areas, biomechanical_profile),
        "audit": _stroke_technical_audit(action_type, coaching_areas, analysis_context, biomechanical_profile),
        "contextStatement": analysis_context.get("statement"),
    }




class AnalysisPipeline:
    def analyze(self, payload: Any) -> dict[str, Any]:
        metadata = download_video(str(payload.video_url), payload.expected_content_hash)
        try:
            analysis_context = _analysis_context(payload)
            pose_frames = extract_pose_frames(metadata)
            if not pose_frames:
                raise ValueError("No frames could be decoded from the video.")

            dominant_side = payload.dominant_side or "right"
            biomechanics = compute_frame_metrics(pose_frames, metadata.fps, dominant_side)
            repetition_windows = [
                RepetitionWindow(
                    index=int(item["index"]),
                    start_frame=int(item["startFrame"]),
                    peak_frame=int(item["peakFrame"]),
                    end_frame=int(item["endFrame"]),
                    peak_motion=float(item["peakMotion"]),
                    mean_visibility=float(item["meanVisibility"]),
                )
                for item in biomechanics.repetitions
            ]
            classification = classify_movement(
                pose_frames,
                repetition_windows,
                payload.sport_id,
                payload.action_type,
                dominant_side,
            )

            sport_supported = payload.sport_id in SUPPORTED_TECHNIQUE_SPORTS
            confirmed_action = payload.confirmed_action_type.strip() if payload.confirmed_action_type else None
            if not sport_supported:
                analysis_action = confirmed_action or payload.action_type
                movement_confirmed = False
                decision_mode = "unsupported_sport_capture_only"
            elif confirmed_action:
                analysis_action = confirmed_action
                movement_confirmed = True
                decision_mode = "athlete_confirmed"
            elif (
                classification.detected_action != "unknown"
                and not classification.mismatch
                and not classification.requires_confirmation
            ):
                analysis_action = payload.action_type
                movement_confirmed = True
                decision_mode = "selection_supported_by_classifier"
            else:
                analysis_action = payload.action_type
                movement_confirmed = False
                decision_mode = "pending_athlete_confirmation"

            classification_payload = classification.as_dict()
            classification_payload.update({
                "analysisAction": analysis_action,
                "analysisActionLabel": _label(analysis_action),
                "decisionMode": decision_mode,
                "provisional": not movement_confirmed,
                "confirmedAction": confirmed_action,
                "confirmedActionLabel": _label(confirmed_action) if confirmed_action else None,
            })

            overall, phase_scores, metric_scores, measurement_confidence, score_status = score_from_measurements(
                biomechanics,
                analysis_action,
                movement_confirmed,
                payload.sport_id,
            )
            biomechanical_profile = build_biomechanical_profile(
                biomechanics,
                analysis_action,
                phase_scores,
                measurement_confidence,
            )
            classification_confidence = classification.confidence if classification.detected_action != "unknown" else 0.35
            confidence = round(
                measurement_confidence
                if confirmed_action
                else min(measurement_confidence, max(0.30, classification_confidence)),
                3,
            )

            capture_score = int(biomechanics.capture_quality.get("score", 0))
            diagnostics = biomechanics.capture_quality.get("diagnostics", {})
            pose_coverage = float(diagnostics.get("corePoseCoverage", 0.0))
            clipping_ratio = float(diagnostics.get("edgeClippingRatio", 1.0))
            body_height_ratio = float(diagnostics.get("medianBodyHeightRatio", 0.0))
            repetition_count = len(biomechanics.repetitions)
            no_repetitions = repetition_count == 0
            insufficient_repetitions = repetition_count < 2
            capture_blocked = (
                capture_score < 58
                or pose_coverage < 0.70
                or clipping_ratio > 0.20
                or body_height_ratio < 0.28
            )
            if capture_blocked:
                overall = None
                score_status = "blocked_capture_quality"
            elif not sport_supported:
                overall = None
                score_status = "blocked_unsupported_sport"
            elif no_repetitions:
                overall = None
                score_status = "blocked_no_complete_repetition"
            elif insufficient_repetitions and movement_confirmed:
                overall = None
                score_status = "insufficient_repetitions_for_score"

            (
                strengths,
                priorities,
                drills,
                next_session,
                limitations,
                coaching_areas,
                reference,
                coach_summary,
                performance_story,
                visual_moments,
                measurement_coverage,
                practice_plan,
                evidence,
            ) = build_coaching(
                payload.sport_id,
                analysis_action,
                metric_scores,
                phase_scores,
                biomechanics.timeline,
                confidence,
                score_status,
                payload.age_band,
                payload.playing_level,
            )

            if capture_blocked:
                coach_summary = {
                    "headline": "Record a clearer clip before changing technique",
                    "strongestQuality": "The system completed a capture-quality review.",
                    "mainPriority": "Improve framing, lighting, and full-body visibility.",
                    "whyItMatters": "Low-quality tracking can create misleading joint paths and phase timing.",
                    "practiceFocus": biomechanics.capture_quality.get("limitations", [])[:3],
                }
                strengths = []
                priorities = []
                drills = []
                coaching_areas = []
                visual_moments = []
                practice_plan = {"title": "Capture reset", "primaryGoal": "Improve recording quality", "cue": "Frame the full athlete.", "sessions": []}
                performance_story = {
                    "identity": "The recording did not pass the reliability gate.",
                    "rootCauseHypothesis": "Tracking quality, not technique, is the current constraint.",
                    "transferRisk": "Technical advice from this clip could be misleading.",
                    "nextMilestone": "Record a stable, well-lit clip with the full body and racket area visible.",
                    "coachPrinciple": "Reliable input comes before technical correction.",
                }
                reference.update({
                    "status": "blocked_capture_quality",
                    "areas": [],
                    "nextStep": "Improve capture quality before using a development-reference lens.",
                })
                limitations.insert(0, "Technique scoring was blocked because capture quality did not meet the minimum reliability gate.")
            elif not sport_supported:
                coach_summary = {
                    "headline": f"{payload.sport_id.replace('_', ' ').title()} capture review complete",
                    "strongestQuality": "The system assessed video measurability and body-landmark coverage.",
                    "mainPriority": "Do not use tennis-calibrated technique scoring for this sport.",
                    "whyItMatters": "Movement phases, equipment interactions, and coaching criteria differ by sport. Applying tennis rules would create false precision.",
                    "practiceFocus": [
                        "Use the capture-quality guidance to improve the next recording.",
                        "Wait for a validated sport pack before using technique scores.",
                        "Review the clip with a qualified sport-specific coach.",
                    ],
                }
                strengths = []
                priorities = []
                drills = []
                coaching_areas = []
                visual_moments = []
                practice_plan = {
                    "title": "Capture-quality baseline only",
                    "primaryGoal": "Create a reliable recording",
                    "cue": "Full body, implement area, and stable camera.",
                    "sessions": [],
                }
                performance_story = {
                    "identity": "This sport is not yet supported by the calibrated technique engine.",
                    "rootCauseHypothesis": "The current limitation is model validation, not a confirmed athlete technique issue.",
                    "transferRisk": "Cross-sport coaching rules could mislabel normal movement as a fault.",
                    "nextMilestone": "Use a validated sport-specific engine release.",
                    "coachPrinciple": "Withhold technical judgment when the model is not calibrated.",
                }
                reference.update({
                    "status": "unsupported_sport",
                    "areas": [],
                    "nextStep": "A validated sport-specific reference model is required.",
                })
                limitations.insert(0, "Technique scoring and prescriptions were withheld because this sport pack is not yet validated.")
            elif no_repetitions:
                coach_summary = {
                    "headline": "No complete stroke window was found",
                    "strongestQuality": "The clip was decoded and pose tracking ran.",
                    "mainPriority": "Upload a shorter clip containing one or more complete strokes.",
                    "whyItMatters": "The engine needs preparation, acceleration, likely contact, finish, and recovery to create useful coaching.",
                    "practiceFocus": [
                        "Start recording before preparation begins.",
                        "Keep the full body and racket area visible.",
                        "Include at least three complete repetitions when possible.",
                    ],
                }
                coaching_areas = []
                strengths = []
                priorities = []
                drills = []
                visual_moments = []
                practice_plan = {"title": "Movement capture reset", "primaryGoal": "Record complete repetitions", "cue": "Start before preparation and finish after recovery.", "sessions": []}
                performance_story = {
                    "identity": "No complete movement chain was available for coaching.",
                    "rootCauseHypothesis": "The clip begins or ends inside the stroke, or the movement signal is too fragmented.",
                    "transferRisk": "Partial-stroke analysis can misidentify the true first constraint.",
                    "nextMilestone": "Record at least three complete strokes from preparation through recovery.",
                    "coachPrinciple": "Coach the whole chain, not an isolated frame.",
                }
                reference.update({
                    "status": "blocked_no_complete_repetition",
                    "areas": [],
                    "nextStep": "Record complete repetitions before applying a development-reference lens.",
                })
                limitations.insert(0, "Technique scoring was blocked because no complete repetition was detected.")
            elif insufficient_repetitions and movement_confirmed:
                coach_summary = {
                    "headline": "Useful observations, but not enough repetition evidence for a score",
                    "strongestQuality": strengths[0]["title"] if strengths else "One complete movement window was measured.",
                    "mainPriority": "Establish a repeatable baseline before changing technique.",
                    "whyItMatters": "A single stroke can be atypical. At least two complete repetitions are required before the execution index or a technical practice prescription is shown.",
                    "practiceFocus": [
                        "Keep the same camera position.",
                        "Record 6–10 complete repetitions.",
                        "Use the same drill and intended shot for comparability.",
                    ],
                }
                practice_plan = {
                    "title": "Baseline capture plan",
                    "primaryGoal": "Establish repeatable evidence",
                    "cue": "Same drill, same camera, complete repetitions.",
                    "sessions": [
                        {
                            "id": "baseline",
                            "day": "Next session",
                            "title": "Build a comparable baseline",
                            "duration": "15 minutes",
                            "objective": "Produce 6–10 complete repetitions without changing multiple technical variables.",
                            "drillName": "Controlled same-feed baseline",
                            "dosage": "2 rehearsal sets, then record 8–12 attempts.",
                            "successMetric": "At least six complete repetitions are visible from preparation through recovery.",
                        },
                        {
                            "id": "reassess",
                            "day": "Immediately after",
                            "title": "Reanalyze the reliable sample",
                            "duration": "5 minutes",
                            "objective": "Upload the clean clip and confirm the detected movement.",
                            "drillName": "Reliability-gated reassessment",
                            "dosage": "One clip under 30 seconds.",
                            "successMetric": "The report detects at least two complete repetitions and passes capture quality.",
                        },
                    ],
                }
                performance_story = {
                    "identity": "The clip contains one usable movement window, but not enough repetition evidence to identify a stable technical constraint.",
                    "rootCauseHypothesis": "The current limitation is sample reliability rather than a confirmed technique fault.",
                    "transferRisk": "Changing technique from one atypical repetition could solve the wrong problem.",
                    "nextMilestone": "Record at least six complete comparable repetitions.",
                    "coachPrinciple": "Establish repeatability before prescribing correction.",
                }
                reference.update({
                    "status": "insufficient_repetitions",
                    "areas": [],
                    "nextStep": "Create a multi-repetition baseline before comparing against development criteria.",
                })
                limitations.insert(0, "The execution index was withheld because fewer than two complete repetitions were detected.")

            coaching_playbook = build_coaching_playbook(
                analysis_action,
                coach_summary,
                priorities,
                drills,
                payload.primary_goal,
            )
            repetition_insights = build_repetition_insights(biomechanics.repetitions)
            ontology_reasoning = None
            if (
                sport_supported
                and movement_confirmed
                and not capture_blocked
                and not no_repetitions
                and coaching_areas
            ):
                ontology_reasoning = ground_report_in_ontology(
                    action_type=analysis_action,
                    camera_angle=analysis_context["cameraAngle"],
                    confidence=confidence,
                    repetition_count=repetition_count,
                    timeline=biomechanics.timeline,
                    areas=coaching_areas,
                    strengths=strengths,
                    limitations=limitations,
                    repetition_insights=repetition_insights,
                )
            if ontology_reasoning:
                fault = ontology_reasoning["fault"]
                insight = ontology_reasoning["insight"]
                selected_drill = ontology_reasoning["drill"]
                origin_time = next(
                    (beat["timeWindow"].get("timestampSeconds") for beat in insight["visualStory"]["beats"] if beat["beatId"] == "B2_CAUSE"),
                    insight["visualStory"]["beats"][0]["timeWindow"].get("timestampSeconds", 0),
                )
                priorities = [{
                    "rank": 1,
                    "title": fault["title"],
                    "finding": insight["playerCoaching"]["coachRead"],
                    "impact": fault["performance_consequence"],
                    "nextStep": fault["player_message"],
                    "cue": insight["playerCoaching"]["feel"],
                    "frameIndex": next((item.get("frameIndex") for item in biomechanics.timeline if item.get("timestampSeconds") == origin_time), None),
                    "timestampSeconds": origin_time,
                    "confidence": insight["confidence"]["interpretation"],
                    "measurementBasis": f"ontology-v4.1:{fault['fault_id']}",
                    "faultId": fault["fault_id"],
                    "faultStatus": ontology_reasoning["status"],
                    "phaseOrigin": fault["phase_origin"],
                    "phaseVisibleEffect": fault["phase_visible_effect"],
                }]
                ontology_drills = []
                seen_drill_ids: set[str] = set()
                for finding in ontology_reasoning.get("findings", []):
                    finding_drill = finding.get("drill")
                    if not finding_drill or finding_drill["id"] in seen_drill_ids:
                        continue
                    seen_drill_ids.add(finding_drill["id"])
                    ontology_drills.append({
                        "id": finding_drill["id"], "name": finding_drill["name"],
                        "purpose": finding_drill["purpose"], "dosage": finding_drill["dosage"],
                        "cue": finding_drill["cue"], "successMetric": finding_drill["success"],
                        "setup": finding_drill.get("setup"), "action": finding_drill.get("action"),
                        "stopCondition": finding_drill.get("stopCondition"),
                        "reassessment": finding_drill.get("reassessment"),
                        "targetFaultIds": finding_drill.get("targetFaultIds", []),
                        "ontologyVersion": "4.1.0",
                    })
                    if len(ontology_drills) == 3:
                        break
                if ontology_drills:
                    drills = ontology_drills
                coach_summary.update({
                    "headline": insight["thesis"],
                    "mainPriority": fault["title"],
                    "whyItMatters": insight["playerCoaching"]["why"],
                    "practiceFocus": [insight["playerCoaching"]["change"], insight["playerCoaching"]["feel"], insight["playerCoaching"]["success"]],
                    "ontologyFaultId": fault["fault_id"],
                    "ontologyFaultStatus": ontology_reasoning["status"],
                    "nextGenerationStory": insight,
                    "ontologyReasoning": {key: value for key, value in ontology_reasoning.items() if key not in {"insight", "fault", "drill"}},
                })
                performance_story.update({
                    "rootCauseHypothesis": insight["thesis"],
                    "transferRisk": insight["playerCoaching"]["why"],
                    "nextMilestone": insight["playerCoaching"]["success"],
                    "coachPrinciple": f"One active cue: {insight['playerCoaching']['feel']}",
                })
                coaching_playbook = build_coaching_playbook(
                    analysis_action, coach_summary, priorities, drills, payload.primary_goal,
                )

            coach_summary["contextStatement"] = analysis_context["statement"]
            coach_summary["coachVerdict"] = (
                f"Here is my honest read: {coach_summary.get('mainPriority', 'make one clear change first')} "
                f"Keep {coach_summary.get('strongestQuality', 'the parts that already feel balanced and repeatable').rstrip('.').lower()}."
            )
            coach_summary["executiveBullets"] = _executive_bullets(
                coach_summary,
                strengths,
                priorities,
                coaching_playbook,
                analysis_context,
            )
            coach_summary["pyramidSummary"] = _pyramid_summary(
                analysis_action,
                coach_summary,
                strengths,
                priorities,
                drills,
                coaching_playbook,
                analysis_context,
                coaching_areas,
                biomechanical_profile,
            )
            performance_story["shotContext"] = analysis_context["statement"]
            if analysis_context["source"] != "athlete_supplied":
                limitations.append(
                    "Shot situation or intention was not fully supplied, so the report does not infer whether the movement was tactically appropriate for the incoming ball."
                )

            quality_gate = {
                "status": score_status,
                "capturePassed": not capture_blocked,
                "movementConfirmed": movement_confirmed and sport_supported,
                "sportSupported": sport_supported,
                "repetitionDetected": not no_repetitions,
                "repetitionCount": repetition_count,
                "minimumRepetitionsForScore": 2,
                "canUseTechniqueScore": score_status == "provisional_criterion_index",
                "messages": [
                    *(biomechanics.capture_quality.get("limitations", []) if capture_blocked else []),
                    *(["This sport currently supports capture-quality review only; technique scoring is withheld."] if not sport_supported else []),
                    *(["Confirm the movement label to unlock sport-specific coaching."] if sport_supported and not movement_confirmed else []),
                    *(["Record at least one complete stroke from preparation through recovery."] if no_repetitions else []),
                    *(["Record at least two complete strokes before using the execution index."] if insufficient_repetitions and not no_repetitions else []),
                ],
            }

            runtime = _runtime_manifest()
            runtime_signature = _runtime_signature(runtime)
            manifest = {
                "engineVersion": ENGINE_VERSION,
                "poseModelVersion": POSE_MODEL_VERSION,
                "classifierVersion": CLASSIFIER_VERSION,
                "temporalModelVersion": TEMPORAL_MODEL_VERSION,
                "signalAnalyticsVersion": SIGNAL_ANALYTICS_VERSION,
                "biomechanicsVersion": BIOMECHANICS_VERSION,
                "scoringVersion": SCORING_VERSION,
                "biomechanicalProfileVersion": PROFILE_VERSION,
                "knowledgeVersion": KNOWLEDGE_VERSION,
                "ontologyVersion": ONTOLOGY_VERSION,
                "ontologyManifestHash": ontology_manifest_hash(),
                "evidenceVersion": EVIDENCE_VERSION,
                "reportVersion": REPORT_VERSION,
                "ontologyReasonerVersion": ONTOLOGY_REASONER_VERSION,
                "analysisMode": "monocular_pose_review_governed_progress_analytics_beta",
                "runtime": runtime,
                "runtimeSignature": runtime_signature,
            }
            fingerprint_source = ":".join([
                metadata.content_hash,
                payload.sport_id,
                analysis_action,
                confirmed_action or "",
                dominant_side,
                payload.age_band or "",
                payload.playing_level or "",
                payload.primary_goal or "",
                analysis_context["cameraAngle"],
                analysis_context["shotSituation"],
                analysis_context["shotIntent"],
                analysis_context["athleteQuestion"] or "",
                str(analysis_context["athleteHeightCm"] or ""),
                ENGINE_VERSION,
                POSE_MODEL_VERSION,
                CLASSIFIER_VERSION,
                TEMPORAL_MODEL_VERSION,
                SIGNAL_ANALYTICS_VERSION,
                BIOMECHANICS_VERSION,
                SCORING_VERSION,
                PROFILE_VERSION,
                KNOWLEDGE_VERSION,
                ONTOLOGY_VERSION,
                ontology_manifest_hash(),
                ONTOLOGY_REASONER_VERSION,
                REPORT_VERSION,
                EVIDENCE_VERSION,
                runtime_signature,
            ])
            input_fingerprint = hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest()

            important_frames = {
                int(item["frameIndex"])
                for item in biomechanics.timeline
            }
            for repetition in biomechanics.repetitions:
                important_frames.update({
                    int(repetition["startFrame"]),
                    int(repetition["peakFrame"]),
                    int(repetition["endFrame"]),
                })
            report_frames, display_stride = _sample_frame_metrics(biomechanics.frame_metrics, important_frames)

            frame_summary = {
                "fps": metadata.fps,
                "frameCount": metadata.frame_count,
                "processedFrameCount": len(pose_frames),
                "displayedFrameCount": len(report_frames),
                "displayFrameStride": display_stride,
                "processedEveryFrame": True,
                "width": metadata.width,
                "height": metadata.height,
                "durationSeconds": metadata.duration_seconds,
                "poseCoverage": biomechanics.pose_coverage,
                "aggregateMetrics": biomechanics.aggregate_metrics,
                "frameMetrics": report_frames,
                "primaryRepetitionIndex": biomechanics.primary_repetition_index,
                "dominantSide": dominant_side,
                "analysisAction": analysis_action,
                "biomechanicalProfile": biomechanical_profile,
                "analysisContext": analysis_context,
                "athleteCalibration": {
                    "status": "height_aware" if analysis_context["athleteHeightCm"] is not None else "body_relative_only",
                    "heightCm": analysis_context["athleteHeightCm"],
                    "uses": [
                        "Contextualize reach and spacing relative to the athlete",
                        "Label the visual body model with the supplied physical scale",
                    ],
                    "limitation": "A single uncalibrated camera cannot recover exact 3D distance, ground force, joint load, or individual body proportions from height alone.",
                },
                "bodyRegionReview": _body_region_review(
                    analysis_action,
                    biomechanical_profile,
                    coaching_areas,
                    biomechanics.timeline,
                ),
            }

            capture_quality = dict(biomechanics.capture_quality)
            capture_quality["positives"] = [
                f"Decoded and processed {len(pose_frames)} frames at {metadata.fps:.2f} fps.",
                f"Detected {len(biomechanics.repetitions)} complete movement window{'s' if len(biomechanics.repetitions) != 1 else ''}.",
                *capture_quality.get("positives", []),
            ]

            return {
                "input_fingerprint": input_fingerprint,
                "content_hash": metadata.content_hash,
                "overall_score": overall,
                "score_status": score_status,
                "score_label": "Provisional execution index" if overall is not None else ("Technique score unavailable" if score_status == "blocked_unsupported_sport" else "Execution index withheld"),
                "confidence": confidence,
                "capture_quality": capture_quality,
                "phase_scores": phase_scores,
                "metric_scores": metric_scores,
                "strengths": strengths,
                "priorities": priorities,
                "drills": drills,
                "next_session": next_session,
                "coach_summary": coach_summary,
                "performance_story": performance_story,
                "visual_moments": visual_moments,
                "measurement_coverage": measurement_coverage,
                "practice_plan": practice_plan,
                "coaching_playbook": coaching_playbook,
                "repetition_insights": repetition_insights,
                "evidence": evidence,
                "safety_note": "This educational analysis does not diagnose injury. Stop if pain occurs and consult a qualified sports-health professional.",
                "limitations": limitations,
                "engine_manifest": manifest,
                "frame_summary": frame_summary,
                "movement_timeline": biomechanics.timeline,
                "repetitions": biomechanics.repetitions,
                "movement_classification": classification_payload,
                "coaching_areas": coaching_areas,
                "reference_comparison": reference,
                "quality_gate": quality_gate,
                "next_generation_story": ontology_reasoning["insight"] if ontology_reasoning else None,
                "ontology_reasoning": ({key: value for key, value in ontology_reasoning.items() if key not in {"insight", "fault", "drill"}} if ontology_reasoning else None),
            }
        finally:
            Path(metadata.path).unlink(missing_ok=True)
