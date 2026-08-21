from __future__ import annotations

from typing import Any


class KnowledgeControlError(RuntimeError):
    """Raised when an output bypasses the versioned knowledge control plane."""


def _domain(policy: dict[str, Any], domain: str, *, decision: str, authorized: bool = True) -> dict[str, Any]:
    definition = policy["domains"][domain]
    return {
        "authorized": authorized,
        "decision": decision,
        "policyIds": list(definition["policy_ids"]),
    }


def _scoring_is_controlled(records: list[dict[str, Any]], policy_id: str, policy_version: str) -> bool:
    return bool(records) and all(
        item.get("knowledgeControlled") is True
        and item.get("policyId") == policy_id
        and item.get("policyVersion") == policy_version
        for item in records
    )


def _record_is_controlled(record: dict[str, Any], policy_id: str, policy_version: str) -> bool:
    return (
        record.get("knowledgeControlled") is True
        and record.get("policyId") == policy_id
        and record.get("policyVersion") == policy_version
    )


def compile_knowledge_control(
    *,
    policy: dict[str, Any],
    ontology_version: str,
    manifest_hash: str,
    score_status: str,
    phase_scores: list[dict[str, Any]],
    metric_scores: list[dict[str, Any]],
    capture_quality: dict[str, Any],
    coaching_areas: list[dict[str, Any]],
    repetition_insights: dict[str, Any],
    ontology_reasoning: dict[str, Any] | None,
    strengths: list[dict[str, Any]],
    priorities: list[dict[str, Any]],
    drills: list[dict[str, Any]],
    visual_moments: list[dict[str, Any]],
    coach_summary: dict[str, Any],
    performance_story: dict[str, Any],
    coaching_playbook: dict[str, Any],
    next_session: dict[str, Any],
    practice_plan: dict[str, Any],
    reference_comparison: dict[str, Any],
) -> dict[str, Any]:
    """Validate all derived output domains and emit the persisted authorization trace.

    Measurement models may supply raw values. This gate is the only place that
    authorizes those values to become saved/player-facing coaching output.
    """
    if policy.get("fail_closed") is not True or policy.get("default_state") != "fail_closed":
        raise KnowledgeControlError("Knowledge control must be configured to fail closed.")

    policy_version = str(policy.get("version") or "")
    scoring_policy_id = str(policy["scoring"]["policy_id"])
    calculation_authorized = (
        _scoring_is_controlled(phase_scores, scoring_policy_id, policy_version)
        and _scoring_is_controlled(metric_scores, scoring_policy_id, policy_version)
        and _record_is_controlled(capture_quality, scoring_policy_id, policy_version)
        and (not coaching_areas or _scoring_is_controlled(coaching_areas, scoring_policy_id, policy_version))
        and _record_is_controlled(repetition_insights, scoring_policy_id, policy_version)
    )
    if not calculation_authorized:
        raise KnowledgeControlError("A score or metric bypassed the knowledge-owned scoring policy.")

    technical_output_expected = score_status == "provisional_criterion_index"
    reasoning_status = ontology_reasoning.get("status") if ontology_reasoning else None
    if technical_output_expected and reasoning_status not in {
        "FAULT_SUSPECTED", "FAULT_CONFIRMED", "NO_SUPPORTED_FAULT"
    }:
        raise KnowledgeControlError("A technique report requires an ontology evidence decision.")

    supported_fault_ids = {
        str(item.get("faultId"))
        for item in (ontology_reasoning or {}).get("findings", [])
        if item.get("faultId")
    }
    if reasoning_status == "NO_SUPPORTED_FAULT" and (priorities or drills):
        raise KnowledgeControlError("Technical recommendations are forbidden when no fault is supported.")
    if reasoning_status in {"FAULT_SUSPECTED", "FAULT_CONFIRMED"}:
        if not priorities or any(str(item.get("faultId")) not in supported_fault_ids for item in priorities):
            raise KnowledgeControlError("Every technical priority must reference a supported ontology finding.")
        recommendation_policy_id = str(policy["recommendations"]["policy_id"])
        if any(not _record_is_controlled(item, recommendation_policy_id, policy_version) for item in priorities):
            raise KnowledgeControlError("A technical priority bypassed the knowledge-owned recommendation policy.")
        for drill in drills:
            targets = {str(item) for item in drill.get("targetFaultIds", [])}
            if not drill.get("ontologyVersion") or not targets.intersection(supported_fault_ids):
                raise KnowledgeControlError("Every drill must reference a supported ontology fault and version.")
            if not _record_is_controlled(drill, recommendation_policy_id, policy_version):
                raise KnowledgeControlError("A drill bypassed the knowledge-owned recommendation policy.")
    elif priorities or drills:
        raise KnowledgeControlError("Technical recommendations are not authorized for this reliability state.")

    insight_policy_id = str(policy["domains"]["insights"]["policy_ids"][0])
    if any(not _record_is_controlled(item, insight_policy_id, policy_version) for item in strengths + visual_moments):
        raise KnowledgeControlError("A player-facing insight bypassed the ontology insight policy.")
    if any(not _record_is_controlled(item, insight_policy_id, policy_version) for item in (coach_summary, performance_story)):
        raise KnowledgeControlError("A report narrative bypassed the ontology insight policy.")
    recommendation_policy_id = str(policy["recommendations"]["policy_id"])
    if any(not _record_is_controlled(item, recommendation_policy_id, policy_version) for item in (
        coaching_playbook, next_session, practice_plan
    )):
        raise KnowledgeControlError("A practice output bypassed the knowledge-owned recommendation policy.")

    knowledge_status = (ontology_reasoning or {}).get("knowledgeLayerStatus", {})
    cohort = knowledge_status.get("matchedCohort", {}) if isinstance(knowledge_status, dict) else {}
    cohort_released = cohort.get("status") == "available" and int(cohort.get("eligibleVersionCount", 0)) > 0
    reference_status = str(reference_comparison.get("status") or "")
    benchmark_policy_id = str(policy["benchmarks"]["policy_id"])
    if not _record_is_controlled(reference_comparison, benchmark_policy_id, policy_version):
        raise KnowledgeControlError("The benchmark result bypassed the knowledge-owned release policy.")
    numeric_reference_claimed = bool(reference_comparison.get("percentile")) or reference_status in {
        "validated_matched_cohort", "released_personal_baseline"
    }
    if numeric_reference_claimed and not cohort_released and reference_status != "released_personal_baseline":
        raise KnowledgeControlError("An unreleased numeric benchmark reached the report.")

    domains = {
        "calculations": _domain(policy, "calculations", decision="authorized_versioned_scoring"),
        "insights": _domain(
            policy,
            "insights",
            decision=(f"ontology_{str(reasoning_status).lower()}" if reasoning_status else "withheld_by_reliability_policy"),
        ),
        "recommendations": _domain(
            policy,
            "recommendations",
            decision="ontology_fault_links" if priorities else "authorized_reliability_or_comparable_evidence_guidance",
        ),
        "benchmarks": _domain(
            policy,
            "benchmarks",
            decision="released_runtime_benchmark" if numeric_reference_claimed else "withheld_no_released_numeric_reference",
        ),
        "records": _domain(policy, "records", decision="authorized_with_control_trace"),
        "report": _domain(policy, "report", decision="render_authorized_engine_output_only"),
    }
    return {
        "status": "CONTROLLED",
        "failClosed": True,
        "policyVersion": policy_version,
        "ontologyVersion": ontology_version,
        "manifestHash": manifest_hash,
        "domains": domains,
        "legacyRecordPolicy": policy["records"]["legacy_mode"],
        "reportFallbacksAllowed": bool(policy["report"].get("allow_ui_inference", False)),
        "contracts": {
            "comparisons": {
                "maximumCaptureScoreDifference": policy["comparisons"]["maximum_capture_score_difference"],
                "improvedScoreDelta": policy["comparisons"]["improved_score_delta"],
                "unchangedLowerScoreDelta": policy["comparisons"]["unchanged_lower_score_delta"],
                "requireSameEngine": policy["comparisons"]["require_same_engine"],
                "requireSameRuntime": policy["comparisons"]["require_same_runtime"],
                "requireSameContext": policy["comparisons"]["require_same_context"],
                "requireSameKnowledgePolicy": policy["comparisons"]["require_same_knowledge_policy"],
                "requireSameManifestHash": policy["comparisons"]["require_same_manifest_hash"],
            },
            "longitudinal": {
                "distributionSpreadDivisor": policy["longitudinal"]["distribution_spread_divisor"],
                "minimumHistorySessions": policy["longitudinal"]["minimum_history_sessions"],
                "historyWindowSessions": policy["longitudinal"]["history_window_sessions"],
                "meaningfulShiftPoints": policy["longitudinal"]["meaningful_shift_points"],
                "minimumStatusConfidence": policy["longitudinal"]["minimum_status_confidence"],
                "sustainedStableSessionsForSolved": policy["longitudinal"]["sustained_stable_sessions_for_solved"],
                "retentionWindowSessions": policy["longitudinal"]["retention_window_sessions"],
            },
        },
    }
