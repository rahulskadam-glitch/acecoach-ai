from __future__ import annotations

from typing import Any, Sequence


def tactical_eligibility(
    insight_family: str,
    point_observations: Sequence[dict[str, Any]],
    available_capabilities: set[str],
    config: dict[str, Any],
) -> dict[str, Any]:
    family = next((item for item in config.get("insight_families", []) if item.get("id") == insight_family), None)
    if family is None:
        return {"eligible": False, "status": "withheld", "reason": "unknown_tactical_family", "missing_capabilities": []}
    required = set(config.get("required_base_capabilities", [])) | set(family.get("additional_capabilities", []))
    missing = sorted(required - available_capabilities)
    if missing:
        return {"eligible": False, "status": "withheld", "reason": "capability_gate_failed", "missing_capabilities": missing}
    complete_points = [item for item in point_observations if item.get("point_complete") is True and item.get("outcome") is not None]
    if len(complete_points) < int(family["minimum_points"]):
        return {
            "eligible": False,
            "status": "insufficient_sample",
            "reason": "minimum_complete_points_not_met",
            "complete_points": len(complete_points),
            "required_points": int(family["minimum_points"]),
            "missing_capabilities": [],
        }
    return {
        "eligible": True,
        "status": "eligible_for_pattern_analysis",
        "reason": "capability_and_sample_gates_passed",
        "complete_points": len(complete_points),
        "allowed_claim": family["allowed_claim"],
        "mechanical_inference_allowed": False,
        "missing_capabilities": [],
    }
