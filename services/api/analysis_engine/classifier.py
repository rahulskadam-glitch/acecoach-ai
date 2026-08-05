from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from statistics import mean
from typing import Any

import numpy as np

from .frame_types import PoseFrame
from .temporal import RepetitionWindow

CLASSIFIER_VERSION = "tennis-kinematic-consensus-v0.5.0"


@dataclass(frozen=True)
class MovementClassification:
    detected_action: str
    confidence: float
    alternatives: list[dict[str, Any]]
    reasons: list[str]
    selected_action: str
    mismatch: bool
    requires_confirmation: bool
    calibration_status: str

    def as_dict(self) -> dict[str, Any]:
        labels = {
            "forehand": "Forehand",
            "backhand": "Backhand",
            "two_handed_backhand": "Two-handed backhand",
            "serve": "Serve",
            "forehand_volley": "Forehand volley",
            "backhand_volley": "Backhand volley",
            "overhead": "Overhead",
            "unknown": "Unknown movement",
        }
        return {
            "detectedAction": self.detected_action,
            "detectedLabel": labels.get(self.detected_action, self.detected_action.replace("_", " ").title()),
            "confidence": self.confidence,
            "alternatives": self.alternatives,
            "reasons": self.reasons,
            "selectedAction": self.selected_action,
            "selectedLabel": labels.get(self.selected_action, self.selected_action.replace("_", " ").title()),
            "mismatch": self.mismatch,
            "requiresConfirmation": self.requires_confirmation,
            "classifierVersion": CLASSIFIER_VERSION,
            "calibrationStatus": self.calibration_status,
        }


def _xy(frame: PoseFrame, name: str) -> np.ndarray | None:
    item = frame.landmarks.get(name)
    if not item or float(item.get("visibility", 0.0)) < 0.42:
        return None
    return np.array([float(item["x"]), float(item["y"])], dtype=np.float64)


def _torso_width(frame: PoseFrame) -> float | None:
    left = _xy(frame, "left_shoulder")
    right = _xy(frame, "right_shoulder")
    if left is None or right is None:
        return None
    width = float(np.linalg.norm(left - right))
    return width if width > 1e-6 else None


def _window_features(frames: list[PoseFrame], window: RepetitionWindow, side: str) -> dict[str, float]:
    other = "right" if side == "left" else "left"
    segment = frames[window.start_frame:window.end_frame + 1]
    if not segment:
        return {}

    overhead_flags: list[float] = []
    hand_distance: list[float] = []
    wrist_relative: list[float] = []
    dominant_wrist_y: list[float] = []
    wrist_speed: list[float] = []
    non_dominant_speed: list[float] = []
    previous_dominant: np.ndarray | None = None
    previous_other: np.ndarray | None = None

    for frame in segment:
        dominant_wrist = _xy(frame, f"{side}_wrist")
        opposite_wrist = _xy(frame, f"{other}_wrist")
        shoulder = _xy(frame, f"{side}_shoulder")
        hip = _xy(frame, f"{side}_hip")
        width = _torso_width(frame)

        if dominant_wrist is not None and shoulder is not None:
            overhead_flags.append(1.0 if dominant_wrist[1] < shoulder[1] - 0.04 else 0.0)
            dominant_wrist_y.append(float(dominant_wrist[1]))
        if dominant_wrist is not None and opposite_wrist is not None and width:
            hand_distance.append(float(np.linalg.norm(dominant_wrist - opposite_wrist) / width))
        if dominant_wrist is not None and shoulder is not None and hip is not None and width:
            body_x = float((shoulder[0] + hip[0]) / 2.0)
            wrist_relative.append(float((dominant_wrist[0] - body_x) / width))
        if dominant_wrist is not None and previous_dominant is not None:
            wrist_speed.append(float(np.linalg.norm(dominant_wrist - previous_dominant)))
        if opposite_wrist is not None and previous_other is not None:
            non_dominant_speed.append(float(np.linalg.norm(opposite_wrist - previous_other)))
        previous_dominant = dominant_wrist
        previous_other = opposite_wrist

    peak_frame = frames[window.peak_frame]
    peak_dominant = _xy(peak_frame, f"{side}_wrist")
    peak_opposite = _xy(peak_frame, f"{other}_wrist")
    peak_shoulder = _xy(peak_frame, f"{side}_shoulder")
    peak_width = _torso_width(peak_frame)
    positive_extent = max(wrist_relative, default=0.0)
    negative_extent = abs(min(wrist_relative, default=0.0))
    crosses_midline = 1.0 if positive_extent > 0.35 and negative_extent > 0.35 else 0.0
    close_hands_at_peak = 0.0
    if peak_dominant is not None and peak_opposite is not None and peak_width:
        close_hands_at_peak = float(np.linalg.norm(peak_dominant - peak_opposite) / peak_width)
    peak_above_shoulder = 0.0
    if peak_dominant is not None and peak_shoulder is not None and peak_width:
        peak_above_shoulder = float((peak_shoulder[1] - peak_dominant[1]) / peak_width)

    dominant_peak = max(wrist_speed, default=0.0)
    opposite_peak = max(non_dominant_speed, default=0.0)
    return {
        "overhead_ratio": mean(overhead_flags) if overhead_flags else 0.0,
        "peak_above_shoulder": peak_above_shoulder,
        "close_hands_ratio": mean(1.0 if value < 0.9 else 0.0 for value in hand_distance) if hand_distance else 0.0,
        "close_hands_at_peak": close_hands_at_peak,
        "positive_extent": positive_extent,
        "negative_extent": negative_extent,
        "crosses_midline": crosses_midline,
        "lateral_range": positive_extent + negative_extent,
        "vertical_range": max(dominant_wrist_y, default=0.0) - min(dominant_wrist_y, default=0.0),
        "dominant_peak": dominant_peak,
        "bilateral_ratio": min(dominant_peak, opposite_peak) / max(dominant_peak, opposite_peak, 1e-9),
        "duration_frames": float(window.end_frame - window.start_frame + 1),
        "visibility": window.mean_visibility,
    }


def _score_features(features: dict[str, float], side: str) -> dict[str, float]:
    scores = {
        "serve": 0.04,
        "overhead": 0.03,
        "two_handed_backhand": 0.04,
        "backhand": 0.06,
        "forehand": 0.06,
        "forehand_volley": 0.02,
        "backhand_volley": 0.02,
    }
    overhead_strength = max(0.0, features["peak_above_shoulder"])
    scores["serve"] += min(0.64, features["overhead_ratio"] * 0.40 + overhead_strength * 0.20 + features["vertical_range"] * 0.30)
    scores["overhead"] += min(0.54, features["overhead_ratio"] * 0.34 + overhead_strength * 0.22 + features["lateral_range"] * 0.10)
    two_hand_signal = features["close_hands_ratio"] * 0.38 + max(0.0, 1.15 - features["close_hands_at_peak"]) * 0.18 + features["bilateral_ratio"] * 0.22
    scores["two_handed_backhand"] += min(0.62, two_hand_signal)
    if side == "right":
        backhand_extent, forehand_extent = features["negative_extent"], features["positive_extent"]
    else:
        backhand_extent, forehand_extent = features["positive_extent"], features["negative_extent"]
    scores["backhand"] += min(0.54, backhand_extent * 0.28 + features["crosses_midline"] * 0.16 + features["lateral_range"] * 0.08)
    scores["forehand"] += min(0.54, forehand_extent * 0.28 + (1.0 - features["crosses_midline"]) * 0.08 + features["lateral_range"] * 0.08)
    compactness = max(0.0, 1.35 - features["lateral_range"])
    short_window = 1.0 if features["duration_frames"] < 32 else 0.0
    scores["forehand_volley"] += min(0.34, scores["forehand"] * 0.34 + compactness * 0.08 + short_window * 0.10)
    scores["backhand_volley"] += min(0.34, scores["backhand"] * 0.34 + compactness * 0.08 + short_window * 0.10)
    return scores


def classify_movement(frames: list[PoseFrame], repetitions: list[RepetitionWindow], sport_id: str, selected_action: str, dominant_side: str = "right") -> MovementClassification:
    if sport_id != "tennis":
        return MovementClassification("unknown", 0.0, [], ["Automatic movement recognition is not yet calibrated for this sport."], selected_action, False, True, "unsupported_sport")
    if len(frames) < 8 or not repetitions:
        return MovementClassification("unknown", 0.18, [], ["No complete, high-confidence stroke window was detected in the clip."], selected_action, False, True, "insufficient_motion")

    side = "left" if dominant_side.lower().startswith("left") else "right"
    features = [_window_features(frames, repetition, side) for repetition in repetitions]
    features = [item for item in features if item]
    if not features:
        return MovementClassification("unknown", 0.18, [], ["Pose visibility was insufficient for movement recognition."], selected_action, False, True, "insufficient_pose")

    aggregate = {key: mean(float(item.get(key, 0.0)) for item in features) for key in features[0]}
    aggregate_scores = _score_features(aggregate, side)
    per_rep_scores = [_score_features(item, side) for item in features]
    per_rep_winners = [max(scores.items(), key=lambda item: (item[1], item[0]))[0] for scores in per_rep_scores]
    votes = Counter(per_rep_winners)
    consensus_action, consensus_votes = votes.most_common(1)[0]
    consensus_ratio = consensus_votes / len(per_rep_winners)

    # A modest consensus bonus rewards agreement across repetitions without allowing
    # repeated pose heuristics to masquerade as a trained classifier.
    scores = dict(aggregate_scores)
    scores[consensus_action] += min(0.10, consensus_ratio * 0.10)
    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    best_action, best_score = ranked[0]
    second_score = ranked[1][1]
    margin = max(0.0, best_score - second_score)
    confidence = round(min(0.82, max(0.24, 0.31 + margin * 0.66 + aggregate["visibility"] * 0.16 + consensus_ratio * 0.16)), 3)
    if best_score < 0.28 or margin < 0.035 or consensus_ratio < 0.50:
        best_action = "unknown"
        confidence = min(confidence, 0.44)

    mismatch = best_action != "unknown" and best_action != selected_action
    uncalibrated_family = best_action in {"serve", "overhead", "forehand_volley", "backhand_volley"}
    requires_confirmation = best_action == "unknown" or mismatch or confidence < 0.74 or uncalibrated_family
    reasons: list[str] = [
        f"{consensus_votes} of {len(per_rep_winners)} detected repetitions supported the leading movement family.",
        "The decision uses body-scaled wrist travel, hand proximity, overhead position, and bilateral movement across repetitions.",
    ]
    if best_action in {"serve", "overhead"}:
        reasons.append(f"The hitting wrist was above the hitting shoulder in approximately {aggregate['overhead_ratio'] * 100:.0f}% of the detected stroke window.")
    if best_action == "two_handed_backhand":
        reasons.append(f"The hands stayed close through approximately {aggregate['close_hands_ratio'] * 100:.0f}% of the detected stroke window.")
    if uncalibrated_family:
        reasons.append("Serve, overhead, and volley distinctions require confirmation until racket and ball timing are available.")
    else:
        reasons.append("This is a deterministic pose-consensus beta, not a trained racket-and-ball-aware action-recognition model.")

    alternatives = [{"action": action, "label": action.replace("_", " ").title(), "score": round(float(score), 3)} for action, score in ranked[:3] if action != best_action]
    return MovementClassification(best_action, confidence, alternatives, reasons, selected_action, mismatch, requires_confirmation, "pose_consensus_beta")
