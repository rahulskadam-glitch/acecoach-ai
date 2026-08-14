from __future__ import annotations
import hashlib
from typing import Any, Dict, Iterable, List, Sequence

def insight_priority(candidate: Dict[str, Any], weights: Dict[str, float]) -> float:
    score = sum(float(weight) * float(candidate.get(key, 0.0)) for key, weight in weights.items())
    score -= float(candidate.get("overload_penalty", 0.0))
    score -= float(candidate.get("ambiguity_penalty", 0.0))
    if candidate.get("causal_role") == "SYMPTOM" and candidate.get("upstream_selected"):
        score -= 0.25
    return round(max(0.0, min(1.0, score)), 6)

def rank_insights(candidates: Sequence[Dict[str, Any]], weights: Dict[str, float]) -> List[Dict[str, Any]]:
    enriched=[]
    for c in candidates:
        x=dict(c); x["priority_score"] = insight_priority(x, weights); enriched.append(x)
    role_rank={"ROOT_CAUSE":0,"CONTRIBUTOR":1,"COMPENSATION":2,"SYMPTOM":3,"UNKNOWN":4}
    return sorted(enriched, key=lambda x: (-x["priority_score"], role_rank.get(x.get("causal_role","UNKNOWN"),4), x.get("root_event_index",999), x.get("insight_id","")))

def earliest_meaningful_divergence(metric_differences: Sequence[Dict[str, Any]], min_effect: float=.35, min_support: float=.60) -> Dict[str, Any] | None:
    valid=[x for x in metric_differences if abs(float(x.get("effect_size",0))) >= min_effect and float(x.get("support_rate",0)) >= min_support]
    if not valid: return None
    return sorted(valid, key=lambda x: (float(x.get("event_time_ms", 1e18)), -abs(float(x.get("effect_size",0))), x.get("metric_id","")))[0]

def compile_visual_story(insight: Dict[str, Any], compiler: Dict[str, Any]) -> Dict[str, Any]:
    archetype=insight.get("archetype","HIDDEN_CAUSE")
    mapping={
      "HIDDEN_CAUSE":"CAUSE_TO_EFFECT","COMPENSATION":"CAUSE_TO_EFFECT","TIMING_BOTTLENECK":"TIMING_TUNNEL",
      "SELF_BEST_BLUEPRINT":"SELF_BEST_MORPH","CONSISTENCY_LEAK":"SELF_BEST_MORPH",
      "CONDITIONAL_LEAK":"CONTEXT_SPLIT","TACTICAL_MECHANICAL_MISMATCH":"CONTEXT_SPLIT","STRENGTH_ANCHOR":"STRENGTH_LOCK",
      "PROGRESS_SHIFT":"TREND_ARC","REGRESSION_OR_PLATEAU":"TREND_ARC",
      "LIMITATION":"TRANSPARENT_LIMITATION"
      ,"SHARED_ROOT_CONSTRUCT":"SHARED_ROOT_MAP"
      ,"LOAD_PATTERN_FLAG":"LOAD_TREND_CAUTION"
    }
    if archetype not in mapping:
        raise ValueError(f"No visual story mapping for insight archetype: {archetype}")
    story_name=mapping[archetype]
    spec=compiler["story_archetypes"][story_name]
    beats=[]
    for i,b in enumerate(spec["beats"],1):
        beats.append({
          "beat_id": b.get("id",f"B{i}"), "time_window":{"anchor": insight.get("root_event") or "contact"},
          "playback_rate": 0.35 if i in (2,3,4) else 1.0, "overlays": b.get("overlays",[]),
          "caption": insight.get("visual_captions",{}).get(b.get("id",""), b.get("caption", b.get("action",""))),
          "action": b.get("action","")
        })
    return {"story_id": f"VIS-{insight.get('insight_id','UNKNOWN')}","archetype":story_name,"focus_insight_id":insight.get("insight_id"),"beats":beats}

def assert_traceable_claims(claims: Iterable[Dict[str, Any]]) -> None:
    for c in claims:
        if not c.get("evidence_ids"):
            raise ValueError(f"Untraceable claim: {c.get('claim_id') or c.get('text')}")
        if not c.get("comparison_basis") and c.get("kind") not in {"limitation","direct_observation"}:
            raise ValueError(f"Claim missing comparison basis: {c.get('claim_id') or c.get('text')}")


BLOCKED_PLAYER_TERMS = {
    "recurrence rate", "comparable strokes", "causal chain", "biomechanical inefficiency",
    "kinematic anomaly", "interpretation confidence", "pose confidence", "fault detected",
    "angular velocity", "thorax rotation"
}

def natural_language_issues(text: str, *, surface: str="PLAYER_COACH", max_words: int|None=None, blocked_terms: Sequence[str]|None=None) -> List[str]:
    """Lightweight deterministic guardrail; semantic quality still belongs to the language model + QA layer."""
    issues: List[str] = []
    low = (text or "").lower()
    if surface == "PLAYER_COACH":
        terms = set(BLOCKED_PLAYER_TERMS) | {str(x).lower() for x in (blocked_terms or [])}
        for term in sorted(terms):
            if term and term in low:
                issues.append(f"blocked_player_term:{term}")
        robotic = ["the analysis indicates that", "the model detected", "it is recommended that you", "a key area for improvement is"]
        for phrase in robotic:
            if phrase in low:
                issues.append(f"robotic_phrase:{phrase}")
    if max_words is not None and len((text or "").split()) > max_words:
        issues.append(f"too_long:{len(text.split())}>{max_words}")
    return issues

def assert_natural_player_message(message: Dict[str, Any], quality_config: Dict[str, Any]|None=None) -> None:
    config = quality_config or {}
    limits = config.get("surface_limits", {})
    blocked = config.get("blocked_player_terms", [])
    checks = {
        "coach_read": limits.get("coach_read_words", 55),
        "why": limits.get("why_words", 55),
        "feel": limits.get("feel_cue_words", 9),
        "watch": limits.get("watch_words", 16),
    }
    failures=[]
    for key, max_words in checks.items():
        if key in message and message[key]:
            failures.extend(f"{key}:{x}" for x in natural_language_issues(str(message[key]), max_words=max_words, blocked_terms=blocked))
    if not message.get("evidence_ids"):
        failures.append("missing_evidence_ids")
    if failures:
        raise ValueError("Player language quality gate failed: " + ", ".join(failures))

def assert_visual_caption_natural(caption: str, quality_config: Dict[str, Any]|None=None) -> None:
    config = quality_config or {}
    limits = config.get("surface_limits", {})
    issues = natural_language_issues(
        caption, max_words=limits.get("visual_caption_words", 8),
        blocked_terms=config.get("blocked_player_terms", [])
    )
    if issues:
        raise ValueError("Visual caption quality gate failed: " + ", ".join(issues))

def coach_confidence_register(confidence: float, camera_supported: bool=True) -> str:
    if not camera_supported or confidence < 0.55:
        return "LOW"
    if confidence < 0.80:
        return "MEDIUM"
    return "HIGH"

def stable_language_variant(insight_id: str, variants: Sequence[str]) -> str:
    if not variants:
        return ""
    digest = hashlib.sha256((insight_id or "UNKNOWN").encode("utf-8")).digest()
    return variants[int.from_bytes(digest[:4], "big") % len(variants)]
