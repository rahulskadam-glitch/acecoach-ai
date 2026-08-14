from __future__ import annotations

from dataclasses import dataclass
from statistics import median
from typing import Any, Sequence


@dataclass(frozen=True)
class SynchronizationResult:
    synchronized: bool
    offset_ms: float | None
    median_error_ms: float | None
    shared_event_count: int
    reason: str


def synchronize_event_timelines(
    primary_events_ms: Sequence[float],
    secondary_events_ms: Sequence[float],
    *,
    required_shared_events: int = 2,
    maximum_median_error_ms: float = 50.0,
    maximum_clock_drift_ms_per_second: float = 3.0,
) -> SynchronizationResult:
    shared_count = min(len(primary_events_ms), len(secondary_events_ms))
    if shared_count < required_shared_events:
        return SynchronizationResult(False, None, None, shared_count, "insufficient_shared_events")
    offsets = [float(primary_events_ms[index]) - float(secondary_events_ms[index]) for index in range(shared_count)]
    offset = median(offsets)
    residuals = [abs(value - offset) for value in offsets]
    error = median(residuals)
    if error > maximum_median_error_ms:
        return SynchronizationResult(False, offset, error, shared_count, "event_alignment_error_too_high")
    for index in range(1, shared_count):
        elapsed_seconds = abs(float(primary_events_ms[index]) - float(primary_events_ms[index - 1])) / 1000.0
        if elapsed_seconds <= 0:
            return SynchronizationResult(False, offset, error, shared_count, "non_monotonic_shared_events")
        drift_rate = abs(offsets[index] - offsets[index - 1]) / elapsed_seconds
        if drift_rate > maximum_clock_drift_ms_per_second:
            return SynchronizationResult(False, offset, error, shared_count, "clock_drift_too_high")
    return SynchronizationResult(True, offset, error, shared_count, "synchronized_by_shared_events")


def fused_metric_support(
    metric_id: str,
    primary_view: str,
    secondary_view: str,
    synchronization: SynchronizationResult,
    available_capabilities: set[str],
    fusion_config: dict[str, Any],
) -> dict[str, Any]:
    normalized_pair = {primary_view, secondary_view}
    supported_pairs = [set(pair) for pair in fusion_config.get("supported_pairs", [])]
    if normalized_pair not in supported_pairs:
        return {"supported": False, "quality": "single_view_only", "reason": "unsupported_view_pair"}
    if not synchronization.synchronized:
        return {"supported": False, "quality": "single_view_only", "reason": synchronization.reason}
    upgrade = fusion_config.get("metric_upgrades", {}).get(metric_id)
    if not upgrade:
        return {"supported": False, "quality": "single_view_only", "reason": "metric_has_no_fusion_contract"}
    missing = sorted(set(upgrade.get("requires", [])) - available_capabilities)
    if missing:
        return {"supported": False, "quality": upgrade.get("from", "conditional"), "reason": "missing_capabilities", "missing": missing}
    return {"supported": True, "quality": upgrade["to"], "reason": "fusion_contract_satisfied", "missing": []}
