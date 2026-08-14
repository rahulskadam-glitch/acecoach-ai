from __future__ import annotations

from functools import lru_cache
import hashlib
from pathlib import Path
from typing import Any

from ontology_runtime.acecoach_ontology.coaching_engine import compile_visual_story, earliest_meaningful_divergence, rank_insights
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
DOMAIN_GRAPH_NODE = {
    "Recognition": "recognition_and_time", "Preparation": "recognition_and_time",
    "Positioning": "movement_to_ball", "Spacing": "spacing", "Stability": "stance_and_balance",
    "Loading": "loading", "Sequencing": "pelvis_trunk_sequence", "Racket path": "racket_path_face",
    "Racket orientation": "racket_path_face", "Contact": "contact",
    "Extension/finish": "recovery", "Recovery": "recovery",
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


def _dosage(drill: dict[str, Any], canonical_level: str | None = None) -> str:
    dosage = drill.get("dosage", {})
    if not isinstance(dosage, dict):
        return str(dosage)
    sets = dosage.get("sets", 2)
    reps = dosage.get("repetitions_per_set", 8)
    if canonical_level:
        scale = drill.get("level_adjustments", {}).get(canonical_level, {}).get("dosage_scale", 1.0)
        reps = max(1, round(float(reps) * float(scale)))
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
            evaluations.append({"chapter": chapter, "areas": [], "area": None, "faults": [], "score": None})
            continue
        representative = min(matches, key=lambda item: float(item.get("score", 100)))
        evaluations.append({
            "chapter": chapter,
            "areas": matches,
            "area": representative,
            "faults": [fault for fault in faults if fault.get("domain") in chapter["domains"]],
            "score": round(sum(float(item.get("score", 100)) for item in matches) / len(matches)),
        })
    return evaluations


def _direction_supported(fault: dict[str, Any], deviations: set[str]) -> bool:
    """Use only explicit directional language; an unknown direction stays ambiguous."""
    text = f"{fault.get('title', '')} {fault.get('detection', '')}".lower()
    low_terms = ("insufficient", "limited", "too little", "narrow", "blocked", "stops", "delayed", "late", "collapses")
    high_terms = ("excessive", "too much", "too wide", "over-", "premature", "moves before", "leaning")
    wants_low = any(term in text for term in low_terms)
    wants_high = any(term in text for term in high_terms)
    return (wants_low and "low" in deviations) or (wants_high and "high" in deviations) or (not wants_low and not wants_high)


def _evaluate_fault_evidence(fault: dict[str, Any], areas: list[dict[str, Any]], camera_angle: str) -> dict[str, Any]:
    available = [
        {**record, "areaId": area.get("id"), "areaScore": area.get("score"), "confidence": area.get("confidence"), "measurementBasis": area.get("measurementBasis")}
        for area in areas for record in area.get("evidenceRecords", [])
        if isinstance(record, dict) and record.get("metricId")
    ]
    by_metric = {str(record["metricId"]): record for record in available}
    requirements = fault.get("observable_evidence", [])
    required_ids = {str(item["metric_id"]) for item in requirements if item.get("required")}
    expected_ids = {str(item["metric_id"]) for item in requirements}
    matched = [by_metric[metric_id] for metric_id in expected_ids if metric_id in by_metric]
    missing_required = sorted(required_ids - set(by_metric))
    camera_supported = camera_angle in fault.get("supported_views", [])
    deviations = {str(item.get("deviation")) for item in matched}
    direction_supported = _direction_supported(fault, deviations)
    reasons: list[str] = []
    if not camera_supported:
        reasons.append("camera_not_supported")
    if missing_required:
        reasons.append("required_evidence_missing")
    if not matched:
        reasons.append("no_compatible_measured_metric")
    if matched and not direction_supported:
        reasons.append("measured_direction_does_not_support_fault")
    eligible = not reasons
    return {
        "eligible": eligible,
        "cameraSupported": camera_supported,
        "matchedEvidence": matched,
        "missingRequiredMetricIds": missing_required,
        "expectedMetricIds": sorted(expected_ids),
        "reasons": reasons,
        "directionSupported": direction_supported,
    }


def _validated_self_best_contrast(repetitions: list[dict[str, Any]], metric_ids: set[str]) -> dict[str, Any] | None:
    """Compare only externally/validated outcome-labelled repetitions.

    Tracking clarity or a visually typical repetition is deliberately not treated
    as a successful tennis outcome.
    """
    success_labels = {"success", "in_target", "good_outcome"}
    weak_labels = {"weak", "out_of_target", "poor_outcome"}
    differences: list[dict[str, Any]] = []
    for metric_id in sorted(metric_ids):
        successful: list[float] = []
        weak: list[float] = []
        event_times: list[float] = []
        for repetition in repetitions:
            label = str(repetition.get("outcomeLabel", "")).lower()
            metrics = repetition.get("knowledgeMetrics", {})
            metric = metrics.get(metric_id) if isinstance(metrics, dict) else None
            if isinstance(metric, dict):
                value = metric.get("value")
                event_times.append(float(metric.get("eventTimeMs", 0.0)))
            else:
                value = metric
            if not isinstance(value, (int, float)):
                continue
            if label in success_labels:
                successful.append(float(value))
            elif label in weak_labels:
                weak.append(float(value))
        if len(successful) < 2 or len(weak) < 2:
            continue
        success_mean = sum(successful) / len(successful)
        weak_mean = sum(weak) / len(weak)
        combined = successful + weak
        mean = sum(combined) / len(combined)
        variance = sum((value - mean) ** 2 for value in combined) / max(1, len(combined) - 1)
        effect = (success_mean - weak_mean) / max(variance ** .5, 1e-6)
        direction = 1 if effect >= 0 else -1
        comparisons = [1 for good in successful for poor in weak if (good - poor) * direction > 0]
        support_rate = len(comparisons) / max(1, len(successful) * len(weak))
        differences.append({
            "metric_id": metric_id,
            "effect_size": effect,
            "support_rate": support_rate,
            "event_time_ms": min(event_times) if event_times else 0.0,
            "successful_repetitions": len(successful),
            "weak_repetitions": len(weak),
        })
    return earliest_meaningful_divergence(differences)


def _fault_candidates(
    action_type: str, camera_angle: str, areas: list[dict[str, Any]], confidence: float,
    repetitions: list[dict[str, Any]],
    level_profile: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    evaluations = _chapter_evaluations(action_type, areas)
    allowed_chapters = set(level_profile.get("default_chapter_ids", []))
    for evaluation in evaluations:
        area = evaluation["area"]
        if not area:
            continue
        if allowed_chapters and evaluation["chapter"]["id"] not in allowed_chapters:
            continue
        score = float(evaluation["score"])
        deficit = max(0.0, min(1.0, (82.0 - score) / 42.0))
        if deficit <= 0:
            continue
        eligible_in_chapter: list[dict[str, Any]] = []
        for fault in evaluation["faults"]:
            evidence_result = _evaluate_fault_evidence(fault, evaluation["areas"], camera_angle)
            if not evidence_result["eligible"]:
                rejected.append({"faultId": fault["fault_id"], "chapterId": evaluation["chapter"]["id"], **evidence_result})
                continue
            eligible_in_chapter.append({"fault": fault, "evidence_result": evidence_result})
        ambiguity = max(0, len(eligible_in_chapter) - 1)
        if ambiguity:
            for item in eligible_in_chapter:
                rejected.append({
                    "faultId": item["fault"]["fault_id"], "chapterId": evaluation["chapter"]["id"],
                    **item["evidence_result"],
                    "eligible": False,
                    "reasons": [*item["evidence_result"]["reasons"], "non_discriminative_evidence"],
                    "ambiguousWith": [other["fault"]["fault_id"] for other in eligible_in_chapter if other["fault"]["fault_id"] != item["fault"]["fault_id"]],
                })
            continue
        for item in eligible_in_chapter:
            fault = item["fault"]
            matched = item["evidence_result"]["matchedEvidence"]
            evidence_confidence = min([float(record.get("confidence") or confidence) for record in matched] or [confidence])
            expected_metric_ids = {str(record["metricId"]) for record in matched}
            divergence = _validated_self_best_contrast(repetitions, expected_metric_ids)
            support_rate = float(divergence.get("support_rate", 0.0)) if divergence else 0.0
            candidates.append({
                "fault": fault, "area": area, "chapter": evaluation["chapter"], "areas": evaluation["areas"], "chapter_score": score,
                "performance_impact": deficit,
                "recurrence": support_rate,
                "causal_leverage": min(1.0, .35 + support_rate * .45) if divergence else .35,
                "evidence_confidence": evidence_confidence,
                "coachability": .9 if fault.get("drill_ids") else .55,
                "self_best_contrast": min(1.0, abs(float(divergence.get("effect_size", 0.0))) / 2.0) if divergence else 0.0,
                "visual_explainability": .9 if fault.get("overlay_markers") else .4,
                "persistence": 0.0,
                "ambiguity_penalty": 0.0,
                "causal_role": "ROOT_CAUSE" if divergence and not ambiguity else "UNKNOWN",
                "root_event_index": DOMAIN_ORDER.get(fault["domain"], 8),
                "insight_id": f"ONTO-{fault['fault_id']}",
                "evidence_result": item["evidence_result"],
                "ambiguousWith": [],
                "selfBestDivergence": divergence,
            })
    weights = ontology().insight_reasoner["priority_formula"]["weights"]
    return rank_insights(candidates, weights), evaluations, rejected


def _canonical_level(playing_level: str | None, profiles: dict[str, Any]) -> str:
    raw = (playing_level or "developing").strip().lower().replace(" ", "_")
    aliases = profiles.get("aliases", {})
    canonical = aliases.get(raw, raw)
    return canonical if canonical in profiles["profiles"] else profiles.get("default_profile", "developing")


def _cross_stroke_policy(bundle: OntologyBundle) -> dict[str, Any]:
    contract = bundle.cross_stroke_constructs
    return {
        "minimumDistinctActions": contract["minimum_distinct_actions"],
        "minimumSessionsPerAction": contract["minimum_sessions_per_action"],
        "minimumConfidence": contract["minimum_confidence"],
        "maximumCaptureScoreDifference": contract["maximum_capture_score_difference"],
        "maximumLimiterMedianScore": contract["maximum_limiter_median_score"],
        "contextMatchFields": contract["context_match_fields"],
        "eligibleActionsByConstruct": {
            item["id"]: item["eligible_actions"] for item in contract["constructs"]
        },
    }


def _tested_causal_chain(selected: dict[str, Any], ranked: list[dict[str, Any]], bundle: OntologyBundle) -> list[dict[str, Any]]:
    divergence = selected.get("selfBestDivergence")
    if not divergence:
        return []
    source = DOMAIN_GRAPH_NODE.get(selected["fault"].get("domain"))
    observed_nodes = {DOMAIN_GRAPH_NODE.get(item["fault"].get("domain")) for item in ranked if item is not selected}
    edges = [edge for edge in bundle.causal_graph.get("edges", []) if edge.get("from") == source and edge.get("to") in observed_nodes]
    return [{
        "from": edge["from"], "to": edge["to"], "relationship": f"Configured {edge.get('strength', 'contextual')} hypothesis supported by measured findings at both nodes.",
        "confidence": min(float(selected["evidence_confidence"]), float(divergence["support_rate"])),
    } for edge in edges]


def ground_report_in_ontology(
    *, action_type: str, camera_angle: str, confidence: float,
    repetition_count: int, timeline: list[dict[str, Any]], areas: list[dict[str, Any]],
    strengths: list[dict[str, Any]], limitations: list[str], repetition_insights: dict[str, Any],
    repetitions: list[dict[str, Any]] | None = None,
    playing_level: str | None = None,
) -> dict[str, Any] | None:
    """Compile v4.1 coaching from measured legacy signals without inventing measurements."""
    bundle = ontology()
    canonical_level = _canonical_level(playing_level, bundle.level_analysis_profiles)
    level_profile = bundle.level_analysis_profiles["profiles"][canonical_level]
    ranked, evaluations, rejected = _fault_candidates(action_type, camera_angle, areas, confidence, repetitions or [], level_profile)
    if not ranked:
        return {
            "status": "NO_SUPPORTED_FAULT", "priorityScore": 0.0, "candidateCount": 0,
            "evaluatedFaultIds": [], "findings": [], "strengthReview": [],
            "movementChain": [{
                "id": evaluation["chapter"]["id"], "label": evaluation["chapter"]["label"],
                "status": "not_assessed", "score": evaluation["score"],
                "summary": "Available evidence cannot distinguish a specific knowledge-layer finding.", "faultId": None,
            } for evaluation in evaluations],
            "rejectedCandidates": rejected, "cameraSupport": camera_angle, "sourceIds": [],
            "ontologyVersion": bundle.manifest.get("version"),
            "levelAnalysis": {"canonicalLevel": canonical_level, "profileId": level_profile["profile_id"], "fallbackMode": level_profile["fallback_mode"]},
            "crossStrokePolicy": _cross_stroke_policy(bundle), "manifestHash": ontology_manifest_hash(),
            "policiesApplied": ["fault_evidence_evaluation", "confidence_policy", "level_analysis_profile", "claim_traceability"],
            "skippedPolicies": {
                "insight_reasoner": "No unambiguous evidence-compatible fault remained after gating.",
                "earliest_meaningful_divergence": "No eligible fault and validated outcome-labelled contrast were available.",
                "causal_graph": "No eligible findings were available at graph endpoints.",
                "visual_story_compiler": "No supported insight was available to visualize.",
                "drill_linkage": "No supported fault was available for drill selection.",
                "tactical_companion_ontology": "Validated ball tracking is unavailable.",
                "cohort_benchmark_registry": "No validated numeric cohort is registered.",
                "skill_transition_policy": "Automatic promotion remains disabled until validated level cohorts exist.",
            },
            "gatedCapabilities": [
                "Ball outcome and exact contact remain unavailable without validated ball tracking.",
                "Racket face, grip and exact racket path remain confirmation-only without racket tracking.",
                "No specific fault is selected when pose evidence cannot distinguish compatible alternatives.",
            ],
        }
    selected = ranked[0]
    fault = selected["fault"]
    area = selected["area"]
    camera = camera_angle if camera_angle in fault.get("supported_views", []) else "unsupported"
    minimum_reps = int(level_profile["cluster_thresholds"]["minimum_for_confirmed_habit"])
    confirmed = bundle.can_confirm_fault(
        fault_id=fault["fault_id"], comparable_strokes=repetition_count,
        measurement_confidence=float(area.get("confidence", confidence)),
        interpretation_confidence=confidence, camera_supported=camera != "unsupported",
        required_evidence_present=bool(area.get("measurementBasis")),
    )
    # The current pose pipeline produces aggregate evidence, not per-repetition
    # fault support. Keep habit confirmation closed until recurrence is measured.
    confirmed = confirmed and repetition_count >= minimum_reps and float(selected["recurrence"]) > 0
    status = "FAULT_CONFIRMED" if confirmed else "FAULT_SUSPECTED"
    drill = bundle.drills[fault["drill_ids"][0]] if fault.get("drill_ids") else None
    root_time = _timestamp(timeline, fault["phase_origin"], float(area.get("timestampSeconds") or 0))
    effect_time = _timestamp(timeline, fault["phase_visible_effect"], float(area.get("timestampSeconds") or root_time))
    matched_evidence = selected["evidence_result"]["matchedEvidence"]
    evidence_ids = [
        f"frame:{area.get('frameIndex', 'unknown')}",
        *[f"metric:{item['metricId']}:{item.get('measurementBasis', 'unknown')}" for item in matched_evidence],
    ]
    divergence = selected.get("selfBestDivergence")
    causal_chain = _tested_causal_chain(selected, ranked, bundle)
    comparison = ({
        "type": "validated_self_best",
        "scope": "outcome-labelled comparable repetitions in this clip",
        "earliestDivergence": divergence,
    } if divergence else {
        "type": "within_clip_observation",
        "scope": "aggregate pose evidence from this clip",
        "limitation": "Repetitions are compared for consistency only; no validated ball-outcome labels are available for a self-best causal contrast.",
    })
    story_seed = {
        "insight_id": selected["insight_id"], "archetype": "HIDDEN_CAUSE" if divergence else "LIMITATION",
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

    coach_read = (f"Your stronger and weaker repetitions first separate around {fault['title'].lower()}, making it the best-supported starting point." if divergence else f"In this clip, {fault['title'].lower()} is supported as a working priority. Its underlying cause is not yet confirmed.")
    keep = strengths[0].get("title") if strengths else None
    insight = {
        "insightId": selected["insight_id"], "role": "PRIMARY_CORRECTION", "archetype": "HIDDEN_CAUSE" if divergence else "LIMITATION",
        "thesis": coach_read, "rootEvent": fault["phase_origin"], "evidenceIds": evidence_ids,
        "comparisonBasis": comparison,
        "causalChain": causal_chain,
        "confidence": {"detection": confidence, "measurement": float(area.get("confidence", confidence)), "context": confidence if camera != "unsupported" else .35, "interpretation": confidence if confirmed else min(confidence, .74)},
        "falsificationConditions": [fault.get("counterfactual_test", {}).get("reject_root_cause_when", "The pattern does not recur in comparable strokes."), *limitations[:1]],
        "playerCoaching": {
            "coachRead": coach_read, "keep": keep, "change": fault["player_message"],
            "why": f"This pattern is consistent with {fault['performance_consequence']}, but the clip does not prove causation.", "feel": fault["coaching_ladder"]["cue"],
            "watch": f"Watch {fault['domain'].lower()} near {root_time:.2f}s, then its effect near {effect_time:.2f}s.",
            "train": f"{drill['name']}: {_dosage(drill, canonical_level)}" if drill else fault["coaching_ladder"]["constraint"],
            "success": drill.get("level_adjustments", {}).get(canonical_level, {}).get("success_condition", drill["success_condition"]) if drill else fault["coaching_ladder"]["success_test"],
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
        item_confirmed = False
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
            "evidenceEvaluation": candidate["evidence_result"],
            "ambiguousWith": candidate["ambiguousWith"],
            "evidence": [{
                "areaId": evidence_area.get("id"), "label": evidence_area.get("label"),
                "observation": evidence_area.get("observation"),
                "score": evidence_area.get("score"), "confidence": evidence_area.get("confidence"),
                "measurementBasis": evidence_area.get("measurementBasis"),
                "timestampSeconds": evidence_area.get("timestampSeconds"),
            } for evidence_area in candidate["areas"]],
            "drill": ({
                "id": item_drill["drill_id"], "name": item_drill["name"],
                "purpose": item_drill["purpose"], "dosage": _dosage(item_drill, canonical_level),
                "cue": item_drill["cue"],
                "success": item_drill.get("level_adjustments", {}).get(canonical_level, {}).get("success_condition", item_drill["success_condition"]),
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
        "rejectedCandidates": rejected,
        "cameraSupport": camera, "sourceIds": fault.get("source_ids", []),
        "ontologyVersion": bundle.manifest.get("version"),
        "levelAnalysis": {"canonicalLevel": canonical_level, "profileId": level_profile["profile_id"], "fallbackMode": level_profile["fallback_mode"]},
        "crossStrokePolicy": _cross_stroke_policy(bundle),
        "manifestHash": ontology_manifest_hash(),
        "policiesApplied": ["fault_evidence_evaluation", "confidence_policy", "level_analysis_profile", "insight_reasoner", "visual_story_compiler", "drill_linkage", "claim_traceability", *(["earliest_meaningful_divergence"] if divergence else []), *(["causal_graph"] if causal_chain else [])],
        "skippedPolicies": {
            **({} if divergence else {"earliest_meaningful_divergence": "Validated success and weak-repetition outcome labels are unavailable."}),
            **({} if causal_chain else {"causal_graph": "No configured graph edge has measured support at both endpoints."}),
            "camera_suitability_config": "Fault-specific supported views were applied; metric-level camera recipes are not yet emitted by the pose pipeline.",
            "player_feedback_policy": "Feedback is stored for evaluation but is not promoted into diagnostic evidence.",
            "tactical_companion_ontology": "Validated ball tracking is unavailable.",
            "cohort_benchmark_registry": "No validated numeric cohort is registered.",
            "skill_transition_policy": "Automatic promotion remains disabled until validated level cohorts exist.",
        },
        "gatedCapabilities": [
            "Ball outcome and exact contact remain unavailable without validated ball tracking.",
            "Racket face, grip and exact racket path remain confirmation-only without racket tracking.",
            "Cohort benchmarking remains unavailable until a matched validated cohort exists.",
            "Single-camera pose does not provide force, joint load or exact 3D reconstruction.",
        ],
    }
