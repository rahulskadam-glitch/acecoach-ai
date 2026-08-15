from __future__ import annotations

from datetime import date
from typing import Any, Iterable

from .loader import OntologyBundle


def cohort_release_decision(version: dict[str, Any], policy: dict[str, Any], *, today: date | None = None) -> dict[str, Any]:
    """Fail closed unless a cohort version satisfies every registered release condition."""
    today = today or date.today()
    reasons: list[str] = []
    required_dimensions = set(policy.get("required_dimensions", []))
    required_documentation = set(policy.get("required_documentation", []))
    dimensions = set(version.get("dimensions", []))
    documentation = {**version, **version.get("documentation", {})}

    if version.get("status") != policy.get("activation_status", "validated"):
        reasons.append("validation_status_not_approved")
    athlete_count_per_cell = version.get("athlete_count_per_cell", version.get("minimum_athletes_per_cell", 0))
    repetition_count_per_cell = version.get("repetition_count_per_cell", version.get("minimum_repetitions_per_cell", 0))
    if int(athlete_count_per_cell) < int(policy.get("minimum_athletes_per_cell", 30)):
        reasons.append("insufficient_athletes_per_cell")
    if int(repetition_count_per_cell) < int(policy.get("minimum_repetitions_per_cell", 300)):
        reasons.append("insufficient_repetitions_per_cell")
    if int(version.get("minimum_repetitions_per_athlete", 0)) < int(policy.get("minimum_repetitions_per_athlete", 8)):
        reasons.append("insufficient_repetitions_per_athlete")
    if not required_dimensions.issubset(dimensions):
        reasons.append("missing_required_context_dimensions")
    if not required_documentation.issubset({key for key, value in documentation.items() if value not in (None, "", [], {})}):
        reasons.append("incomplete_governance_documentation")
    review_expires_on = version.get("review_expires_on", version.get("review_expires_at"))
    if not review_expires_on:
        reasons.append("review_expiry_missing")
    else:
        try:
            if date.fromisoformat(str(review_expires_on)[:10]) < today:
                reasons.append("expired_review")
        except ValueError:
            reasons.append("invalid_review_expiry")
    if version.get("withdrawal_reason"):
        reasons.append("cohort_withdrawn")

    return {"eligible": not reasons, "reasons": reasons}


def capability_release_decision(capability: str, validation: dict[str, Any] | None, policy: dict[str, Any]) -> dict[str, Any]:
    requirements = policy.get("capabilities", {}).get(capability)
    if requirements is None:
        return {"eligible": False, "missing": ["unknown_capability"]}
    validation = validation or {}
    artifacts = set(validation.get("artifacts", []))
    missing = [requirement for requirement in requirements if requirement not in artifacts]
    if validation.get("status") != policy.get("activation_status", "validated"):
        missing.insert(0, "validation_status_not_approved")
    if validation.get("withdrawal_reason"):
        missing.append("validation_withdrawn")
    return {"eligible": not missing, "missing": list(dict.fromkeys(missing))}


def outcome_label_release_decision(label: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    """Permit outcome reasoning only for independently validated labels."""
    validated_sources = set(policy.get("validated_sources", []))
    valid_status_by_source = {
        "credentialed_coach": "coach_verified",
        "validated_sensor": "sensor_verified",
        "validated_ball_tracker": "tracker_verified",
    }
    reasons: list[str] = []
    source = label.get("outcome_source")
    if source not in validated_sources:
        reasons.append("outcome_source_not_validated")
    if valid_status_by_source.get(source) != label.get("validation_status"):
        reasons.append("validation_status_source_mismatch")
    if label.get("execution_result") not in {"success", "in_target", "weak", "out_of_target"}:
        reasons.append("outcome_class_not_comparable")
    return {"eligible": not reasons, "reasons": reasons}


def expert_annotation_release_decision(study: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    if study.get("status") != "validated":
        reasons.append("study_not_validated")
    if int(study.get("independent_verified_rater_count", 0)) < int(policy.get("minimum_independent_raters", 3)):
        reasons.append("insufficient_independent_verified_raters")
    if bool(study.get("blinded_to_engine_output")) is not bool(policy.get("blind_to_engine_output", True)):
        reasons.append("blinding_requirement_not_met")
    if not study.get("rubric_version"):
        reasons.append("rubric_version_missing")
    agreement = study.get("agreement_result")
    if not isinstance(agreement, (int, float)) or float(agreement) < float(policy.get("minimum_fleiss_kappa", 0.6)):
        reasons.append("agreement_below_threshold")
    if study.get("withdrawal_reason"):
        reasons.append("study_withdrawn")
    return {"eligible": not reasons, "reasons": reasons}


def intervention_release_decision(record: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    if len(record.get("baseline_session_ids", [])) < int(policy.get("minimum_baseline_sessions", 3)):
        reasons.append("insufficient_baseline_sessions")
    if len(record.get("post_session_ids", [])) < int(policy.get("minimum_post_sessions", 3)):
        reasons.append("insufficient_post_sessions")
    if len(record.get("retention_session_ids", [])) < int(policy.get("minimum_retention_checks", 2)):
        reasons.append("insufficient_retention_checks")
    if len(record.get("transfer_contexts", [])) < int(policy.get("minimum_transfer_contexts", 2)):
        reasons.append("insufficient_transfer_contexts")
    if policy.get("requires_stable_cue", True) and not record.get("cue_fingerprint"):
        reasons.append("stable_cue_not_documented")
    if policy.get("requires_context_matched_primary_outcome", True) and not record.get("primary_outcome_id"):
        reasons.append("context_matched_primary_outcome_missing")
    if record.get("status") not in {"improved", "unchanged", "regressed"}:
        reasons.append("validation_incomplete")
    return {
        "eligible": not reasons,
        "reasons": reasons,
        "causalClaimAllowed": False,
        "allowedClaim": policy.get("allowed_claim") if not reasons else None,
    }


def knowledge_layer_status(
    bundle: OntologyBundle,
    action_type: str,
    *,
    cohort_versions: Iterable[dict[str, Any]] = (),
    capability_validations: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Expose machine-readable readiness without converting source material into evidence."""
    source_coverage = bundle.stroke_source_registry["strokes"].get(action_type)
    validation = bundle.knowledge_validation_policy
    cohort_policy = validation["matched_cohort"]
    cohort_decisions = [cohort_release_decision(version, cohort_policy) for version in cohort_versions]
    capability_validations = capability_validations or {}
    equipment = validation["equipment_and_multiview"]
    capability_status = {
        capability: capability_release_decision(
            capability,
            capability_validations.get(capability),
            equipment,
        )
        for capability in equipment["capabilities"]
    }

    return {
        "version": validation["version"],
        "sourceCoverage": {
            "status": "covered" if source_coverage else "missing",
            "sourceIds": source_coverage.get("source_ids", []) if source_coverage else [],
            "qualitativeConstructs": source_coverage.get("qualitative_constructs", []) if source_coverage else [],
            "numericBenchmarkGranted": False,
        },
        "personalBaseline": {
            "status": "collection_ready",
            "minimumPriorContextMatchedSessions": validation["personal_baseline"]["minimum_prior_context_matched_sessions"],
            "minimumTotalRepetitions": validation["personal_baseline"]["minimum_total_repetitions"],
            "minimumMeasurementConfidence": validation["personal_baseline"]["minimum_measurement_confidence"],
            "maximumCaptureScoreDifference": validation["personal_baseline"]["maximum_capture_score_difference"],
            "exactMatchDimensions": validation["personal_baseline"]["exact_match_dimensions"],
        },
        "matchedCohort": {
            "status": "available" if any(item["eligible"] for item in cohort_decisions) else "dormant",
            "eligibleVersionCount": sum(item["eligible"] for item in cohort_decisions),
            "reason": None if any(item["eligible"] for item in cohort_decisions) else "No runtime cohort version passed every governance gate.",
        },
        "outcomeLabels": {"status": "collection_contract_ready", "causalClaimsAllowed": False},
        "expertAnnotation": {"status": "collection_contract_ready", "minimumIndependentRaters": validation["expert_annotation"]["minimum_independent_raters"]},
        "interventionValidation": {"status": "collection_contract_ready", "causalClaimsAllowed": False},
        "capabilities": capability_status,
    }
