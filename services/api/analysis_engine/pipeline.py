from __future__ import annotations

import hashlib
import json
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
from .knowledge_control import compile_knowledge_control
from .pose import POSE_MODEL_VERSION, extract_pose_frames
from .signal_analytics import SIGNAL_ANALYTICS_VERSION
from .ontology_reasoner import ground_report_in_ontology, ontology, ontology_manifest_hash
from .sport_rules import KNOWLEDGE_VERSION, build_coaching, build_practice_plan
from .temporal import TEMPORAL_MODEL_VERSION, RepetitionWindow
from .video import download_video

ENGINE_VERSION = "movement-intelligence-v1.13.0"
REPORT_VERSION = "6.9.0-knowledge-controlled"
ONTOLOGY_VERSION = "4.1.0"
ONTOLOGY_REASONER_VERSION = "4.3.0-knowledge-control-plane"
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


class AnalysisPipeline:
    def analyze(self, payload: Any) -> dict[str, Any]:
        ontology_bundle = ontology()
        control_policy = ontology_bundle.analysis_control_policy
        metadata = download_video(str(payload.video_url), payload.expected_content_hash)
        try:
            analysis_context = _analysis_context(payload)
            pose_frames = extract_pose_frames(metadata)
            if not pose_frames:
                raise ValueError("No frames could be decoded from the video.")

            dominant_side = payload.dominant_side or "right"
            biomechanics = compute_frame_metrics(
                pose_frames,
                metadata.fps,
                dominant_side,
                control_policy=control_policy,
            )
            validated_outcome_labels = getattr(payload, "validated_outcomes", [])
            validated_outcomes = {
                int(item.repetition_index): item.model_dump()
                for item in validated_outcome_labels
            }
            for repetition in biomechanics.repetitions:
                outcome = validated_outcomes.get(int(repetition["index"]))
                if not outcome:
                    continue
                repetition.update({
                    "outcomeLabel": outcome["execution_result"],
                    "outcomeSource": outcome["outcome_source"],
                    "outcomeValidationStatus": outcome["validation_status"],
                    "outcomeContext": {
                        key: value
                        for key, value in outcome.items()
                        if key not in {"repetition_index", "execution_result", "outcome_source", "validation_status"}
                        and value is not None
                    },
                })
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
                control_policy=control_policy,
            )
            biomechanical_profile = build_biomechanical_profile(
                biomechanics,
                analysis_action,
                phase_scores,
                measurement_confidence,
            )
            reliability_policy = control_policy["reliability"]
            classification_confidence = (
                classification.confidence
                if classification.detected_action != "unknown"
                else float(reliability_policy["unknown_classification_confidence"])
            )
            confidence = round(
                measurement_confidence
                if confirmed_action
                else min(
                    measurement_confidence,
                    max(float(reliability_policy["classification_confidence_floor"]), classification_confidence),
                ),
                3,
            )

            capture_score = int(biomechanics.capture_quality.get("score", 0))
            diagnostics = biomechanics.capture_quality.get("diagnostics", {})
            pose_coverage = float(diagnostics.get("corePoseCoverage", 0.0))
            clipping_ratio = float(diagnostics.get("edgeClippingRatio", 1.0))
            body_height_ratio = float(diagnostics.get("medianBodyHeightRatio", 0.0))
            repetition_count = len(biomechanics.repetitions)
            no_repetitions = repetition_count == 0
            minimum_repetitions_for_score = int(reliability_policy["minimum_repetitions_for_score"])
            insufficient_repetitions = repetition_count < minimum_repetitions_for_score
            capture_blocked = (
                capture_score < int(reliability_policy["minimum_capture_score"])
                or pose_coverage < float(reliability_policy["minimum_pose_coverage"])
                or clipping_ratio > float(reliability_policy["maximum_edge_clipping_ratio"])
                or body_height_ratio < float(reliability_policy["minimum_body_height_ratio"])
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
                control_policy=control_policy,
            )
            for area in coaching_areas:
                area.update({
                    "policyId": control_policy["scoring"]["policy_id"],
                    "policyVersion": control_policy["version"],
                    "knowledgeControlled": True,
                })

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
                next_session = {
                    "objective": "Improve recording quality",
                    "recordingPlan": "Use a stable camera, even lighting, and keep the full body plus racket area visible for every repetition.",
                    "successCriteria": ["The next recording passes every capture-quality gate."],
                    "sessionPlan": [],
                }
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
                next_session = {
                    "objective": "Create a reliable sport-specific recording",
                    "recordingPlan": "Keep the full movement and equipment area visible with a stable camera.",
                    "successCriteria": ["A validated sport pack is available before technique scoring is used."],
                    "sessionPlan": [],
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
                next_session = {
                    "objective": "Record complete movement windows",
                    "recordingPlan": "Start before preparation and continue until recovery is complete; keep the full body and racket area visible.",
                    "successCriteria": ["The engine detects at least one complete repetition from preparation through recovery."],
                    "sessionPlan": [],
                }
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
                strengths = []
                priorities = []
                drills = []
                coaching_areas = []
                visual_moments = []
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
                next_session = {
                    "objective": "Build a comparable multi-repetition baseline",
                    "recordingPlan": "Record 6–10 complete strokes with the same camera view, drill, and intended shot.",
                    "successCriteria": [f"At least {minimum_repetitions_for_score} complete repetitions pass the reliability gate."],
                    "sessionPlan": [],
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
            repetition_insights = build_repetition_insights(
                biomechanics.repetitions,
                control_policy=control_policy,
            )
            ontology_reasoning = None
            if (
                sport_supported
                and movement_confirmed
                and not capture_blocked
                and not no_repetitions
                and not insufficient_repetitions
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
                    repetitions=biomechanics.repetitions,
                    playing_level=payload.playing_level,
                )
            if ontology_reasoning:
                strengths = [{
                    "title": item["label"],
                    "evidence": item["summary"],
                    "confidence": min(
                        [float(record.get("confidence") or confidence) for record in item.get("evidence", [])]
                        or [confidence]
                    ),
                    "policyId": control_policy["domains"]["insights"]["policy_ids"][0],
                    "policyVersion": control_policy["version"],
                    "ontologyVersion": ONTOLOGY_VERSION,
                    "knowledgeControlled": True,
                } for item in ontology_reasoning.get("strengthReview", [])]
            if ontology_reasoning and ontology_reasoning.get("fault"):
                fault = ontology_reasoning["fault"]
                insight = ontology_reasoning["insight"]
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
                    "policyId": control_policy["recommendations"]["policy_id"],
                    "policyVersion": control_policy["version"],
                    "ontologyVersion": ONTOLOGY_VERSION,
                    "knowledgeControlled": True,
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
                        "policyId": control_policy["recommendations"]["policy_id"],
                        "policyVersion": control_policy["version"],
                        "knowledgeControlled": True,
                    })
                    if len(ontology_drills) == int(control_policy["recommendations"]["maximum_drills"]):
                        break
                if ontology_drills:
                    drills = ontology_drills
                coach_summary.update({
                    "headline": insight["thesis"],
                    "strongestQuality": strengths[0]["title"] if strengths else "The recording passed the measurement reliability gates.",
                    "mainPriority": fault["title"],
                    "whyItMatters": insight["playerCoaching"]["why"],
                    "practiceFocus": [insight["playerCoaching"]["change"], insight["playerCoaching"]["feel"], insight["playerCoaching"]["success"]],
                    "ontologyFaultId": fault["fault_id"],
                    "ontologyFaultStatus": ontology_reasoning["status"],
                    "nextGenerationStory": insight,
                    "ontologyReasoning": {key: value for key, value in ontology_reasoning.items() if key not in {"insight", "fault", "drill"}},
                })
                performance_story.update({
                    "identity": insight["thesis"],
                    "rootCauseHypothesis": insight["thesis"],
                    "transferRisk": insight["playerCoaching"]["why"],
                    "nextMilestone": insight["playerCoaching"]["success"],
                    "coachPrinciple": f"One active cue: {insight['playerCoaching']['feel']}",
                })
                coaching_playbook = build_coaching_playbook(
                    analysis_action, coach_summary, priorities, drills, payload.primary_goal,
                )
                next_session = {
                    "objective": fault["title"],
                    "recordingPlan": (
                        f"Record 8–12 comparable {analysis_action.replace('_', ' ')} repetitions with the same camera view, "
                        "shot situation, intention, and practice constraint."
                    ),
                    "successCriteria": [insight["playerCoaching"]["success"]],
                    "sessionPlan": [],
                }
                visual_moments = [{
                    "id": "ontology-fix-first",
                    "kind": "priority",
                    "label": "Focus first",
                    "title": fault["title"],
                    "explanation": insight["playerCoaching"]["coachRead"],
                    "cue": insight["playerCoaching"]["feel"],
                    "frameIndex": priorities[0].get("frameIndex"),
                    "timestampSeconds": priorities[0].get("timestampSeconds"),
                    "faultId": fault["fault_id"],
                    "policyId": control_policy["domains"]["insights"]["policy_ids"][0],
                    "policyVersion": control_policy["version"],
                    "ontologyVersion": ONTOLOGY_VERSION,
                    "knowledgeControlled": True,
                }]
                # Ontology grounding may replace the generic priority and drills.
                # Rebuild the plan so all three sessions retain the one selected cue.
                practice_plan = build_practice_plan(analysis_action, priorities, drills)
            elif ontology_reasoning:
                no_fault_copy = control_policy["recommendations"]["no_supported_fault"]
                priorities = []
                drills = []
                strengths = [{
                    "title": item["label"],
                    "evidence": item["summary"],
                    "confidence": min(
                        [float(record.get("confidence") or confidence) for record in item.get("evidence", [])]
                        or [confidence]
                    ),
                    "policyId": control_policy["domains"]["insights"]["policy_ids"][0],
                    "policyVersion": control_policy["version"],
                    "ontologyVersion": ONTOLOGY_VERSION,
                    "knowledgeControlled": True,
                } for item in ontology_reasoning.get("strengthReview", [])]
                coach_summary.update({
                    "headline": no_fault_copy["headline"],
                    "strongestQuality": strengths[0]["title"] if strengths else "The recording passed the measurement reliability gates.",
                    "mainPriority": no_fault_copy["main_priority"],
                    "whyItMatters": no_fault_copy["why_it_matters"],
                    "practiceFocus": list(no_fault_copy["practice_focus"]),
                    "ontologyReasoning": ontology_reasoning,
                })
                next_session = {
                    "objective": no_fault_copy["main_priority"],
                    "recordingPlan": "Record 6–10 complete repetitions with the same camera view, shot situation, and intention.",
                    "successCriteria": ["A comparable recording passes the reliability gate and yields a supported evidence decision."],
                    "sessionPlan": [],
                }
                practice_plan = {
                    "title": "Clear recording plan",
                    "primaryGoal": no_fault_copy["main_priority"],
                    "cue": no_fault_copy["cue"],
                    "sessions": [],
                }
                performance_story.update({
                    "identity": no_fault_copy["headline"],
                    "rootCauseHypothesis": "No specific technical cause is supported by the current evidence.",
                    "transferRisk": "Choosing a correction without a supported fault could train the wrong change.",
                    "nextMilestone": "Record several clear swings in the same camera view.",
                    "coachPrinciple": "Do not prescribe beyond the evidence.",
                })
                coaching_playbook = build_coaching_playbook(
                    analysis_action, coach_summary, priorities, drills, payload.primary_goal,
                )
                visual_moments = []

            coach_summary["contextStatement"] = analysis_context["statement"]
            coach_summary["coachVerdict"] = (
                f"{coach_summary.get('mainPriority', 'make one clear change first')} "
                f"Keep {coach_summary.get('strongestQuality', 'the parts that already feel balanced and repeatable').rstrip('.').lower()}."
            )
            coach_summary["executiveBullets"] = _executive_bullets(
                coach_summary,
                strengths,
                priorities,
                coaching_playbook,
                analysis_context,
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
                "minimumRepetitionsForScore": minimum_repetitions_for_score,
                "canUseTechniqueScore": score_status == "provisional_criterion_index",
                "messages": [
                    *(biomechanics.capture_quality.get("limitations", []) if capture_blocked else []),
                    *(["This sport currently supports capture-quality review only; technique scoring is withheld."] if not sport_supported else []),
                    *(["Confirm the movement label to unlock sport-specific coaching."] if sport_supported and not movement_confirmed else []),
                    *(["Record at least one complete stroke from preparation through recovery."] if no_repetitions else []),
                    *(["Record at least two complete strokes before using the execution index."] if insufficient_repetitions and not no_repetitions else []),
                ],
            }

            insight_policy_id = control_policy["domains"]["insights"]["policy_ids"][0]
            recommendation_policy_id = control_policy["recommendations"]["policy_id"]
            for insight_payload in (coach_summary, performance_story):
                insight_payload.update({
                    "policyId": insight_policy_id,
                    "policyVersion": control_policy["version"],
                    "ontologyVersion": ONTOLOGY_VERSION,
                    "knowledgeControlled": True,
                })
            for recommendation_payload in (coaching_playbook, next_session, practice_plan):
                recommendation_payload.update({
                    "policyId": recommendation_policy_id,
                    "policyVersion": control_policy["version"],
                    "ontologyVersion": ONTOLOGY_VERSION,
                    "knowledgeControlled": True,
                })

            runtime = _runtime_manifest()
            runtime_signature = _runtime_signature(runtime)
            ontology_hash = ontology_manifest_hash()
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
                "ontologyManifestHash": ontology_hash,
                "knowledgeControlVersion": control_policy["version"],
                "knowledgeControlPolicyIds": sorted({
                    policy_id
                    for domain in control_policy["domains"].values()
                    for policy_id in domain["policy_ids"]
                }),
                "evidenceVersion": EVIDENCE_VERSION,
                "reportVersion": REPORT_VERSION,
                "ontologyReasonerVersion": ONTOLOGY_REASONER_VERSION,
                "analysisMode": "monocular_pose_review_governed_progress_analytics_beta",
                "runtime": runtime,
                "runtimeSignature": runtime_signature,
            }
            knowledge_control = compile_knowledge_control(
                policy=control_policy,
                ontology_version=ONTOLOGY_VERSION,
                manifest_hash=ontology_hash,
                score_status=score_status,
                phase_scores=phase_scores,
                metric_scores=metric_scores,
                capture_quality=biomechanics.capture_quality,
                coaching_areas=coaching_areas,
                repetition_insights=repetition_insights,
                ontology_reasoning=ontology_reasoning,
                strengths=strengths,
                priorities=priorities,
                drills=drills,
                visual_moments=visual_moments,
                coach_summary=coach_summary,
                performance_story=performance_story,
                coaching_playbook=coaching_playbook,
                next_session=next_session,
                practice_plan=practice_plan,
                reference_comparison=reference,
            )
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
                json.dumps(
                    [item.model_dump() for item in validated_outcome_labels],
                    sort_keys=True,
                    separators=(",", ":"),
                ),
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
                ontology_hash,
                str(control_policy["version"]),
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
            pose_timestamps = np.asarray([frame.timestamp_seconds for frame in pose_frames], dtype=np.float64)
            timestamp_deltas = np.diff(pose_timestamps)
            positive_timestamp_deltas = timestamp_deltas[timestamp_deltas > 1e-6]
            median_frame_interval = (
                float(np.median(positive_timestamp_deltas))
                if len(positive_timestamp_deltas) else 1.0 / max(metadata.fps, 1.0)
            )
            timestamp_variability = (
                float(np.std(positive_timestamp_deltas) / max(np.mean(positive_timestamp_deltas), 1e-6))
                if len(positive_timestamp_deltas) > 1 else 0.0
            )
            decoder_timestamp_count = sum(
                frame.timestamp_source == "decoder_presentation_timestamp" for frame in pose_frames
            )
            timestamp_source = (
                "decoder_presentation_timestamp"
                if decoder_timestamp_count == len(pose_frames)
                else "decoder_with_nominal_fallback"
            )
            decoded_width = pose_frames[0].source_width if pose_frames else metadata.width
            decoded_height = pose_frames[0].source_height if pose_frames else metadata.height
            presentation_duration = (
                float(pose_timestamps[-1] + median_frame_interval)
                if len(pose_timestamps) else metadata.duration_seconds
            )

            frame_summary = {
                "fps": metadata.fps,
                "frameCount": metadata.frame_count,
                "processedFrameCount": len(pose_frames),
                "displayedFrameCount": len(report_frames),
                "displayFrameStride": display_stride,
                "processedEveryFrame": True,
                "width": metadata.width,
                "height": metadata.height,
                "durationSeconds": round(presentation_duration, 6),
                "videoRegistration": {
                    "version": "acecoach-video-registration-v1.0.0",
                    "timestampSource": timestamp_source,
                    "decoderTimestampCoverage": round(decoder_timestamp_count / max(len(pose_frames), 1), 6),
                    "medianFrameIntervalSeconds": round(median_frame_interval, 6),
                    "presentationDurationSeconds": round(presentation_duration, 6),
                    "variableFrameRateDetected": timestamp_variability > 0.02,
                    "frameIntervalVariation": round(timestamp_variability, 6),
                    "encodedSize": {"width": metadata.width, "height": metadata.height},
                    "decodedDisplaySize": {"width": decoded_width, "height": decoded_height},
                    "rotationDegrees": metadata.rotation_degrees,
                    "rotationAppliedByDecoder": metadata.rotation_degrees != 0,
                    "mirrored": metadata.mirrored,
                    "cropNormalized": {"left": 0.0, "top": 0.0, "width": 1.0, "height": 1.0},
                    "poseInput": {
                        "width": decoded_width,
                        "height": decoded_height,
                        "resizeMode": "mediapipe_internal_full_frame",
                    },
                    "videoFit": "contain",
                    "landmarkSpace": "decoded_display_normalized",
                },
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
                "next_generation_story": ontology_reasoning.get("insight") if ontology_reasoning else None,
                "ontology_reasoning": ({key: value for key, value in ontology_reasoning.items() if key not in {"insight", "fault", "drill"}} if ontology_reasoning else None),
                "knowledge_control": knowledge_control,
            }
        finally:
            Path(metadata.path).unlink(missing_ok=True)
