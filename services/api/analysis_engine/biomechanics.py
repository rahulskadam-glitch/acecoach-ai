from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import mean, median, pstdev
from typing import Any, Iterable

import numpy as np

from .frame_types import PoseFrame
from .temporal import RepetitionWindow, coefficient_of_variation, detect_repetitions

BIOMECHANICS_VERSION = "camera-aware-kinematics-v1.1.0"
SCORING_VERSION = "knowledge-controlled-criterion-index-v2.0.0"

KEY_LANDMARKS = (
    "nose",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
    "left_heel", "right_heel",
    "left_foot_index", "right_foot_index",
)


@dataclass(frozen=True)
class BiomechanicsResult:
    frame_metrics: list[dict]
    aggregate_metrics: dict
    timeline: list[dict]
    pose_coverage: float
    repetitions: list[dict]
    primary_repetition_index: int | None
    capture_quality: dict


def _source_point(frame: PoseFrame, name: str, world: bool = True, threshold: float = 0.40) -> np.ndarray | None:
    source = frame.world_landmarks if world and frame.world_landmarks else frame.landmarks
    item = source.get(name)
    if not item or float(item.get("visibility", 0.0)) < threshold:
        return None
    values = [float(item["x"]), float(item["y"])]
    if world:
        values.append(float(item.get("z", 0.0)))
    return np.asarray(values, dtype=np.float64)


def _image_point(frame: PoseFrame, name: str, threshold: float = 0.40) -> np.ndarray | None:
    return _source_point(frame, name, world=False, threshold=threshold)


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denominator = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denominator <= 1e-12:
        return math.nan
    cosine = float(np.clip(np.dot(ba, bc) / denominator, -1.0, 1.0))
    return round(math.degrees(math.acos(cosine)), 4)


def _line_angle(a: np.ndarray, b: np.ndarray) -> float:
    delta = b - a
    return round(math.degrees(math.atan2(delta[1], delta[0])), 4)


def _angular_distance(current: float | None, previous: float | None) -> float:
    """Shortest signed angular distance, avoiding a false jump at +/-180 degrees."""
    if current is None or previous is None:
        return math.nan
    return (float(current) - float(previous) + 180.0) % 360.0 - 180.0


def _distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def _midpoint(a: np.ndarray | None, b: np.ndarray | None) -> np.ndarray | None:
    if a is None or b is None:
        return None
    return (a + b) / 2.0


def _safe_stats(values: Iterable[float]) -> dict[str, float | None]:
    valid = [float(value) for value in values if value is not None and not math.isnan(float(value))]
    if not valid:
        return {"min": None, "max": None, "mean": None, "median": None, "range": None, "variability": None}
    minimum = min(valid)
    maximum = max(valid)
    return {
        "min": round(minimum, 4),
        "max": round(maximum, 4),
        "mean": round(mean(valid), 4),
        "median": round(median(valid), 4),
        "range": round(maximum - minimum, 4),
        "variability": round(pstdev(valid), 4) if len(valid) > 1 else 0.0,
    }


def _serialize_key_landmarks(frame: PoseFrame) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = {}
    for name in KEY_LANDMARKS:
        item = frame.landmarks.get(name)
        if not item or float(item.get("visibility", 0.0)) < 0.35:
            continue
        result[name] = {
            "x": round(float(item["x"]), 5),
            "y": round(float(item["y"]), 5),
            "visibility": round(float(item["visibility"]), 4),
        }
    return result


def _shoulder_width(frame: PoseFrame) -> float | None:
    left = _image_point(frame, "left_shoulder")
    right = _image_point(frame, "right_shoulder")
    if left is None or right is None:
        return None
    width = _distance(left, right)
    return width if width > 1e-6 else None


def _body_scaled_distance(frame: PoseFrame, a: np.ndarray | None, b: np.ndarray | None) -> float | None:
    if a is None or b is None:
        return None
    scale = _shoulder_width(frame)
    if not scale:
        return None
    return _distance(a, b) / scale


def _phase_frames(window: RepetitionWindow) -> dict[str, int]:
    start = window.start_frame
    peak = window.peak_frame
    end = window.end_frame
    pre_span = max(1, peak - start)
    post_span = max(1, end - peak)
    return {
        "ready": start,
        "preparation": min(peak, start + round(pre_span * 0.34)),
        "loading": min(peak, start + round(pre_span * 0.70)),
        "acceleration": min(peak, start + round(pre_span * 0.84)),
        "contact_proxy": peak,
        "follow_through": min(end, peak + round(post_span * 0.44)),
        "recovery": end,
    }


def _phase_for_frame(frame_index: int, windows: list[RepetitionWindow]) -> tuple[int | None, str | None]:
    for window in windows:
        if not (window.start_frame <= frame_index <= window.end_frame):
            continue
        phases = _phase_frames(window)
        ordered = list(phases.items())
        phase_name = ordered[0][0]
        for name, index in ordered:
            if frame_index >= index:
                phase_name = name
            else:
                break
        return window.index, phase_name
    return None, None


def _capture_quality(frames: list[PoseFrame], fps: float, policy: dict[str, Any], policy_id: str, policy_version: str) -> dict:
    if not isinstance(policy, dict) or not policy:
        raise ValueError("A knowledge-controlled capture-quality policy is required.")
    if not frames:
        return {
            "score": 0,
            "grade": "unusable",
            "positives": [],
            "limitations": ["No frames were decoded."],
            "diagnostics": {},
            "policyId": policy_id,
            "policyVersion": policy_version,
            "knowledgeControlled": True,
        }

    score_scale = float(policy["score_scale"])
    core_coverage = mean(
        1.0 if frame.core_visibility >= float(policy["core_landmark_visibility_minimum"]) else 0.0
        for frame in frames
    )
    clipping_ratio = mean(1.0 if frame.edge_clipping else 0.0 for frame in frames)
    brightness = median(frame.brightness for frame in frames)
    contrast = median(frame.contrast for frame in frames)
    blur = median(frame.blur_score for frame in frames)
    boxes = [frame.body_box for frame in frames if frame.body_box]
    body_height = median(float(box["height"]) for box in boxes) if boxes else 0.0

    visibility_score = min(score_scale, core_coverage * score_scale)
    framing_score = max(0.0, score_scale - clipping_ratio * float(policy["framing_clipping_penalty"]))
    body_scale_score = max(0.0, min(score_scale, (body_height - float(policy["body_height_floor"])) / float(policy["body_height_span"]) * score_scale))
    brightness_score = max(0.0, score_scale - abs(brightness - float(policy["brightness_target"])) * float(policy["brightness_penalty"]))
    contrast_score = max(0.0, min(score_scale, contrast * float(policy["contrast_multiplier"])))
    blur_score = max(0.0, min(score_scale, math.log1p(max(0.0, blur)) / math.log(float(policy["blur_log_ceiling"])) * score_scale))

    weights = policy["weights"]
    score = round(
        visibility_score * float(weights["visibility"])
        + framing_score * float(weights["framing"])
        + body_scale_score * float(weights["body_scale"])
        + brightness_score * float(weights["brightness"])
        + contrast_score * float(weights["contrast"])
        + blur_score * float(weights["blur"])
    )
    grades = policy["grade_minimums"]
    grade = "excellent" if score >= float(grades["excellent"]) else "good" if score >= float(grades["good"]) else "usable" if score >= float(grades["usable"]) else "limited" if score >= float(grades["limited"]) else "unusable"

    positives: list[str] = []
    limitations: list[str] = []
    feedback = policy["feedback_thresholds"]
    if core_coverage >= float(feedback["core_coverage_good"]):
        positives.append("Core body landmarks were visible through most of the clip.")
    else:
        limitations.append(f"Core-body pose coverage was {core_coverage * score_scale:.0f}%; improve full-body visibility.")
    if clipping_ratio <= float(feedback["edge_clipping_good_maximum"]):
        positives.append("The athlete remained inside the frame for nearly the entire clip.")
    else:
        limitations.append(f"The body touched the image edge in {clipping_ratio * 100:.0f}% of frames.")
    if body_height >= float(feedback["body_height_good_minimum"]):
        positives.append("Athlete scale was large enough for useful body tracking.")
    else:
        limitations.append("The athlete appears small in frame; move the camera closer while keeping the full body visible.")
    if brightness < float(feedback["brightness_low"]):
        limitations.append("The clip is underexposed; increase lighting.")
    elif brightness > float(feedback["brightness_high"]):
        limitations.append("The clip is overexposed; reduce backlighting or glare.")
    if blur < float(feedback["blur_low"]):
        limitations.append("Motion blur is high; use brighter light or a higher shutter speed/frame rate.")
    if fps < float(feedback["fps_good_minimum"]):
        limitations.append(f"The clip was recorded at {fps:.0f} fps; a higher frame rate captures fast racket motion more crisply.")

    return {
        "score": int(max(0, min(100, score))),
        "grade": grade,
        "positives": positives,
        "limitations": limitations,
        "diagnostics": {
            "corePoseCoverage": round(core_coverage, 4),
            "edgeClippingRatio": round(clipping_ratio, 4),
            "medianBrightness": round(brightness, 4),
            "medianContrast": round(contrast, 4),
            "medianBlurScore": round(blur, 2),
            "medianBodyHeightRatio": round(body_height, 4),
            "sourceFps": round(fps, 2),
        },
        "policyId": policy_id,
        "policyVersion": policy_version,
        "knowledgeControlled": True,
    }


def compute_frame_metrics(
    frames: list[PoseFrame],
    fps: float,
    dominant_side: str = "right",
    *,
    control_policy: dict[str, Any],
) -> BiomechanicsResult:
    if not isinstance(control_policy, dict) or control_policy.get("fail_closed") is not True:
        raise ValueError("A fail-closed analysis control policy is required for measurement calculations.")
    scoring_policy = control_policy.get("scoring")
    if not isinstance(scoring_policy, dict) or not isinstance(scoring_policy.get("capture_quality"), dict):
        raise ValueError("The analysis control policy does not authorize capture-quality calculations.")
    side = "left" if dominant_side.lower().startswith("left") else "right"
    opposite = "right" if side == "left" else "left"
    motion_signal, repetition_windows = detect_repetitions(frames, fps, dominant_side)

    frame_metrics: list[dict] = []
    wrist_world_positions: list[np.ndarray | None] = []
    com_world_positions: list[np.ndarray | None] = []
    com_image_positions: list[np.ndarray | None] = []
    shoulder_widths: list[float | None] = []
    head_image_positions: list[np.ndarray | None] = []
    tracked_landmarks = (
        "left_wrist", "right_wrist", "left_elbow", "right_elbow",
        "left_shoulder", "right_shoulder", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle",
    )
    tracked_image_positions: dict[str, list[np.ndarray | None]] = {
        name: [] for name in tracked_landmarks
    }
    orientation_history: dict[str, list[float | None]] = {
        "shoulderLineDegrees": [],
        "pelvisLineDegrees": [],
        "trunkAngleDegrees": [],
        "dominantUpperArmDegrees": [],
        "dominantForearmDegrees": [],
    }

    for frame in frames:
        world_points = {
            f"{body_side}_{joint}": _source_point(frame, f"{body_side}_{joint}")
            for body_side in ("left", "right")
            for joint in ("shoulder", "elbow", "wrist", "hip", "knee", "ankle", "foot_index")
        }
        image_points = {name: _image_point(frame, name) for name in tracked_landmarks}
        for name, point in image_points.items():
            tracked_image_positions[name].append(point)

        shoulder = world_points[f"{side}_shoulder"]
        elbow = world_points[f"{side}_elbow"]
        wrist = world_points[f"{side}_wrist"]
        hip = world_points[f"{side}_hip"]
        knee = world_points[f"{side}_knee"]
        ankle = world_points[f"{side}_ankle"]
        foot_index = world_points[f"{side}_foot_index"]
        other_shoulder = world_points[f"{opposite}_shoulder"]
        other_elbow = world_points[f"{opposite}_elbow"]
        other_wrist = world_points[f"{opposite}_wrist"]
        other_hip = world_points[f"{opposite}_hip"]
        other_knee = world_points[f"{opposite}_knee"]
        other_ankle = world_points[f"{opposite}_ankle"]
        other_foot_index = world_points[f"{opposite}_foot_index"]

        image_shoulder = image_points[f"{side}_shoulder"]
        image_other_shoulder = image_points[f"{opposite}_shoulder"]
        image_hip = image_points[f"{side}_hip"]
        image_other_hip = image_points[f"{opposite}_hip"]
        image_wrist = image_points[f"{side}_wrist"]
        image_other_wrist = image_points[f"{opposite}_wrist"]
        image_elbow = image_points[f"{side}_elbow"]
        left_ankle = image_points["left_ankle"]
        right_ankle = image_points["right_ankle"]
        nose = _image_point(frame, "nose", threshold=0.30)

        shoulder_mid_world = _midpoint(shoulder, other_shoulder)
        hip_mid_world = _midpoint(hip, other_hip)
        com_world = None if shoulder_mid_world is None or hip_mid_world is None else shoulder_mid_world * 0.42 + hip_mid_world * 0.58
        wrist_world_positions.append(wrist)
        com_world_positions.append(com_world)
        head_image_positions.append(nose)

        shoulder_mid_image = _midpoint(image_shoulder, image_other_shoulder)
        hip_mid_image = _midpoint(image_hip, image_other_hip)
        com_image = None if shoulder_mid_image is None or hip_mid_image is None else shoulder_mid_image * 0.42 + hip_mid_image * 0.58
        com_image_positions.append(com_image)
        shoulder_widths.append(_shoulder_width(frame))

        def joint_angle(a: np.ndarray | None, b: np.ndarray | None, c: np.ndarray | None) -> float:
            return _angle(a, b, c) if a is not None and b is not None and c is not None else math.nan

        elbow_angle = joint_angle(shoulder, elbow, wrist)
        opposite_elbow_angle = joint_angle(other_shoulder, other_elbow, other_wrist)
        shoulder_angle = joint_angle(hip, shoulder, elbow)
        opposite_shoulder_angle = joint_angle(other_hip, other_shoulder, other_elbow)
        hip_angle = joint_angle(shoulder, hip, knee)
        opposite_hip_angle = joint_angle(other_shoulder, other_hip, other_knee)
        knee_angle = joint_angle(hip, knee, ankle)
        opposite_knee_angle = joint_angle(other_hip, other_knee, other_ankle)
        ankle_angle = joint_angle(knee, ankle, foot_index)
        opposite_ankle_angle = joint_angle(other_knee, other_ankle, other_foot_index)

        left_elbow_angle = joint_angle(world_points["left_shoulder"], world_points["left_elbow"], world_points["left_wrist"])
        right_elbow_angle = joint_angle(world_points["right_shoulder"], world_points["right_elbow"], world_points["right_wrist"])
        left_shoulder_angle = joint_angle(world_points["left_hip"], world_points["left_shoulder"], world_points["left_elbow"])
        right_shoulder_angle = joint_angle(world_points["right_hip"], world_points["right_shoulder"], world_points["right_elbow"])
        left_hip_angle = joint_angle(world_points["left_shoulder"], world_points["left_hip"], world_points["left_knee"])
        right_hip_angle = joint_angle(world_points["right_shoulder"], world_points["right_hip"], world_points["right_knee"])
        left_knee_angle = joint_angle(world_points["left_hip"], world_points["left_knee"], world_points["left_ankle"])
        right_knee_angle = joint_angle(world_points["right_hip"], world_points["right_knee"], world_points["right_ankle"])
        left_ankle_angle = joint_angle(world_points["left_knee"], world_points["left_ankle"], world_points["left_foot_index"])
        right_ankle_angle = joint_angle(world_points["right_knee"], world_points["right_ankle"], world_points["right_foot_index"])

        # Image-plane orientation proxies only. They are not true axial rotations.
        image_left_shoulder = image_points["left_shoulder"]
        image_right_shoulder = image_points["right_shoulder"]
        image_left_hip = image_points["left_hip"]
        image_right_hip = image_points["right_hip"]
        shoulder_line = _line_angle(image_left_shoulder, image_right_shoulder) if image_left_shoulder is not None and image_right_shoulder is not None else math.nan
        pelvis_line = _line_angle(image_left_hip, image_right_hip) if image_left_hip is not None and image_right_hip is not None else math.nan
        separation = abs(_angular_distance(shoulder_line, pelvis_line)) if not math.isnan(shoulder_line) and not math.isnan(pelvis_line) else math.nan

        base_width = _body_scaled_distance(frame, left_ankle, right_ankle)
        trunk_angle = _line_angle(hip_mid_image, shoulder_mid_image) if hip_mid_image is not None and shoulder_mid_image is not None else math.nan
        head_to_com = _body_scaled_distance(frame, nose, com_image)
        hand_to_torso = _body_scaled_distance(frame, image_wrist, shoulder_mid_image)
        opposite_hand_to_torso = _body_scaled_distance(frame, image_other_wrist, shoulder_mid_image)
        hand_separation = _body_scaled_distance(frame, image_wrist, image_other_wrist)
        scale = shoulder_widths[-1]

        def normalized_axis(point: np.ndarray | None, axis: int) -> float | None:
            if point is None or shoulder_mid_image is None or not scale:
                return None
            return float((point[axis] - shoulder_mid_image[axis]) / scale)

        dominant_wrist_x = normalized_axis(image_wrist, 0)
        dominant_wrist_y = normalized_axis(image_wrist, 1)
        opposite_wrist_x = normalized_axis(image_other_wrist, 0)
        opposite_wrist_y = normalized_axis(image_other_wrist, 1)
        com_x = normalized_axis(com_image, 0)
        com_y = normalized_axis(com_image, 1)
        upper_arm_line = _line_angle(image_shoulder, image_elbow) if image_shoulder is not None and image_elbow is not None else math.nan
        forearm_line = _line_angle(image_elbow, image_wrist) if image_elbow is not None and image_wrist is not None else math.nan

        orientation_history["shoulderLineDegrees"].append(None if math.isnan(shoulder_line) else shoulder_line)
        orientation_history["pelvisLineDegrees"].append(None if math.isnan(pelvis_line) else pelvis_line)
        orientation_history["trunkAngleDegrees"].append(None if math.isnan(trunk_angle) else trunk_angle)
        orientation_history["dominantUpperArmDegrees"].append(None if math.isnan(upper_arm_line) else upper_arm_line)
        orientation_history["dominantForearmDegrees"].append(None if math.isnan(forearm_line) else forearm_line)
        repetition_index, phase = _phase_for_frame(frame.frame_index, repetition_windows)

        frame_metrics.append({
            "frameIndex": frame.frame_index,
            "timestampSeconds": frame.timestamp_seconds,
            "visibility": frame.core_visibility,
            "elbowAngle": None if math.isnan(elbow_angle) else elbow_angle,
            "dominantElbowAngle": None if math.isnan(elbow_angle) else elbow_angle,
            "oppositeElbowAngle": None if math.isnan(opposite_elbow_angle) else opposite_elbow_angle,
            "leftElbowAngle": None if math.isnan(left_elbow_angle) else left_elbow_angle,
            "rightElbowAngle": None if math.isnan(right_elbow_angle) else right_elbow_angle,
            "shoulderAngle": None if math.isnan(shoulder_angle) else shoulder_angle,
            "dominantShoulderAngle": None if math.isnan(shoulder_angle) else shoulder_angle,
            "oppositeShoulderAngle": None if math.isnan(opposite_shoulder_angle) else opposite_shoulder_angle,
            "leftShoulderAngle": None if math.isnan(left_shoulder_angle) else left_shoulder_angle,
            "rightShoulderAngle": None if math.isnan(right_shoulder_angle) else right_shoulder_angle,
            "dominantHipAngle": None if math.isnan(hip_angle) else hip_angle,
            "oppositeHipAngle": None if math.isnan(opposite_hip_angle) else opposite_hip_angle,
            "leftHipAngle": None if math.isnan(left_hip_angle) else left_hip_angle,
            "rightHipAngle": None if math.isnan(right_hip_angle) else right_hip_angle,
            "dominantKneeAngle": None if math.isnan(knee_angle) else knee_angle,
            "oppositeKneeAngle": None if math.isnan(opposite_knee_angle) else opposite_knee_angle,
            "leftKneeAngle": None if math.isnan(left_knee_angle) else left_knee_angle,
            "rightKneeAngle": None if math.isnan(right_knee_angle) else right_knee_angle,
            "dominantAnkleAngle": None if math.isnan(ankle_angle) else ankle_angle,
            "oppositeAnkleAngle": None if math.isnan(opposite_ankle_angle) else opposite_ankle_angle,
            "leftAnkleAngle": None if math.isnan(left_ankle_angle) else left_ankle_angle,
            "rightAnkleAngle": None if math.isnan(right_ankle_angle) else right_ankle_angle,
            "kneeAngle": None if math.isnan(knee_angle) else knee_angle,
            "shoulderLineDegrees": None if math.isnan(shoulder_line) else shoulder_line,
            "pelvisLineDegrees": None if math.isnan(pelvis_line) else pelvis_line,
            "shoulderPelvisSeparation": None if math.isnan(separation) else separation,
            "baseWidthNormalized": None if base_width is None else round(base_width, 5),
            "trunkAngleDegrees": None if math.isnan(trunk_angle) else trunk_angle,
            "headToComNormalized": None if head_to_com is None else round(head_to_com, 5),
            "handToTorsoNormalized": None if hand_to_torso is None else round(hand_to_torso, 5),
            "dominantHandToTorsoNormalized": None if hand_to_torso is None else round(hand_to_torso, 5),
            "oppositeHandToTorsoNormalized": None if opposite_hand_to_torso is None else round(opposite_hand_to_torso, 5),
            "handSeparationNormalized": None if hand_separation is None else round(hand_separation, 5),
            "dominantWristXNormalized": None if dominant_wrist_x is None else round(dominant_wrist_x, 5),
            "dominantWristYNormalized": None if dominant_wrist_y is None else round(dominant_wrist_y, 5),
            "oppositeWristXNormalized": None if opposite_wrist_x is None else round(opposite_wrist_x, 5),
            "oppositeWristYNormalized": None if opposite_wrist_y is None else round(opposite_wrist_y, 5),
            "centerOfMassXNormalized": None if com_x is None else round(com_x, 5),
            "centerOfMassYNormalized": None if com_y is None else round(com_y, 5),
            "centerOfMass": None if com_image is None else {"x": round(float(com_image[0]), 5), "y": round(float(com_image[1]), 5)},
            "motionEnergy": round(float(motion_signal[frame.frame_index]), 6) if frame.frame_index < len(motion_signal) else 0.0,
            "repetitionIndex": repetition_index,
            "phase": phase,
            "keyLandmarks": _serialize_key_landmarks(frame),
        })

    wrist_speed_world: list[float] = [0.0]
    com_speed_world_shape: list[float] = [0.0]
    com_speed_image_scaled: list[float] = [0.0]
    tracked_speeds: dict[str, list[float | None]] = {
        name: [0.0 if positions and positions[0] is not None else None]
        for name, positions in tracked_image_positions.items()
    }
    angular_speeds: dict[str, list[float | None]] = {
        channel: [0.0 if values and values[0] is not None else None]
        for channel, values in orientation_history.items()
    }
    dominant_wrist_acceleration: list[float | None] = [
        0.0 if tracked_speeds[f"{side}_wrist"][0] is not None else None
    ]

    def rounded_or_none(value: float | None) -> float | None:
        return None if value is None or math.isnan(value) else round(float(value), 6)

    for index in range(1, len(frames)):
        delta_time = frames[index].timestamp_seconds - frames[index - 1].timestamp_seconds
        if delta_time <= 1e-6:
            delta_time = 1.0 / max(fps, 1.0)
        previous_wrist, current_wrist = wrist_world_positions[index - 1], wrist_world_positions[index]
        previous_com_world, current_com_world = com_world_positions[index - 1], com_world_positions[index]
        previous_com_image, current_com_image = com_image_positions[index - 1], com_image_positions[index]
        scale_values = [value for value in (shoulder_widths[index - 1], shoulder_widths[index]) if value and value > 1e-6]
        scale = float(np.mean(scale_values)) if scale_values else None

        for name, positions in tracked_image_positions.items():
            previous_point, current_point = positions[index - 1], positions[index]
            speed = (
                None
                if previous_point is None or current_point is None or scale is None
                else float(np.linalg.norm(current_point - previous_point) / scale / delta_time)
            )
            tracked_speeds[name].append(speed)

        for channel, values in orientation_history.items():
            delta = _angular_distance(values[index], values[index - 1])
            angular_speeds[channel].append(None if math.isnan(delta) else abs(delta) / delta_time)

        current_wrist_speed = tracked_speeds[f"{side}_wrist"][index]
        previous_wrist_speed = tracked_speeds[f"{side}_wrist"][index - 1]
        dominant_wrist_acceleration.append(
            None
            if current_wrist_speed is None or previous_wrist_speed is None
            else abs(current_wrist_speed - previous_wrist_speed) / delta_time
        )

        wrist_speed_world.append(0.0 if previous_wrist is None or current_wrist is None else float(np.linalg.norm(current_wrist - previous_wrist) / delta_time))
        com_speed_world_shape.append(
            0.0
            if previous_com_world is None or current_com_world is None
            else float(np.linalg.norm(current_com_world - previous_com_world) / delta_time)
        )
        com_speed_image_scaled.append(
            0.0
            if previous_com_image is None or current_com_image is None or scale is None
            else float(np.linalg.norm(current_com_image - previous_com_image) / scale / delta_time)
        )
        frame_metrics[index]["wristSpeedWorldPerSecond"] = round(wrist_speed_world[index], 6)
        frame_metrics[index]["wristSpeedNormalizedPerSecond"] = frame_metrics[index]["motionEnergy"]
        frame_metrics[index]["comShapeSpeedWorldPerSecond"] = round(com_speed_world_shape[index], 6)
        frame_metrics[index]["comSpeedImageBodyScaledPerSecond"] = round(com_speed_image_scaled[index], 6)
        frame_metrics[index]["comSpeedNormalizedPerSecond"] = round(com_speed_image_scaled[index], 6)

        dominant_prefix = f"{side}_"
        opposite_prefix = f"{opposite}_"
        speed_channels = {
            "dominantWristSpeedBodyPerSecond": tracked_speeds[f"{dominant_prefix}wrist"][index],
            "oppositeWristSpeedBodyPerSecond": tracked_speeds[f"{opposite_prefix}wrist"][index],
            "dominantElbowSpeedBodyPerSecond": tracked_speeds[f"{dominant_prefix}elbow"][index],
            "oppositeElbowSpeedBodyPerSecond": tracked_speeds[f"{opposite_prefix}elbow"][index],
            "dominantShoulderSpeedBodyPerSecond": tracked_speeds[f"{dominant_prefix}shoulder"][index],
            "oppositeShoulderSpeedBodyPerSecond": tracked_speeds[f"{opposite_prefix}shoulder"][index],
            "shoulderLineAngularSpeed": angular_speeds["shoulderLineDegrees"][index],
            "pelvisLineAngularSpeed": angular_speeds["pelvisLineDegrees"][index],
            "trunkAngularSpeed": angular_speeds["trunkAngleDegrees"][index],
            "dominantUpperArmAngularSpeed": angular_speeds["dominantUpperArmDegrees"][index],
            "dominantForearmAngularSpeed": angular_speeds["dominantForearmDegrees"][index],
            "dominantWristAccelerationBodyPerSecond2": dominant_wrist_acceleration[index],
        }
        lower_body_values = [
            tracked_speeds[f"{body_side}_{joint}"][index]
            for body_side in ("left", "right")
            for joint in ("hip", "knee", "ankle")
            if tracked_speeds[f"{body_side}_{joint}"][index] is not None
        ]
        knee_values = [tracked_speeds[f"{body_side}_knee"][index] for body_side in ("left", "right") if tracked_speeds[f"{body_side}_knee"][index] is not None]
        hip_values = [tracked_speeds[f"{body_side}_hip"][index] for body_side in ("left", "right") if tracked_speeds[f"{body_side}_hip"][index] is not None]
        speed_channels.update({
            "lowerBodySpeedBodyPerSecond": mean(lower_body_values) if lower_body_values else None,
            "kneeChainSpeedBodyPerSecond": mean(knee_values) if knee_values else None,
            "hipChainSpeedBodyPerSecond": mean(hip_values) if hip_values else None,
        })
        frame_metrics[index].update({key: rounded_or_none(value) for key, value in speed_channels.items()})
    if frame_metrics:
        frame_metrics[0]["wristSpeedWorldPerSecond"] = 0.0
        frame_metrics[0]["wristSpeedNormalizedPerSecond"] = frame_metrics[0]["motionEnergy"]
        frame_metrics[0]["comShapeSpeedWorldPerSecond"] = 0.0
        frame_metrics[0]["comSpeedImageBodyScaledPerSecond"] = 0.0
        frame_metrics[0]["comSpeedNormalizedPerSecond"] = 0.0
        first_lower_body = [tracked_speeds[f"{body_side}_{joint}"][0] for body_side in ("left", "right") for joint in ("hip", "knee", "ankle") if tracked_speeds[f"{body_side}_{joint}"][0] is not None]
        first_knees = [tracked_speeds[f"{body_side}_knee"][0] for body_side in ("left", "right") if tracked_speeds[f"{body_side}_knee"][0] is not None]
        first_hips = [tracked_speeds[f"{body_side}_hip"][0] for body_side in ("left", "right") if tracked_speeds[f"{body_side}_hip"][0] is not None]
        frame_metrics[0].update({
            "dominantWristSpeedBodyPerSecond": rounded_or_none(tracked_speeds[f"{side}_wrist"][0]),
            "oppositeWristSpeedBodyPerSecond": rounded_or_none(tracked_speeds[f"{opposite}_wrist"][0]),
            "dominantElbowSpeedBodyPerSecond": rounded_or_none(tracked_speeds[f"{side}_elbow"][0]),
            "oppositeElbowSpeedBodyPerSecond": rounded_or_none(tracked_speeds[f"{opposite}_elbow"][0]),
            "dominantShoulderSpeedBodyPerSecond": rounded_or_none(tracked_speeds[f"{side}_shoulder"][0]),
            "oppositeShoulderSpeedBodyPerSecond": rounded_or_none(tracked_speeds[f"{opposite}_shoulder"][0]),
            "shoulderLineAngularSpeed": rounded_or_none(angular_speeds["shoulderLineDegrees"][0]),
            "pelvisLineAngularSpeed": rounded_or_none(angular_speeds["pelvisLineDegrees"][0]),
            "trunkAngularSpeed": rounded_or_none(angular_speeds["trunkAngleDegrees"][0]),
            "dominantUpperArmAngularSpeed": rounded_or_none(angular_speeds["dominantUpperArmDegrees"][0]),
            "dominantForearmAngularSpeed": rounded_or_none(angular_speeds["dominantForearmDegrees"][0]),
            "dominantWristAccelerationBodyPerSecond2": rounded_or_none(dominant_wrist_acceleration[0]),
            "lowerBodySpeedBodyPerSecond": round(mean(first_lower_body), 6) if first_lower_body else None,
            "kneeChainSpeedBodyPerSecond": round(mean(first_knees), 6) if first_knees else None,
            "hipChainSpeedBodyPerSecond": round(mean(first_hips), 6) if first_hips else None,
        })

    capture_quality = _capture_quality(
        frames,
        fps,
        scoring_policy["capture_quality"],
        str(scoring_policy["policy_id"]),
        str(control_policy["version"]),
    )
    pose_coverage = round(float(capture_quality["diagnostics"].get("corePoseCoverage", 0.0)), 6)

    repetition_summaries: list[dict] = []
    for window in repetition_windows:
        phases = _phase_frames(window)
        phase_timeline = [
            {
                "phase": phase,
                "frameIndex": frame_index,
                "timestampSeconds": round(frames[frame_index].timestamp_seconds, 4),
            }
            for phase, frame_index in phases.items()
        ]
        segment = frame_metrics[window.start_frame:window.end_frame + 1]
        head_x = [
            float(item["keyLandmarks"]["nose"]["x"])
            for item in segment
            if item.get("keyLandmarks", {}).get("nose")
        ]
        head_y = [
            float(item["keyLandmarks"]["nose"]["y"])
            for item in segment
            if item.get("keyLandmarks", {}).get("nose")
        ]
        head_to_com = [
            float(item["headToComNormalized"])
            for item in segment
            if item.get("headToComNormalized") is not None
        ]
        rep_duration = max(0.0, frames[window.end_frame].timestamp_seconds - frames[window.start_frame].timestamp_seconds)
        repetition_summaries.append({
            **window.as_dict(fps, frames),
            "durationSeconds": round(rep_duration, 4),
            "headMovementRange": round(max(head_x) - min(head_x), 5) if head_x else None,
            "headVerticalRange": round(max(head_y) - min(head_y), 5) if head_y else None,
            "headToComRange": round(max(head_to_com) - min(head_to_com), 5) if head_to_com else None,
            "phaseTimeline": phase_timeline,
            "knowledgeMetrics": ({
                "head_displacement_body_ratio": {
                    "value": round(max(head_to_com) - min(head_to_com), 5),
                    "eventTimeMs": round((frames[window.peak_frame].timestamp_seconds - frames[window.start_frame].timestamp_seconds) * 1000.0, 2),
                    "measurementClass": "BODY_NORMALIZED_2D",
                },
            } if head_to_com else {}),
        })

    primary_index: int | None = None
    timeline: list[dict] = []
    if repetition_windows:
        quality_values = [window.peak_motion * (0.45 + window.mean_visibility * 0.55) for window in repetition_windows]
        primary_index = int(np.argmax(quality_values))
        primary = repetition_windows[primary_index]
        focus_copy = {
            "ready": "Athletic posture, visual readiness, and balanced base.",
            "preparation": "Early body turn and racket/hand preparation.",
            "loading": "Footwork, spacing, lower-body load, and torso organization.",
            "acceleration": "Sequenced forward swing and controlled speed production.",
            "contact_proxy": "Peak whole-chain motion proxy; verify spacing, posture, and balance.",
            "follow_through": "Swing path, deceleration, and finish direction.",
            "recovery": "Balanced finish and readiness for the next ball.",
        }
        timeline = [
            {
                "phase": phase,
                "frameIndex": frame_index,
                "timestampSeconds": round(frames[frame_index].timestamp_seconds, 4),
                "coachingFocus": focus_copy[phase],
                "repetitionIndex": primary.index,
            }
            for phase, frame_index in _phase_frames(primary).items()
        ]

    head_x = [position[0] for position in head_image_positions if position is not None]
    head_y = [position[1] for position in head_image_positions if position is not None]
    rep_durations = [float(item["durationSeconds"]) for item in repetition_summaries]
    rep_peaks = [float(item["peakMotion"]) for item in repetition_summaries]
    aggregate_metrics = {
        "elbowAngle": _safe_stats(item["elbowAngle"] for item in frame_metrics if item["elbowAngle"] is not None),
        "shoulderAngle": _safe_stats(item["shoulderAngle"] for item in frame_metrics if item["shoulderAngle"] is not None),
        "kneeAngle": _safe_stats(item["kneeAngle"] for item in frame_metrics if item["kneeAngle"] is not None),
        "oppositeKneeAngle": _safe_stats(item["oppositeKneeAngle"] for item in frame_metrics if item["oppositeKneeAngle"] is not None),
        "shoulderPelvisSeparation2dProxy": _safe_stats(item["shoulderPelvisSeparation"] for item in frame_metrics if item["shoulderPelvisSeparation"] is not None),
        "baseWidthBodyScaled": _safe_stats(item["baseWidthNormalized"] for item in frame_metrics if item["baseWidthNormalized"] is not None),
        "trunkAngleDegrees": _safe_stats(item["trunkAngleDegrees"] for item in frame_metrics if item["trunkAngleDegrees"] is not None),
        "headHorizontalImageRange": _safe_stats(head_x),
        "headVerticalImageRange": _safe_stats(head_y),
        "handToTorsoBodyScaled": _safe_stats(item["handToTorsoNormalized"] for item in frame_metrics if item["handToTorsoNormalized"] is not None),
        "motionEnergy": _safe_stats(item["motionEnergy"] for item in frame_metrics),
        "wristSpeedWorldPerSecond": _safe_stats(wrist_speed_world),
        "comShapeSpeedWorldPerSecond": _safe_stats(com_speed_world_shape),
        "comSpeedImageBodyScaledPerSecond": _safe_stats(com_speed_image_scaled),
        "poseCoverage": pose_coverage,
        "repetitionCount": len(repetition_summaries),
        "repetitionDurationCv": coefficient_of_variation(rep_durations),
        "repetitionPeakMotionCv": coefficient_of_variation(rep_peaks),
    }
    return BiomechanicsResult(
        frame_metrics=frame_metrics,
        aggregate_metrics=aggregate_metrics,
        timeline=timeline,
        pose_coverage=pose_coverage,
        repetitions=repetition_summaries,
        primary_repetition_index=primary_index,
        capture_quality=capture_quality,
    )


def clamp_score(value: float) -> int:
    return int(round(max(0.0, min(100.0, value))))


def _stat(result: BiomechanicsResult, key: str, field: str, default: float = 0.0) -> float:
    value = result.aggregate_metrics.get(key, {}).get(field)
    return float(value) if value is not None else default


def _frame(result: BiomechanicsResult, frame_index: int | None) -> dict | None:
    if frame_index is None or frame_index < 0 or frame_index >= len(result.frame_metrics):
        return None
    return result.frame_metrics[frame_index]


def _timeline_index(result: BiomechanicsResult, phase: str) -> int | None:
    item = next((entry for entry in result.timeline if entry.get("phase") == phase), None)
    return int(item["frameIndex"]) if item else None


def _timeline_timestamp(result: BiomechanicsResult, phase: str) -> float:
    item = next((entry for entry in result.timeline if entry.get("phase") == phase), None)
    return float(item.get("timestampSeconds", 0.0)) if item else 0.0


def _score_band(
    value: float,
    ideal_low: float,
    ideal_high: float,
    tolerance: float,
    band_policy: dict[str, Any],
) -> int:
    anchor = float(band_policy["anchor"])
    penalty_span = float(band_policy["penalty_span"])
    if ideal_low <= value <= ideal_high:
        return clamp_score(anchor)
    distance = ideal_low - value if value < ideal_low else value - ideal_high
    return clamp_score(anchor - distance / max(tolerance, 1e-6) * penalty_span)


def score_from_measurements(
    result: BiomechanicsResult,
    action_type: str,
    movement_confirmed: bool,
    sport_id: str = "tennis",
    *,
    control_policy: dict[str, Any],
) -> tuple[int | None, list[dict], list[dict], float, str]:
    if not isinstance(control_policy, dict) or control_policy.get("fail_closed") is not True:
        raise ValueError("A fail-closed analysis control policy is required for scoring.")
    scoring = control_policy.get("scoring")
    if not isinstance(scoring, dict) or not scoring.get("policy_id"):
        raise ValueError("The analysis control policy does not authorize scoring.")
    policy_id = str(scoring["policy_id"])
    policy_version = str(control_policy["version"])
    phases_policy = scoring["phases"]
    phase_by_id = {str(item["id"]): item for item in phases_policy}
    components = scoring["components"]
    band_policy = scoring["score_band"]
    capture_score = int(result.capture_quality.get("score", 0))
    capture_scale = float(scoring["measurement_confidence"]["capture_scale"])
    measurement_confidence = round(max(0.0, min(1.0, capture_score / 100.0 * capture_scale)), 3)

    def controlled(record: dict[str, Any]) -> dict[str, Any]:
        return {**record, "policyId": policy_id, "policyVersion": policy_version, "knowledgeControlled": True}

    if sport_id not in set(scoring["supported_sports"]):
        phase_scores = [
            controlled({
                "id": phase["id"],
                "label": phase["label"],
                "score": None,
                "note": "Technique scoring is not validated for this sport in the current engine.",
                "confidence": measurement_confidence,
                "basis": "unsupported_sport_capture_only",
            })
            for phase in phases_policy
        ]
        metric_scores = [controlled({
            "id": "video_measurability",
            "label": "Video measurability",
            "score": capture_score,
            "explanation": "Only capture quality is assessed because this sport pack is not yet validated.",
            "confidence": 1.0,
            "basis": "measured_capture_quality",
        })]
        return None, phase_scores, metric_scores, measurement_confidence, "blocked_unsupported_sport"

    scoring_action = {"backhand_slice": "slice_backhand", "slice": "slice_backhand"}.get(action_type, action_type)
    if scoring_action not in set(scoring["supported_actions"]):
        raise ValueError(f"No knowledge-controlled scoring policy exists for action '{action_type}'.")

    if not movement_confirmed:
        phase_scores = [
            controlled({
                "id": phase["id"],
                "label": phase["label"],
                "score": None,
                "note": "Confirm the movement before sport-specific scoring is produced.",
                "confidence": measurement_confidence,
                "basis": "pending_movement_confirmation",
            })
            for phase in phases_policy
        ]
        metric_scores = [
            controlled({
                "id": "video_measurability",
                "label": "Video measurability",
                "score": capture_score,
                "explanation": "Capture quality can be assessed before the stroke label is confirmed.",
                "confidence": measurement_confidence,
                "basis": "measured_capture_quality",
            })
        ]
        return None, phase_scores, metric_scores, measurement_confidence, "pending_movement_confirmation"

    ready = _frame(result, _timeline_index(result, "ready"))
    loading = _frame(result, _timeline_index(result, "loading"))
    contact = _frame(result, _timeline_index(result, "contact_proxy"))
    follow_through = _frame(result, _timeline_index(result, "follow_through"))
    recovery = _frame(result, _timeline_index(result, "recovery"))

    primary_rep = (
        result.repetitions[result.primary_repetition_index]
        if result.primary_repetition_index is not None and result.primary_repetition_index < len(result.repetitions)
        else None
    )
    head_range = float(primary_rep.get("headToComRange") or 0.0) if primary_rep else 0.0
    stance_median = float(ready.get("baseWidthNormalized") or _stat(result, "baseWidthBodyScaled", "median", 1.0)) if ready else _stat(result, "baseWidthBodyScaled", "median", 1.0)
    primary_segment = [
        item for item in result.frame_metrics
        if primary_rep and int(primary_rep["startFrame"]) <= int(item["frameIndex"]) <= int(primary_rep["endFrame"])
    ]
    motion_values = [float(item.get("motionEnergy") or 0.0) for item in primary_segment] or [0.0]
    motion_peak = max(motion_values)
    motion_mean = float(np.mean(motion_values)) if motion_values else 0.0
    duration_cv = result.aggregate_metrics.get("repetitionDurationCv")
    peak_cv = result.aggregate_metrics.get("repetitionPeakMotionCv")

    acceleration_index = _timeline_index(result, "acceleration")
    follow_through_index = _timeline_index(result, "follow_through")
    contact_head_values = [
        float(item["headToComNormalized"])
        for item in result.frame_metrics[(acceleration_index or 0):(follow_through_index or 0) + 1]
        if isinstance(item.get("headToComNormalized"), (int, float))
    ]
    contact_head_range = (
        max(contact_head_values) - min(contact_head_values)
        if contact_head_values
        else head_range
    )
    head_policy = components["head_control"].get(scoring_action, components["head_control"]["default"])
    head_measurement = contact_head_range if head_policy["measurement"] == "acceleration_to_follow_through_head_range" else head_range
    head_control = clamp_score(
        float(head_policy["base"]) - head_measurement * float(head_policy["movement_penalty"])
    )
    base_policy = components["base_control"]
    base_control = _score_band(
        stance_median,
        float(base_policy["ideal_low"]),
        float(base_policy["ideal_high"]),
        float(base_policy["tolerance"]),
        band_policy,
    )
    repeatability_policy = components["repeatability"]
    repeatability = float(repeatability_policy["missing_multi_rep_score"])
    if duration_cv is not None and peak_cv is not None:
        repeatability = clamp_score(
            float(repeatability_policy["multi_rep_base"])
            - float(duration_cv) * float(repeatability_policy["duration_cv_penalty"])
            - float(peak_cv) * float(repeatability_policy["peak_cv_penalty"])
        )
    elif len(result.repetitions) == 1:
        repeatability = float(repeatability_policy["single_rep_score"])

    ready_knees = [
        float(ready.get(key) or 175.0) if ready else 175.0
        for key in ("dominantKneeAngle", "oppositeKneeAngle")
    ]
    loading_knees = [
        float(loading.get(key) or ready_knees[index]) if loading else ready_knees[index]
        for index, key in enumerate(("dominantKneeAngle", "oppositeKneeAngle"))
    ]
    finish_knees = [
        float(follow_through.get(key) or loading_knees[index]) if follow_through else loading_knees[index]
        for index, key in enumerate(("dominantKneeAngle", "oppositeKneeAngle"))
    ]
    knee_flex_changes = [max(0.0, ready_angle - load_angle) for ready_angle, load_angle in zip(ready_knees, loading_knees, strict=True)]
    knee_extension_changes = [max(0.0, finish_angle - load_angle) for finish_angle, load_angle in zip(finish_knees, loading_knees, strict=True)]
    knee_flex_change = max(knee_flex_changes)
    knee_extension_change = max(knee_extension_changes)
    loading_policy = components["loading_control"]
    extension_policy = components["extension_control"]
    loading_control = clamp_score(
        float(loading_policy["base"])
        + min(float(loading_policy["change_cap"]), knee_flex_change * float(loading_policy["change_multiplier"]))
        + capture_score * float(loading_policy["capture_multiplier"])
    )
    extension_control = clamp_score(
        float(extension_policy["base"])
        + min(float(extension_policy["change_cap"]), knee_extension_change * float(extension_policy["change_multiplier"]))
        + capture_score * float(extension_policy["capture_multiplier"])
    )

    preparation_index = _timeline_index(result, "preparation")
    contact_index = _timeline_index(result, "contact_proxy")
    recovery_index = _timeline_index(result, "recovery")
    prep_span = max(1, (acceleration_index or 0) - (preparation_index or 0))
    forward_span = max(1, (contact_index or 0) - (acceleration_index or 0))
    recovery_span = max(1, (recovery_index or 0) - (contact_index or 0))
    tempo_ratio = prep_span / max(1, prep_span + forward_span)
    preparation_policy = components["preparation_control"]
    preparation_control = _score_band(
        tempo_ratio,
        float(preparation_policy["ideal_low"]),
        float(preparation_policy["ideal_high"]),
        float(preparation_policy["tolerance"]),
        band_policy,
    )

    peak_prominence = motion_peak / max(0.0001, motion_mean)
    acceleration_policy = components["acceleration_control"]
    acceleration_control = clamp_score(
        float(acceleration_policy["base"])
        + min(float(acceleration_policy["prominence_cap"]), peak_prominence * float(acceleration_policy["prominence_multiplier"]))
        + capture_score * float(acceleration_policy["capture_multiplier"])
    )
    if scoring_action == "two_handed_backhand":
        blend = acceleration_policy["two_handed_backhand_blend"]
        acceleration_control = clamp_score(
            acceleration_control * float(blend["acceleration"])
            + extension_control * float(blend["extension"])
        )

    contact_spacing = float(contact.get("handToTorsoNormalized") or 0.0) if contact else 0.0
    spacing_policy = components["contact_spacing"]
    spacing_band = spacing_policy.get(scoring_action, spacing_policy["default"])
    spacing_low, spacing_high = float(spacing_band["low"]), float(spacing_band["high"])
    spacing_control = _score_band(
        contact_spacing,
        spacing_low,
        spacing_high,
        float(spacing_policy["tolerance"]),
        band_policy,
    )
    contact_blend = spacing_policy["blend"]
    contact_control = clamp_score(
        spacing_control * float(contact_blend["spacing"])
        + head_control * float(contact_blend["head"])
        + capture_score * float(contact_blend["capture"])
    )

    recovery_motion = float(recovery.get("motionEnergy") or 0.0) if recovery else 0.0
    contact_motion = float(contact.get("motionEnergy") or 0.0) if contact else 0.0
    reset_ratio = recovery_motion / max(contact_motion, 0.0001)
    recovery_policy = components["recovery_control"]
    recovery_control = clamp_score(
        float(recovery_policy["base"])
        - min(float(recovery_policy["motion_penalty_cap"]), reset_ratio * float(recovery_policy["motion_penalty_multiplier"]))
        + head_control * float(recovery_policy["head_multiplier"])
    )
    finish_policy = components["finish_control"]
    finish_control = clamp_score(
        head_control * float(finish_policy["head"])
        + recovery_control * float(finish_policy["recovery"])
        + repeatability * float(finish_policy["repeatability"])
    )

    phase_components = {
        "readiness": clamp_score(
            base_control * float(phase_by_id["readiness"]["component_weights"]["base_control"])
            + head_control * float(phase_by_id["readiness"]["component_weights"]["head_control"])
        ),
        "preparation": preparation_control,
        "loading": loading_control,
        "acceleration": acceleration_control,
        "contact": contact_control,
        "follow_through": finish_control,
        "recovery": recovery_control,
    }
    phase_scores = [
        controlled({
            "id": phase["id"],
            "label": phase["label"],
            "score": phase_components[phase["id"]],
            "note": phase["note"],
            "confidence": measurement_confidence * float(phase.get("confidence_multiplier", 1.0)),
            "basis": phase["basis"],
        })
        for phase in phases_policy
    ]

    developing_boundary = float(scoring["evidence_direction_score_boundary"])
    contact_confidence_multiplier = float(phase_by_id["contact"].get("confidence_multiplier", 1.0))
    repetition_confidence = scoring["measurement_confidence"]
    metric_scores = [
        controlled({"id": "video_measurability", "label": "Video measurability", "score": capture_score, "explanation": f"Capture quality grade: {result.capture_quality.get('grade', 'unknown')}.", "confidence": 1.0, "basis": "measured_capture_quality"}),
        controlled({"id": "footwork_base", "label": "Footwork and base", "score": phase_scores[0]["score"], "explanation": f"Median ankle-to-ankle width was {stance_median:.2f} shoulder widths; this is a body-scaled image-plane measure.", "confidence": measurement_confidence, "basis": "2d_body_scaled_distance", "evidenceRecords": [{"metricId": "base_width_hip_widths", "value": round(stance_median, 5), "unit": "shoulder_widths", "measurementClass": "BODY_NORMALIZED_2D", "quality": "proxy", "deviation": "low" if stance_median < float(base_policy["ideal_low"]) else "high" if stance_median > float(base_policy["ideal_high"]) else "within_band"}]}),
        controlled({"id": "body_position", "label": "Body position and head stability", "score": head_control, "explanation": (f"Body-relative head movement from forward acceleration through follow-through was {contact_head_range:.3f} shoulder-scaled units." if scoring_action == "two_handed_backhand" else f"Body-relative head movement within the primary repetition was {head_range:.3f} shoulder-scaled units."), "confidence": measurement_confidence, "basis": "2d_pose_stability_proxy", "evidenceRecords": [{"metricId": "head_displacement_body_ratio", "value": round(head_measurement, 6), "unit": "shoulder_widths", "measurementClass": "BODY_NORMALIZED_2D", "quality": "estimated", "deviation": "high" if head_control < developing_boundary else "within_band"}]}),
        controlled({"id": "backlift_preparation", "label": "Preparation timing", "score": preparation_control, "explanation": f"Preparation occupied approximately {tempo_ratio * 100:.0f}% of the preparation-to-contact window.", "confidence": measurement_confidence, "basis": "temporal_phase_proxy"}),
        controlled({"id": "lower_body_loading", "label": "Knee loading", "score": loading_control, "explanation": f"The larger visible knee-flexion change was approximately {knee_flex_change:.1f}° from ready to loading. This is the load event, scored separately from the later drive.", "confidence": measurement_confidence, "basis": "world_pose_angle_proxy", "evidenceRecords": [{"metricId": "knee_flexion_deg", "value": round(knee_flex_change, 4), "unit": "degrees_change", "measurementClass": "MONOCULAR_3D_ESTIMATE", "quality": "estimated", "deviation": "low" if loading_control < developing_boundary else "within_band"}]}),
        controlled({"id": "lower_body_extension", "label": "Knee drive after loading", "score": extension_control, "explanation": f"The larger visible knee-extension change was approximately {knee_extension_change:.1f}° from loading into follow-through.", "confidence": measurement_confidence, "basis": "world_pose_angle_proxy"}),
        controlled({"id": "hand_swing_path", "label": "Swing rhythm and acceleration", "score": acceleration_control, "explanation": f"The smoothed whole-chain motion peak was {peak_prominence:.2f}× the clip mean.", "confidence": measurement_confidence, "basis": "smoothed_pose_motion_signal"}),
        controlled({"id": "contact_spacing", "label": "Contact-spacing proxy", "score": contact_control, "explanation": f"At peak whole-chain motion, hand-to-torso distance was {contact_spacing:.2f} shoulder widths.", "confidence": measurement_confidence * contact_confidence_multiplier, "basis": "peak_motion_proxy_without_ball"}),
        controlled({"id": "ending_position", "label": "Ending position and recovery", "score": finish_control, "explanation": f"The post-peak reset lasted {recovery_span} frames; court-position recovery is not directly measured.", "confidence": measurement_confidence, "basis": "post_peak_control_proxy", "evidenceRecords": [{"metricId": "recovery_latency_ms", "value": round(max(0.0, (_timeline_timestamp(result, "recovery") - _timeline_timestamp(result, "contact_proxy")) * 1000.0), 2), "unit": "milliseconds", "measurementClass": "EVENT_TIMING", "quality": "estimated", "deviation": "high" if recovery_control < developing_boundary else "within_band"}]}),
        controlled({"id": "repeatability", "label": "Repetition consistency", "score": repeatability, "explanation": f"{len(result.repetitions)} repetition{'s' if len(result.repetitions) != 1 else ''} were detected; consistency is more reliable with at least three.", "confidence": min(measurement_confidence, float(repetition_confidence["repeatability_three_plus_cap"] if len(result.repetitions) >= 3 else repetition_confidence["repeatability_under_three_cap"])), "basis": "between_repetition_variability"}),
    ]

    overall = clamp_score(sum(float(item["score"]) * float(phase["weight"]) for item, phase in zip(phase_scores, phases_policy, strict=True)))
    return overall, phase_scores, metric_scores, measurement_confidence, "provisional_criterion_index"
