from __future__ import annotations

from functools import lru_cache
import hashlib
from pathlib import Path
from typing import Any

from ontology_runtime.acecoach_ontology.coaching_engine import compile_visual_story, rank_insights
from ontology_runtime.acecoach_ontology.loader import OntologyBundle


ONTOLOGY_ROOT = Path(__file__).resolve().parents[1] / "ontology" / "v4.1.0"

ACTION_ALIASES = {"backhand_slice": "slice_backhand", "slice": "slice_backhand"}
MOVEMENT_CHAPTERS = [
    {"id": "setup", "label": "Setup & timing", "area_ids": ["backlift_preparation"], "domains": ["Preparation", "Recognition"], "fault_tokens": ["PREP", "RHYTHM", "REC"]},
    {"id": "movement_spacing", "label": "Footwork & spacing", "area_ids": ["footwork_base", "contact_spacing"], "domains": ["Positioning", "Spacing"], "fault_tokens": ["SPACE", "REC", "PREP"]},
    {"id": "weight_transfer", "label": "Weight transfer & leg drive", "area_ids": ["lower_body_loading", "lower_body_extension"], "domains": ["Loading", "Sequencing"], "fault_tokens": ["LOAD", "RISE", "LEG"]},
    {"id": "swing_connection", "label": "Body-to-racket connection", "area_ids": ["hand_swing_path"], "domains": ["Sequencing", "Racket path"], "fault_tokens": ["SEQ", "ARM", "PATH"]},
    {"id": "contact_stability", "label": "Head & contact stability", "area_ids": ["body_position"], "domains": ["Stability", "Contact"], "fault_tokens": ["HEAD", "TILT", "CON"]},
    {"id": "finish_recovery", "label": "Finish & recovery", "area_ids": ["ending_position"], "domains": ["Recovery", "Extension/finish", "Stability"], "fault_tokens": ["RECOV", "FIN", "LAND"]},
]
CHAPTER_LANGUAGE = {
    "setup": {
        "working": "Your preparation is organized early enough to give the forward swing time.",
        "developing": "The setup is not fully organized before the forward swing has to begin.",
        "why": "An earlier, calmer setup leaves more time for the feet and contact decision.",
    },
    "movement_spacing": {
        "working": "Your feet create a usable base and enough room for the hands.",
        "developing": "Your base and hitting distance change too much, so the hands do not get the same contact window each time.",
        "why": "Better arrival gives you space to swing freely instead of rescuing the ball late.",
    },
    "weight_transfer": {
        "working": "Your legs show a clear load-then-drive pattern into the stroke.",
        "developing": "The legs are not yet creating a clear load-then-drive pattern, so the upper body has to do more of the work.",
        "why": "Load first, then drive: that sequence helps energy travel from the ground through the trunk and into the swing.",
    },
    "swing_connection": {
        "working": "The body starts the motion and the hands follow as one connected swing.",
        "developing": "The swing arrives in pieces instead of flowing cleanly from the body into the hands.",
        "why": "A connected sequence creates easier speed and a more repeatable racket path.",
    },
    "contact_stability": {
        "working": "Your head and upper body give the hands a stable platform through contact.",
        "developing": "Your head and upper body move away before the strike window is finished.",
        "why": "Staying organized a fraction longer makes timing and direction easier to repeat.",
    },
    "finish_recovery": {
        "working": "You finish in balance and begin returning to ready without a pause.",
        "developing": "The finish does not yet leave you a quick, balanced route back to ready.",
        "why": "A complete finish should carry naturally into the first recovery step.",
    },
}
DOMAIN_ORDER = {
    "Recognition": 0, "Positioning": 1, "Spacing": 1, "Stability": 2,
    "Loading": 2, "Sequencing": 3, "Racket path": 4,
    "Racket orientation": 4, "Contact": 5, "Extension/finish": 6, "Recovery": 7,
}
PHASE_TO_TIMELINE = {
    "G0": "ready", "G1": "ready", "G2": "preparation", "G3": "preparation",
    "G4": "loading", "G5": "acceleration", "G6": "contact_proxy",
    "G7": "follow_through", "G8": "follow_through", "G9": "recovery",
    "S0": "ready", "S1": "preparation", "S2": "preparation", "S3": "loading",
    "S4": "loading", "S5": "loading", "S6": "acceleration", "S7": "contact_proxy",
    "S8": "follow_through", "S9": "recovery", "S10": "recovery",
    "V0": "ready", "V1": "ready", "V2": "preparation", "V3": "preparation",
    "V4": "loading", "V5": "contact_proxy", "V6": "follow_through", "V7": "recovery",
    "O0": "ready", "O1": "preparation", "O2": "preparation", "O3": "loading",
    "O4": "acceleration", "O5": "contact_proxy", "O6": "follow_through", "O7": "recovery",
}


@lru_cache(maxsize=1)
def ontology() -> OntologyBundle:
    return OntologyBundle.load(ONTOLOGY_ROOT)


def ontology_manifest_hash() -> str:
    return hashlib.sha256((ONTOLOGY_ROOT / "manifest.json").read_bytes()).hexdigest()


def _timestamp(timeline: list[dict[str, Any]], phase_code: str, fallback: float = 0.0) -> float:
    phase = PHASE_TO_TIMELINE.get(phase_code, "contact_proxy")
    item = next((row for row in timeline if row.get("phase") == phase), None)
    return float(item.get("timestampSeconds", fallback)) if item else fallback


def _dosage(drill: dict[str, Any]) -> str:
    dosage = drill.get("dosage", {})
    if not isinstance(dosage, dict):
        return str(dosage)
    sets = dosage.get("sets", 2)
    reps = dosage.get("repetitions_per_set", 8)
    rest = dosage.get("rest_seconds")
    return f"{sets} sets of {reps} repetitions" + (f" · {rest} seconds rest" if rest else "")


def _chapter_evaluations(action_type: str, areas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    bundle = ontology()
    action = ACTION_ALIASES.get(action_type, action_type)
    prefix = bundle.strokes.get(action, {}).get("code", "") + "-"
    faults = [fault for fault in bundle.faults.values() if fault["fault_id"].startswith(prefix)]
    by_id = {str(area.get("id")): area for area in areas}
    evaluations: list[dict[str, Any]] = []
    for chapter in MOVEMENT_CHAPTERS:
        matches = [by_id[area_id] for area_id in chapter["area_ids"] if area_id in by_id]
        if not matches:
            evaluations.append({"chapter": chapter, "areas": [], "area": None, "fault": None, "score": None})
            continue
        representative = min(matches, key=lambda item: float(item.get("score", 100)))
        compatible = [fault for fault in faults if fault.get("domain") in chapter["domains"]]
        compatible.sort(key=lambda fault: (
            min((index for index, token in enumerate(chapter["fault_tokens"]) if f"-{token}" in fault["fault_id"]), default=99),
            fault["fault_id"],
        ))
        evaluations.append({
            "chapter": chapter,
            "areas": matches,
            "area": representative,
            "fault": compatible[0] if compatible else None,
            "score": round(sum(float(item.get("score", 100)) for item in matches) / len(matches)),
        })
    return evaluations


def _fault_candidates(action_type: str, areas: list[dict[str, Any]], confidence: float) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    evaluations = _chapter_evaluations(action_type, areas)
    for evaluation in evaluations:
        fault = evaluation["fault"]
        area = evaluation["area"]
        if not fault or not area:
            continue
        score = float(evaluation["score"])
        deficit = max(0.0, min(1.0, (82.0 - score) / 42.0))
        if deficit <= 0:
            continue
        candidates.append({
            "fault": fault, "area": area, "chapter": evaluation["chapter"], "areas": evaluation["areas"], "chapter_score": score,
            "performance_impact": deficit,
            "recurrence": deficit,
            "causal_leverage": max(.35, 1.0 - DOMAIN_ORDER.get(fault["domain"], 8) / 10.0),
            "evidence_confidence": confidence,
            "coachability": .9 if fault.get("drill_ids") else .55,
            "self_best_contrast": .35,
            "visual_explainability": .9 if fault.get("overlay_markers") else .4,
            "persistence": deficit,
            "causal_role": "ROOT_CAUSE" if DOMAIN_ORDER.get(fault["domain"], 8) <= 3 else "CONTRIBUTOR",
            "root_event_index": DOMAIN_ORDER.get(fault["domain"], 8),
            "insight_id": f"ONTO-{fault['fault_id']}",
        })
    return rank_insights(candidates), evaluations


def ground_report_in_ontology(
    *, action_type: str, camera_angle: str, confidence: float,
    repetition_count: int, timeline: list[dict[str, Any]], areas: list[dict[str, Any]],
    strengths: list[dict[str, Any]], limitations: list[str], repetition_insights: dict[str, Any],
) -> dict[str, Any] | None:
    """Compile v4.1 coaching from measured legacy signals without inventing measurements."""
    bundle = ontology()
    ranked, evaluations = _fault_candidates(action_type, areas, confidence)
    if not ranked:
        return None
    selected = ranked[0]
    fault = selected["fault"]
    area = selected["area"]
    camera = camera_angle if camera_angle in fault.get("supported_views", []) else "unsupported"
    confirmed = bundle.can_confirm_fault(
        fault_id=fault["fault_id"], comparable_strokes=repetition_count,
        measurement_confidence=float(area.get("confidence", confidence)),
        interpretation_confidence=confidence, camera_supported=camera != "unsupported",
        required_evidence_present=bool(area.get("measurementBasis")),
    )
    status = "FAULT_CONFIRMED" if confirmed else "FAULT_SUSPECTED"
    drill = bundle.drills[fault["drill_ids"][0]] if fault.get("drill_ids") else None
    root_time = _timestamp(timeline, fault["phase_origin"], float(area.get("timestampSeconds") or 0))
    effect_time = _timestamp(timeline, fault["phase_visible_effect"], float(area.get("timestampSeconds") or root_time))
    evidence_ids = [
        f"frame:{area.get('frameIndex', 'unknown')}",
        f"measurement:{area.get('measurementBasis', 'unknown')}",
        *[f"metric:{item['metric_id']}" for item in fault.get("observable_evidence", [])],
    ]
    comparison = (
        {"type": "self_best", "repetition": repetition_insights.get("clearestReferenceRepetition"), "scope": "current comparable clip"}
        if repetition_count >= 2 and repetition_insights.get("clearestReferenceRepetition") is not None
        else {"type": "single_clip", "scope": "this measured repetition", "limitation": "Habit language is withheld until at least three comparable strokes."}
    )
    story_seed = {
        "insight_id": selected["insight_id"], "archetype": "HIDDEN_CAUSE",
        "root_event": fault["phase_origin"],
        "visual_captions": {
            "B1_ORIENT": "Watch the whole stroke once.",
            "B2_CAUSE": f"The change starts at {fault['domain'].lower()}.",
            "B3_LINK": fault["player_message"],
            "B4_EFFECT": f"Here is the {fault['phase_visible_effect']} consequence.",
            "B5_CORRECTION": fault["coaching_ladder"]["cue"],
            "B6_CLEAN": "Now watch it with one cue.",
        },
    }
    visual = compile_visual_story(story_seed, bundle.visual_story_compiler)
    for index, beat in enumerate(visual["beats"]):
        beat["time_window"] = {"timestampSeconds": root_time if index < 3 or index == len(visual["beats"]) - 1 else effect_time}
        if beat.get("beat_id") not in {"B1_ORIENT", "B6_CLEAN"}:
            beat["overlays"] = list(dict.fromkeys([*beat.get("overlays", []), *fault.get("overlay_markers", [])]))

    coach_read = (
        f"The first useful change is {fault['title'].lower()}. It starts during {fault['domain'].lower()}, "
        f"before the later {fault['phase_visible_effect']} effect."
    )
    if status == "FAULT_SUSPECTED":
        coach_read = f"In this clip, {fault['title'].lower()} is the clearest working hypothesis—not yet a confirmed habit."
    keep = strengths[0].get("title") if strengths else None
    insight = {
        "insightId": selected["insight_id"], "role": "PRIMARY_CORRECTION", "archetype": "HIDDEN_CAUSE",
        "thesis": coach_read, "rootEvent": fault["phase_origin"], "evidenceIds": evidence_ids,
        "comparisonBasis": comparison,
        "causalChain": [{"from": fault["domain"], "to": fault["phase_visible_effect"], "relationship": fault["performance_consequence"], "confidence": confidence}],
        "confidence": {"detection": confidence, "measurement": float(area.get("confidence", confidence)), "context": confidence if camera != "unsupported" else .35, "interpretation": confidence if confirmed else min(confidence, .74)},
        "falsificationConditions": [fault.get("counterfactual_test", {}).get("reject_root_cause_when", "The pattern does not recur in comparable strokes."), *limitations[:1]],
        "playerCoaching": {
            "coachRead": coach_read, "keep": keep, "change": fault["player_message"],
            "why": fault["performance_consequence"], "feel": fault["coaching_ladder"]["cue"],
            "watch": f"Watch {fault['domain'].lower()} near {root_time:.2f}s, then its effect near {effect_time:.2f}s.",
            "train": f"{drill['name']}: {_dosage(drill)}" if drill else fault["coaching_ladder"]["constraint"],
            "success": drill["success_condition"] if drill else fault["coaching_ladder"]["success_test"],
            "languageProfileId": "PLAYER_COACH_v4.1", "surface": "PLAYER_COACH",
        },
        "visualStory": {
            "storyId": visual["story_id"], "archetype": visual["archetype"],
            "focusInsightId": visual["focus_insight_id"], "beats": [{
                "beatId": beat["beat_id"], "timeWindow": beat["time_window"],
                "playbackRate": beat.get("playback_rate"), "overlays": beat.get("overlays", []),
                "caption": beat.get("caption", ""), "accessibilityText": beat.get("action", ""),
            } for beat in visual["beats"]],
            "limitations": ["Overlays show measured pose evidence only; racket and ball claims remain gated by visibility."],
        },
    }
    findings: list[dict[str, Any]] = []
    for rank, candidate in enumerate(ranked, 1):
        item_fault = candidate["fault"]
        item_area = candidate["area"]
        chapter = candidate["chapter"]
        item_camera_supported = camera_angle in item_fault.get("supported_views", [])
        item_confirmed = bundle.can_confirm_fault(
            fault_id=item_fault["fault_id"], comparable_strokes=repetition_count,
            measurement_confidence=float(item_area.get("confidence", confidence)),
            interpretation_confidence=confidence, camera_supported=item_camera_supported,
            required_evidence_present=bool(item_area.get("measurementBasis")),
        )
        item_status = "FAULT_CONFIRMED" if item_confirmed else "FAULT_SUSPECTED"
        item_drill = bundle.drills[item_fault["drill_ids"][0]] if item_fault.get("drill_ids") else None
        chapter_copy = CHAPTER_LANGUAGE[chapter["id"]]
        findings.append({
            "id": candidate["insight_id"], "rank": rank,
            "role": "PRIMARY" if candidate is selected else "SECONDARY",
            "chapterId": chapter["id"], "label": chapter["label"],
            "faultId": item_fault["fault_id"], "ontologyTitle": item_fault["title"],
            "domain": item_fault["domain"], "status": item_status,
            "score": int(candidate["chapter_score"]),
            "priorityScore": candidate["priority_score"],
            "confidence": min(confidence, 1.0) if item_confirmed else min(confidence, .74),
            "summary": f"In this clip, {chapter_copy['developing'][0].lower() + chapter_copy['developing'][1:]}",
            "why": chapter_copy["why"],
            "correction": item_fault["player_message"],
            "cue": item_fault["coaching_ladder"]["cue"],
            "watch": f"Watch near {_timestamp(timeline, item_fault['phase_origin'], float(item_area.get('timestampSeconds') or 0)):.2f}s.",
            "phaseOrigin": item_fault["phase_origin"],
            "phaseVisibleEffect": item_fault["phase_visible_effect"],
            "overlayMarkers": item_fault.get("overlay_markers", []),
            "sourceIds": item_fault.get("source_ids", []),
            "evidence": [{
                "areaId": evidence_area.get("id"), "label": evidence_area.get("label"),
                "observation": evidence_area.get("observation"),
                "score": evidence_area.get("score"), "confidence": evidence_area.get("confidence"),
                "measurementBasis": evidence_area.get("measurementBasis"),
                "timestampSeconds": evidence_area.get("timestampSeconds"),
            } for evidence_area in candidate["areas"]],
            "drill": ({
                "id": item_drill["drill_id"], "name": item_drill["name"],
                "purpose": item_drill["purpose"], "dosage": _dosage(item_drill),
                "cue": item_drill["cue"], "success": item_drill["success_condition"],
                "setup": item_drill.get("setup"), "action": item_drill.get("action"),
                "stopCondition": item_drill.get("stop_condition"),
                "reassessment": item_drill.get("reassessment"),
                "targetFaultIds": item_drill.get("target_fault_ids", []),
            } if item_drill else None),
        })

    strength_review: list[dict[str, Any]] = []
    for evaluation in evaluations:
        if evaluation["score"] is None or float(evaluation["score"]) < 82:
            continue
        chapter = evaluation["chapter"]
        chapter_copy = CHAPTER_LANGUAGE[chapter["id"]]
        strength_review.append({
            "chapterId": chapter["id"], "label": chapter["label"],
            "score": int(evaluation["score"]), "summary": chapter_copy["working"],
            "evidence": [{
                "areaId": item.get("id"), "label": item.get("label"),
                "observation": item.get("observation"), "score": item.get("score"),
                "confidence": item.get("confidence"), "measurementBasis": item.get("measurementBasis"),
            } for item in evaluation["areas"]],
        })

    finding_by_chapter = {item["chapterId"]: item for item in findings}
    strength_by_chapter = {item["chapterId"]: item for item in strength_review}
    movement_chain = []
    for evaluation in evaluations:
        chapter = evaluation["chapter"]
        finding = finding_by_chapter.get(chapter["id"])
        strength_item = strength_by_chapter.get(chapter["id"])
        movement_chain.append({
            "id": chapter["id"], "label": chapter["label"],
            "status": "priority" if finding and finding["role"] == "PRIMARY" else "developing" if finding else "strength" if strength_item else "not_assessed",
            "score": evaluation["score"],
            "summary": finding["summary"] if finding else strength_item["summary"] if strength_item else "The current camera evidence cannot assess this part reliably.",
            "faultId": finding["faultId"] if finding else None,
        })
    return {
        "insight": insight, "fault": fault, "drill": drill, "status": status,
        "priorityScore": selected["priority_score"], "candidateCount": len(ranked),
        "evaluatedFaultIds": [item["fault"]["fault_id"] for item in ranked],
        "findings": findings, "strengthReview": strength_review, "movementChain": movement_chain,
        "cameraSupport": camera, "sourceIds": fault.get("source_ids", []),
        "ontologyVersion": bundle.manifest.get("version"),
        "manifestHash": ontology_manifest_hash(),
        "policiesApplied": [
            "confidence_policy", "camera_suitability", "diagnostic_engine", "causal_graph",
            "insight_reasoner", "player_feedback_policy", "coach_language_generation_protocol",
            "semantic_to_coach_language", "visual_story_compiler", "overlay_recipes",
            "drill_linkage", "claim_traceability",
        ],
        "gatedCapabilities": [
            "Ball outcome and exact contact remain unavailable without validated ball tracking.",
            "Racket face, grip and exact racket path remain confirmation-only without racket tracking.",
            "Cohort benchmarking remains unavailable until a matched validated cohort exists.",
            "Single-camera pose does not provide force, joint load or exact 3D reconstruction.",
        ],
    }
