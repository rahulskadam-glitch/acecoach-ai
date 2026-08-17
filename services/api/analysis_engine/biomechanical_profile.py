from __future__ import annotations

import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from statistics import mean
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .biomechanics import BiomechanicsResult


PROFILE_VERSION = "acecoach-kinematic-profile-v3.0.0"

# Mirrors ontology_reasoner.py's ACTION_ALIASES — kept as a separate literal
# here rather than imported, since neither module otherwise depends on the
# other and stage_guides.json's stroke keys should stay resolvable even if
# this file is used standalone (e.g. in tests).
_STAGE_GUIDE_ACTION_ALIASES = {"backhand_slice": "slice_backhand", "slice": "slice_backhand"}
_STAGE_GUIDES_PATH = Path(__file__).resolve().parents[1] / "ontology" / "v4.1.0" / "config" / "stage_guides.json"


@lru_cache(maxsize=1)
def _stage_guides() -> dict[str, Any]:
    if not _STAGE_GUIDES_PATH.exists():
        return {}
    return json.loads(_STAGE_GUIDES_PATH.read_text())


def _stage_guide_entry(action_type: str, phase_id: str) -> dict[str, Any] | None:
    stroke = _STAGE_GUIDE_ACTION_ALIASES.get(action_type, action_type)
    return _stage_guides().get("strokes", {}).get(stroke, {}).get("stages", {}).get(phase_id)


@dataclass(frozen=True)
class MetricSpec:
    id: str
    label: str
    phase: str
    region: str
    method: str
    channel: str
    start: str
    end: str
    unit: str
    basis: str
    player_meaning: str


def _spec(
    metric_id: str,
    label: str,
    phase: str,
    region: str,
    method: str,
    channel: str,
    start: str,
    end: str,
    unit: str,
    meaning: str,
    basis: str = "pose_kinematic_proxy",
) -> MetricSpec:
    return MetricSpec(metric_id, label, phase, region, method, channel, start, end, unit, basis, meaning)


METRIC_SPECS: tuple[MetricSpec, ...] = (
    # Ready Position — the static stance sampled at the "ready" anchor,
    # before any turn or racket movement begins.
    _spec("prep_base_width", "Ready base width", "ready", "base", "sample", "baseWidthNormalized", "ready", "ready", "shoulder_widths", "How wide the feet are before the stroke."),
    _spec("prep_left_knee", "Left knee angle", "ready", "left_leg", "sample", "leftKneeAngle", "ready", "ready", "degrees", "How bent the left knee is at the start.", "world_pose_angle_proxy"),
    _spec("prep_right_knee", "Right knee angle", "ready", "right_leg", "sample", "rightKneeAngle", "ready", "ready", "degrees", "How bent the right knee is at the start.", "world_pose_angle_proxy"),
    _spec("prep_left_hip", "Left hip angle", "ready", "left_hip", "sample", "leftHipAngle", "ready", "ready", "degrees", "The left-side body shape at the start.", "world_pose_angle_proxy"),
    _spec("prep_right_hip", "Right hip angle", "ready", "right_hip", "sample", "rightHipAngle", "ready", "ready", "degrees", "The right-side body shape at the start.", "world_pose_angle_proxy"),
    _spec("prep_trunk_lean", "Upper-body lean", "ready", "trunk", "sample", "trunkAngleDegrees", "ready", "ready", "degrees", "Whether the upper body starts upright or tilted.", "image_plane_orientation_proxy"),
    _spec("prep_head_com_offset", "Head-to-balance offset", "ready", "head", "sample", "headToComNormalized", "ready", "ready", "shoulder_widths", "How the head sits over the body's balance point."),
    _spec("prep_separation", "Shoulder–hip separation", "ready", "trunk", "sample", "shoulderPelvisSeparation", "ready", "ready", "degrees", "Visible separation between shoulder and hip lines.", "image_plane_rotation_proxy"),
    _spec("prep_hand_separation", "Hand separation", "ready", "arms", "sample", "handSeparationNormalized", "ready", "ready", "shoulder_widths", "How far apart the hands are before preparation."),
    _spec("prep_dominant_elbow", "Hitting elbow angle", "ready", "hitting_arm", "sample", "dominantElbowAngle", "ready", "ready", "degrees", "The shape of the hitting arm at the start.", "world_pose_angle_proxy"),
    _spec("prep_dominant_shoulder", "Hitting shoulder angle", "ready", "hitting_shoulder", "sample", "dominantShoulderAngle", "ready", "ready", "degrees", "How the hitting arm is organized from the torso.", "world_pose_angle_proxy"),
    _spec("prep_non_dominant_shoulder", "Support shoulder angle", "ready", "support_shoulder", "sample", "oppositeShoulderAngle", "ready", "ready", "degrees", "How the support arm helps organize the body.", "world_pose_angle_proxy"),

    # Unit Turn — the shoulders and hips beginning to rotate together as one
    # unit, from the "ready" anchor to the "preparation" anchor.
    _spec("prep_com_lateral_stability", "Balance-point movement", "unit_turn", "balance", "range", "centerOfMassXNormalized", "ready", "preparation", "shoulder_widths", "How much the body's balance point moves before the turn."),
    _spec("prep_head_stability", "Head stability", "unit_turn", "head", "range", "headToComNormalized", "ready", "preparation", "shoulder_widths", "How quiet the head stays during early preparation."),
    _spec("backswing_shoulder_turn", "Shoulder-line turn", "unit_turn", "shoulders", "abs_delta", "shoulderLineDegrees", "preparation", "loading", "degrees", "How much the visible shoulder line changes through the unit turn.", "image_plane_rotation_proxy"),
    _spec("backswing_pelvis_turn", "Hip-line turn", "unit_turn", "pelvis", "abs_delta", "pelvisLineDegrees", "preparation", "loading", "degrees", "How much the visible hip line changes through the unit turn.", "image_plane_rotation_proxy"),
    _spec("backswing_separation_change", "Separation change", "unit_turn", "trunk", "delta", "shoulderPelvisSeparation", "preparation", "loading", "degrees", "How shoulder–hip separation develops as the body turns as one unit.", "image_plane_rotation_proxy"),
    _spec("backswing_shoulder_turn_speed", "Peak shoulder-turn speed", "unit_turn", "shoulders", "peak", "shoulderLineAngularSpeed", "preparation", "loading", "degrees_per_second", "The fastest visible shoulder-line turn.", "image_plane_angular_speed_proxy"),
    _spec("backswing_pelvis_turn_speed", "Peak hip-turn speed", "unit_turn", "pelvis", "peak", "pelvisLineAngularSpeed", "preparation", "loading", "degrees_per_second", "The fastest visible hip-line turn.", "image_plane_angular_speed_proxy"),

    # Backswing — the racket, hands, and arms travelling back into the
    # loaded position, plus the concurrent leg-loading that supports it.
    _spec("backswing_hitting_hand_distance", "Hitting-hand distance", "backswing", "hitting_arm", "sample", "dominantHandToTorsoNormalized", "loading", "loading", "shoulder_widths", "How far the hitting hand travels from the torso."),
    _spec("backswing_support_hand_distance", "Support-hand distance", "backswing", "support_arm", "sample", "oppositeHandToTorsoNormalized", "loading", "loading", "shoulder_widths", "How the support hand organizes the turn."),
    _spec("backswing_hand_separation", "Hand separation", "backswing", "arms", "sample", "handSeparationNormalized", "loading", "loading", "shoulder_widths", "Whether the hands stay connected or separate."),
    _spec("backswing_hitting_elbow", "Hitting elbow angle", "backswing", "hitting_arm", "sample", "dominantElbowAngle", "loading", "loading", "degrees", "The hitting-arm shape at the end of the backswing.", "world_pose_angle_proxy"),
    _spec("backswing_support_elbow", "Support elbow angle", "backswing", "support_arm", "sample", "oppositeElbowAngle", "loading", "loading", "degrees", "The support-arm shape at the end of the backswing.", "world_pose_angle_proxy"),
    _spec("backswing_hitting_shoulder", "Hitting shoulder angle", "backswing", "hitting_shoulder", "sample", "dominantShoulderAngle", "loading", "loading", "degrees", "The hitting-arm position relative to the torso.", "world_pose_angle_proxy"),
    _spec("backswing_support_shoulder", "Support shoulder angle", "backswing", "support_shoulder", "sample", "oppositeShoulderAngle", "loading", "loading", "degrees", "The support-arm position relative to the torso.", "world_pose_angle_proxy"),
    _spec("backswing_hitting_wrist_vertical", "Hitting-hand vertical travel", "backswing", "hitting_hand", "abs_delta", "dominantWristYNormalized", "preparation", "loading", "shoulder_widths", "How far the hitting hand travels up or down."),
    _spec("backswing_hitting_wrist_lateral", "Hitting-hand sideways travel", "backswing", "hitting_hand", "abs_delta", "dominantWristXNormalized", "preparation", "loading", "shoulder_widths", "How far the hitting hand travels across the body."),
    _spec("backswing_support_wrist_vertical", "Support-hand vertical travel", "backswing", "support_hand", "abs_delta", "oppositeWristYNormalized", "preparation", "loading", "shoulder_widths", "How the support hand moves vertically during the turn."),
    _spec("backswing_wrist_speed", "Peak hitting-hand speed", "backswing", "hitting_hand", "peak", "dominantWristSpeedBodyPerSecond", "preparation", "loading", "body_lengths_per_second", "The fastest hitting-hand movement in the backswing."),
    _spec("backswing_duration", "Backswing time share", "backswing", "timing", "duration_ratio", "", "preparation", "loading", "ratio", "The share of the full movement used for the backswing.", "frame_timing"),
    _spec("load_hitting_knee", "Hitting-side knee angle", "backswing", "hitting_leg", "sample", "dominantKneeAngle", "loading", "loading", "degrees", "How much the hitting-side leg bends at load.", "world_pose_angle_proxy"),
    _spec("load_support_knee", "Support-side knee angle", "backswing", "support_leg", "sample", "oppositeKneeAngle", "loading", "loading", "degrees", "How much the support-side leg bends at load.", "world_pose_angle_proxy"),
    _spec("load_hitting_knee_change", "Hitting-knee load", "backswing", "hitting_leg", "delta", "dominantKneeAngle", "ready", "loading", "degrees", "The change in hitting-side knee angle into load.", "world_pose_angle_proxy"),
    _spec("load_support_knee_change", "Support-knee load", "backswing", "support_leg", "delta", "oppositeKneeAngle", "ready", "loading", "degrees", "The change in support-side knee angle into load.", "world_pose_angle_proxy"),
    _spec("load_hitting_hip", "Hitting-side hip angle", "backswing", "hitting_hip", "sample", "dominantHipAngle", "loading", "loading", "degrees", "The hitting-side hip shape at load.", "world_pose_angle_proxy"),
    _spec("load_support_hip", "Support-side hip angle", "backswing", "support_hip", "sample", "oppositeHipAngle", "loading", "loading", "degrees", "The support-side hip shape at load.", "world_pose_angle_proxy"),
    _spec("load_base_width", "Loaded base width", "backswing", "base", "sample", "baseWidthNormalized", "loading", "loading", "shoulder_widths", "How wide the base is at load."),
    _spec("load_base_width_change", "Base-width change", "backswing", "base", "delta", "baseWidthNormalized", "ready", "loading", "shoulder_widths", "How the stance changes from ready position to load."),
    _spec("load_com_vertical", "Balance-point vertical travel", "backswing", "balance", "abs_delta", "centerOfMassYNormalized", "ready", "loading", "shoulder_widths", "How far the body lowers or rises into load."),
    _spec("load_com_lateral", "Balance-point sideways travel", "backswing", "balance", "abs_delta", "centerOfMassXNormalized", "ready", "loading", "shoulder_widths", "How far body weight visibly shifts sideways."),
    _spec("load_head_stability", "Head stability", "backswing", "head", "range", "headToComNormalized", "preparation", "acceleration", "shoulder_widths", "How quiet the head stays through the loading window."),
    _spec("load_trunk_lean", "Upper-body lean", "backswing", "trunk", "sample", "trunkAngleDegrees", "loading", "loading", "degrees", "The upper-body angle at maximum load.", "image_plane_orientation_proxy"),
    _spec("load_separation", "Shoulder–hip separation", "backswing", "trunk", "sample", "shoulderPelvisSeparation", "loading", "loading", "degrees", "Visible separation between shoulder and hip lines.", "image_plane_rotation_proxy"),
    _spec("load_hitting_ankle", "Hitting-side ankle angle", "backswing", "hitting_ankle", "sample", "dominantAnkleAngle", "loading", "loading", "degrees", "The hitting-side lower-leg and foot shape.", "world_pose_angle_proxy"),
    _spec("load_support_ankle", "Support-side ankle angle", "backswing", "support_ankle", "sample", "oppositeAnkleAngle", "loading", "loading", "degrees", "The support-side lower-leg and foot shape.", "world_pose_angle_proxy"),

    # Forward Swing & Contact — the kinetic-chain drive from the loaded
    # position through to the racket meeting the ball. Deliberately merges
    # what earlier registry versions tracked as separate "acceleration" and
    # "contact" groups, matching the combined stage name.
    _spec("load_lower_body_speed", "Peak lower-body movement", "forward_swing_contact", "lower_body", "peak", "lowerBodySpeedBodyPerSecond", "loading", "acceleration", "body_lengths_per_second", "The strongest visible lower-body movement into the forward swing."),
    _spec("load_duration", "Loading time share", "forward_swing_contact", "timing", "duration_ratio", "", "loading", "acceleration", "ratio", "The share of the full movement used to load."),
    _spec("load_to_upper_timing", "Load-to-turn timing", "forward_swing_contact", "linkage", "peak_gap", "lowerBodySpeedBodyPerSecond|shoulderLineAngularSpeed", "loading", "contact_proxy", "seconds", "Timing between lower-body movement and shoulder turn.", "pose_sequence_proxy"),
    _spec("accel_hitting_wrist_speed", "Hitting-hand peak speed", "forward_swing_contact", "hitting_hand", "peak", "dominantWristSpeedBodyPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak hitting-hand speed before likely contact."),
    _spec("accel_support_wrist_speed", "Support-hand peak speed", "forward_swing_contact", "support_hand", "peak", "oppositeWristSpeedBodyPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak support-hand speed before likely contact."),
    _spec("accel_hitting_elbow_speed", "Hitting-elbow peak speed", "forward_swing_contact", "hitting_arm", "peak", "dominantElbowSpeedBodyPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak hitting-elbow speed in the forward movement."),
    _spec("accel_support_elbow_speed", "Support-elbow peak speed", "forward_swing_contact", "support_arm", "peak", "oppositeElbowSpeedBodyPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak support-elbow speed in the forward movement."),
    _spec("accel_hitting_shoulder_speed", "Hitting-shoulder peak speed", "forward_swing_contact", "hitting_shoulder", "peak", "dominantShoulderSpeedBodyPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak hitting-shoulder movement before likely contact."),
    _spec("accel_support_shoulder_speed", "Support-shoulder peak speed", "forward_swing_contact", "support_shoulder", "peak", "oppositeShoulderSpeedBodyPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak support-shoulder movement before likely contact."),
    _spec("accel_pelvis_turn_speed", "Hip-line peak turn speed", "forward_swing_contact", "pelvis", "peak", "pelvisLineAngularSpeed", "acceleration", "contact_proxy", "degrees_per_second", "Fastest visible hip-line rotation.", "image_plane_angular_speed_proxy"),
    _spec("accel_shoulder_turn_speed", "Shoulder-line peak turn speed", "forward_swing_contact", "shoulders", "peak", "shoulderLineAngularSpeed", "acceleration", "contact_proxy", "degrees_per_second", "Fastest visible shoulder-line rotation.", "image_plane_angular_speed_proxy"),
    _spec("accel_trunk_turn_speed", "Upper-body peak turn speed", "forward_swing_contact", "trunk", "peak", "trunkAngularSpeed", "acceleration", "contact_proxy", "degrees_per_second", "Fastest visible upper-body angular change.", "image_plane_angular_speed_proxy"),
    _spec("accel_upper_arm_speed", "Hitting upper-arm turn speed", "forward_swing_contact", "hitting_arm", "peak", "dominantUpperArmAngularSpeed", "acceleration", "contact_proxy", "degrees_per_second", "Fastest visible hitting upper-arm rotation.", "image_plane_angular_speed_proxy"),
    _spec("accel_forearm_speed", "Hitting forearm turn speed", "forward_swing_contact", "hitting_forearm", "peak", "dominantForearmAngularSpeed", "acceleration", "contact_proxy", "degrees_per_second", "Fastest visible hitting-forearm rotation.", "image_plane_angular_speed_proxy"),
    _spec("accel_wrist_acceleration", "Hitting-hand acceleration", "forward_swing_contact", "hitting_hand", "peak", "dominantWristAccelerationBodyPerSecond2", "acceleration", "contact_proxy", "body_lengths_per_second_squared", "Fastest increase in hitting-hand speed."),
    _spec("accel_com_speed", "Balance-point peak speed", "forward_swing_contact", "balance", "peak", "comSpeedImageBodyScaledPerSecond", "acceleration", "contact_proxy", "body_lengths_per_second", "Peak whole-body balance-point movement."),
    _spec("accel_hitting_knee_extension", "Hitting-knee extension", "forward_swing_contact", "hitting_leg", "delta", "dominantKneeAngle", "loading", "contact_proxy", "degrees", "How the hitting-side leg changes from load to likely contact.", "world_pose_angle_proxy"),
    _spec("accel_support_knee_extension", "Support-knee extension", "forward_swing_contact", "support_leg", "delta", "oppositeKneeAngle", "loading", "contact_proxy", "degrees", "How the support-side leg changes from load to likely contact.", "world_pose_angle_proxy"),
    _spec("accel_hitting_hip_extension", "Hitting-hip extension", "forward_swing_contact", "hitting_hip", "delta", "dominantHipAngle", "loading", "contact_proxy", "degrees", "How the hitting-side hip opens from load to likely contact.", "world_pose_angle_proxy"),
    _spec("accel_support_hip_extension", "Support-hip extension", "forward_swing_contact", "support_hip", "delta", "oppositeHipAngle", "loading", "contact_proxy", "degrees", "How the support-side hip opens from load to likely contact.", "world_pose_angle_proxy"),
    _spec("accel_hitting_elbow_extension", "Hitting-elbow extension", "forward_swing_contact", "hitting_arm", "delta", "dominantElbowAngle", "loading", "contact_proxy", "degrees", "How the hitting arm changes toward likely contact.", "world_pose_angle_proxy"),
    _spec("accel_support_elbow_extension", "Support-elbow extension", "forward_swing_contact", "support_arm", "delta", "oppositeElbowAngle", "loading", "contact_proxy", "degrees", "How the support arm changes toward likely contact.", "world_pose_angle_proxy"),
    _spec("accel_separation_release", "Separation release", "forward_swing_contact", "trunk", "delta", "shoulderPelvisSeparation", "loading", "contact_proxy", "degrees", "How visible shoulder–hip separation changes into contact.", "image_plane_rotation_proxy"),
    _spec("accel_pelvis_to_shoulder_timing", "Hip-to-shoulder timing", "forward_swing_contact", "linkage", "peak_gap", "pelvisLineAngularSpeed|shoulderLineAngularSpeed", "acceleration", "contact_proxy", "seconds", "Whether hip-line movement leads shoulder-line movement.", "pose_sequence_proxy"),
    _spec("accel_shoulder_to_elbow_timing", "Shoulder-to-elbow timing", "forward_swing_contact", "linkage", "peak_gap", "dominantShoulderSpeedBodyPerSecond|dominantElbowSpeedBodyPerSecond", "acceleration", "contact_proxy", "seconds", "Whether shoulder movement leads the hitting elbow.", "pose_sequence_proxy"),
    _spec("contact_hitting_hand_space", "Hitting-hand space", "forward_swing_contact", "hitting_hand", "sample", "dominantHandToTorsoNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Space between the hitting hand and torso at likely contact."),
    _spec("contact_support_hand_space", "Support-hand space", "forward_swing_contact", "support_hand", "sample", "oppositeHandToTorsoNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Support-hand distance from the torso at likely contact."),
    _spec("contact_hand_separation", "Hand separation", "forward_swing_contact", "arms", "sample", "handSeparationNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Distance between both hands at likely contact."),
    _spec("contact_hitting_elbow", "Hitting elbow angle", "forward_swing_contact", "hitting_arm", "sample", "dominantElbowAngle", "contact_proxy", "contact_proxy", "degrees", "Hitting-arm shape at likely contact.", "world_pose_angle_proxy"),
    _spec("contact_support_elbow", "Support elbow angle", "forward_swing_contact", "support_arm", "sample", "oppositeElbowAngle", "contact_proxy", "contact_proxy", "degrees", "Support-arm shape at likely contact.", "world_pose_angle_proxy"),
    _spec("contact_hitting_shoulder", "Hitting shoulder angle", "forward_swing_contact", "hitting_shoulder", "sample", "dominantShoulderAngle", "contact_proxy", "contact_proxy", "degrees", "Hitting-arm position relative to the torso.", "world_pose_angle_proxy"),
    _spec("contact_support_shoulder", "Support shoulder angle", "forward_swing_contact", "support_shoulder", "sample", "oppositeShoulderAngle", "contact_proxy", "contact_proxy", "degrees", "Support-arm position relative to the torso.", "world_pose_angle_proxy"),
    _spec("contact_hitting_wrist_height", "Hitting-hand height", "forward_swing_contact", "hitting_hand", "sample", "dominantWristYNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Hitting-hand height relative to the shoulder centre."),
    _spec("contact_support_wrist_height", "Support-hand height", "forward_swing_contact", "support_hand", "sample", "oppositeWristYNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Support-hand height relative to the shoulder centre."),
    _spec("contact_head_offset", "Head-to-balance offset", "forward_swing_contact", "head", "sample", "headToComNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Head position relative to the body's balance point."),
    _spec("contact_trunk_lean", "Upper-body lean", "forward_swing_contact", "trunk", "sample", "trunkAngleDegrees", "contact_proxy", "contact_proxy", "degrees", "Upper-body angle at likely contact.", "image_plane_orientation_proxy"),
    _spec("contact_base_width", "Contact base width", "forward_swing_contact", "base", "sample", "baseWidthNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Foot spacing at likely contact."),
    _spec("contact_com_horizontal", "Balance-point position", "forward_swing_contact", "balance", "sample", "centerOfMassXNormalized", "contact_proxy", "contact_proxy", "shoulder_widths", "Sideways balance-point position at likely contact."),
    _spec("contact_separation", "Shoulder–hip separation", "forward_swing_contact", "trunk", "sample", "shoulderPelvisSeparation", "contact_proxy", "contact_proxy", "degrees", "Visible shoulder–hip separation at likely contact.", "image_plane_rotation_proxy"),
    _spec("contact_motion_prominence", "Contact motion prominence", "forward_swing_contact", "whole_body", "prominence", "motionEnergy", "ready", "recovery", "ratio", "How strongly the likely-contact motion peak stands out.", "smoothed_pose_motion_signal"),

    # Follow-Through — the hitting arm, racket, and upper body continuing
    # and decelerating after the ball is struck.
    _spec("finish_hitting_wrist_travel", "Hitting-hand finish travel", "follow_through", "hitting_hand", "vector_displacement", "dominantWristXNormalized|dominantWristYNormalized", "contact_proxy", "recovery", "shoulder_widths", "How far the hitting hand travels after likely contact."),
    _spec("finish_support_wrist_travel", "Support-hand finish travel", "follow_through", "support_hand", "vector_displacement", "oppositeWristXNormalized|oppositeWristYNormalized", "contact_proxy", "recovery", "shoulder_widths", "How far the support hand travels after likely contact."),
    _spec("finish_hitting_elbow", "Hitting elbow at finish", "follow_through", "hitting_arm", "sample", "dominantElbowAngle", "follow_through", "follow_through", "degrees", "Hitting-arm shape during the finish.", "world_pose_angle_proxy"),
    _spec("finish_support_elbow", "Support elbow at finish", "follow_through", "support_arm", "sample", "oppositeElbowAngle", "follow_through", "follow_through", "degrees", "Support-arm shape during the finish.", "world_pose_angle_proxy"),
    _spec("finish_shoulder_turn", "Shoulder-line finish travel", "follow_through", "shoulders", "abs_delta", "shoulderLineDegrees", "contact_proxy", "follow_through", "degrees", "Visible shoulder-line movement after likely contact.", "image_plane_rotation_proxy"),
    _spec("finish_pelvis_turn", "Hip-line finish travel", "follow_through", "pelvis", "abs_delta", "pelvisLineDegrees", "contact_proxy", "follow_through", "degrees", "Visible hip-line movement after likely contact.", "image_plane_rotation_proxy"),
    _spec("finish_trunk_lean", "Upper-body lean at finish", "follow_through", "trunk", "sample", "trunkAngleDegrees", "follow_through", "follow_through", "degrees", "Upper-body position during the finish.", "image_plane_orientation_proxy"),
    _spec("finish_wrist_deceleration", "Hitting-hand deceleration", "follow_through", "hitting_hand", "deceleration_ratio", "dominantWristSpeedBodyPerSecond", "contact_proxy", "recovery", "ratio", "How the hitting hand slows after likely contact."),

    # Recovery — the legs, base, and balance resetting into a ready
    # position for the next ball, plus how repeatable the whole movement was.
    _spec("finish_head_stability", "Head stability after contact", "recovery", "head", "range", "headToComNormalized", "contact_proxy", "recovery", "shoulder_widths", "How quiet the head stays through finish and recovery."),
    _spec("finish_com_stability", "Balance-point stability", "recovery", "balance", "range", "centerOfMassXNormalized", "contact_proxy", "recovery", "shoulder_widths", "How much the balance point shifts after likely contact."),
    _spec("finish_recovery_base", "Recovery base width", "recovery", "base", "sample", "baseWidthNormalized", "recovery", "recovery", "shoulder_widths", "Foot spacing when the movement resets."),
    _spec("finish_hitting_knee", "Hitting knee at recovery", "recovery", "hitting_leg", "sample", "dominantKneeAngle", "recovery", "recovery", "degrees", "Hitting-side knee shape at reset.", "world_pose_angle_proxy"),
    _spec("finish_support_knee", "Support knee at recovery", "recovery", "support_leg", "sample", "oppositeKneeAngle", "recovery", "recovery", "degrees", "Support-side knee shape at reset.", "world_pose_angle_proxy"),
    _spec("finish_recovery_duration", "Recovery time share", "recovery", "timing", "duration_ratio", "", "contact_proxy", "recovery", "ratio", "The share of the full movement used to finish and reset.", "frame_timing"),
    _spec("finish_duration_consistency", "Movement-duration consistency", "recovery", "repeatability", "aggregate", "repetitionDurationCv", "ready", "recovery", "coefficient_of_variation", "How repeatable the movement duration is across attempts.", "between_repetition_variability"),
    _spec("finish_peak_consistency", "Peak-rhythm consistency", "recovery", "repeatability", "aggregate", "repetitionPeakMotionCv", "ready", "recovery", "coefficient_of_variation", "How repeatable the main motion peak is across attempts.", "between_repetition_variability"),
)

PHASE_LABELS = {
    "ready": "Ready Position",
    "unit_turn": "Unit Turn",
    "backswing": "Backswing",
    "forward_swing_contact": "Forward Swing & Contact",
    "follow_through": "Follow-Through",
    "recovery": "Recovery",
}

# Research grounding for each phase's metric set, referencing the same
# citation ids used by the fault ontology (services/api/ontology/v4.1.0/
# config/research_sources.json), so a phase's measured constructs are
# traceable to real published sources rather than an arbitrary list.
PHASE_SOURCE_IDS: dict[str, tuple[str, ...]] = {
    "ready": ("SCI-ELLIOTT-2006", "SCI-KOVACS-2011"),
    "unit_turn": ("SCI-ELLIOTT-2006", "SCI-FILIPCIC-2017-SPLITSTEP", "VID-MOURATOGLOU-FOOTWORK"),
    "backswing": ("SCI-HE-2022-FOREHAND-LOWER-LIMB", "SCI-LANDLINGER-2010", "SCI-KOVACS-2011"),
    "forward_swing_contact": ("SCI-ELLIOTT-2006", "SCI-GENEVOIS-2015", "SCI-STEPien-2011", "SCI-LANDLINGER-2010", "SCI-REID-BH-2002", "SCI-CHOW-2007", "SCI-FURUYA-2021", "SCI-BRITO-2024"),
    "follow_through": ("SCI-ELLIOTT-2006", "ORG-ITF-SKILL-PHASES-2023"),
    "recovery": ("ORG-ITF-SKILL-PHASES-2023", "SCI-FILIPCIC-2017-SPLITSTEP"),
}


def _anchor_indices(result: BiomechanicsResult) -> dict[str, int]:
    anchors = {str(item["phase"]): int(item["frameIndex"]) for item in result.timeline}
    return anchors


def _frame(result: BiomechanicsResult, anchors: dict[str, int], phase: str) -> dict[str, Any] | None:
    index = anchors.get(phase)
    if index is None or index < 0 or index >= len(result.frame_metrics):
        return None
    return result.frame_metrics[index]


def _channel_value(frame: dict[str, Any] | None, channel: str) -> float | None:
    if not frame:
        return None
    value = frame.get(channel)
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return float(value)
    return None


def _segment(result: BiomechanicsResult, anchors: dict[str, int], start: str, end: str) -> list[dict[str, Any]]:
    start_index = anchors.get(start)
    end_index = anchors.get(end)
    if start_index is None or end_index is None:
        return []
    low, high = sorted((start_index, end_index))
    return result.frame_metrics[low:high + 1]


def _values(segment: list[dict[str, Any]], channel: str) -> list[float]:
    return [float(item[channel]) for item in segment if isinstance(item.get(channel), (int, float)) and math.isfinite(float(item[channel]))]


def _peak_index(segment: list[dict[str, Any]], channel: str) -> int | None:
    candidates = [(index, abs(float(item[channel]))) for index, item in enumerate(segment) if isinstance(item.get(channel), (int, float)) and math.isfinite(float(item[channel]))]
    return max(candidates, key=lambda item: item[1])[0] if candidates else None


def _calculate(spec: MetricSpec, result: BiomechanicsResult, anchors: dict[str, int]) -> float | None:
    start_frame = _frame(result, anchors, spec.start)
    end_frame = _frame(result, anchors, spec.end)
    start_value = _channel_value(start_frame, spec.channel)
    end_value = _channel_value(end_frame, spec.channel)
    segment = _segment(result, anchors, spec.start, spec.end)

    if spec.method == "sample":
        return end_value
    if spec.method in {"delta", "abs_delta"}:
        if start_value is None or end_value is None:
            return None
        delta = (
            (end_value - start_value + 180.0) % 360.0 - 180.0
            if spec.channel in {"shoulderLineDegrees", "pelvisLineDegrees", "trunkAngleDegrees"}
            else end_value - start_value
        )
        return abs(delta) if spec.method == "abs_delta" else delta
    if spec.method in {"range", "peak"}:
        values = _values(segment, spec.channel)
        if not values:
            return None
        return max(values) - min(values) if spec.method == "range" else max(abs(value) for value in values)
    if spec.method == "duration_ratio":
        ready = anchors.get("ready")
        recovery = anchors.get("recovery")
        start_index = anchors.get(spec.start)
        end_index = anchors.get(spec.end)
        if None in (ready, recovery, start_index, end_index) or recovery == ready:
            return None
        return abs(end_index - start_index) / max(1, recovery - ready)
    if spec.method == "peak_gap":
        first_channel, second_channel = spec.channel.split("|", 1)
        first_peak = _peak_index(segment, first_channel)
        second_peak = _peak_index(segment, second_channel)
        if first_peak is None or second_peak is None:
            return None
        timestamps = [float(item.get("timestampSeconds", 0.0)) for item in segment]
        return timestamps[second_peak] - timestamps[first_peak]
    if spec.method == "vector_displacement":
        x_channel, y_channel = spec.channel.split("|", 1)
        x_start = _channel_value(start_frame, x_channel)
        y_start = _channel_value(start_frame, y_channel)
        x_end = _channel_value(end_frame, x_channel)
        y_end = _channel_value(end_frame, y_channel)
        if None in (x_start, y_start, x_end, y_end):
            return None
        return math.hypot(x_end - x_start, y_end - y_start)
    if spec.method == "prominence":
        values = _values(segment, spec.channel)
        if not values or end_value is None:
            return None
        return end_value / max(1e-6, mean(values))
    if spec.method == "deceleration_ratio":
        values = _values(segment, spec.channel)
        if not values:
            return None
        return values[-1] / max(1e-6, max(values))
    if spec.method == "aggregate":
        value = result.aggregate_metrics.get(spec.channel)
        return float(value) if isinstance(value, (int, float)) and math.isfinite(float(value)) else None
    return None


def _metric_confidence(spec: MetricSpec, result: BiomechanicsResult, anchors: dict[str, int], base_confidence: float) -> float:
    visibility_values = _values(_segment(result, anchors, spec.start, spec.end), "visibility")
    visibility = mean(visibility_values) if visibility_values else result.pose_coverage
    basis_factor = 0.72 if "image_plane" in spec.basis else 0.78 if "proxy" in spec.basis else 0.90
    if spec.phase == "contact":
        basis_factor *= 0.84
    return round(max(0.0, min(1.0, base_confidence * visibility * basis_factor)), 3)


def _format_value(value: float | None, unit: str) -> str:
    if value is None:
        return "Unavailable"
    if unit == "degrees":
        return f"{value:.1f}°"
    if unit == "degrees_per_second":
        return f"{value:.1f}°/s"
    if unit == "seconds":
        return f"{value * 1000:.0f} ms"
    if unit == "ratio":
        return f"{value:.2f}"
    if unit == "coefficient_of_variation":
        return f"{value * 100:.1f}% CV"
    return f"{value:.3f}"


def _linkage_analysis(result: BiomechanicsResult, anchors: dict[str, int], base_confidence: float) -> list[dict[str, Any]]:
    segment = _segment(result, anchors, "loading", "contact_proxy")
    nodes = [
        ("base", "Base", "lowerBodySpeedBodyPerSecond"),
        ("knees", "Knees", "kneeChainSpeedBodyPerSecond"),
        ("hips", "Hips", "hipChainSpeedBodyPerSecond"),
        ("pelvis", "Hip turn", "pelvisLineAngularSpeed"),
        ("shoulders", "Shoulder turn", "shoulderLineAngularSpeed"),
        ("elbow", "Hitting elbow", "dominantElbowSpeedBodyPerSecond"),
        ("wrist", "Hitting hand", "dominantWristSpeedBodyPerSecond"),
    ]
    peaks: dict[str, float | None] = {}
    for node_id, _label, channel in nodes:
        channel_values = _values(segment, channel)
        peak_index = _peak_index(segment, channel) if channel_values and max(abs(value) for value in channel_values) > 1e-4 else None
        peaks[node_id] = float(segment[peak_index]["timestampSeconds"]) if peak_index is not None else None

    links: list[dict[str, Any]] = []
    for (source_id, source_label, _), (target_id, target_label, _) in zip(nodes, nodes[1:]):
        source_time = peaks[source_id]
        target_time = peaks[target_id]
        gap = None if source_time is None or target_time is None else target_time - source_time
        if gap is None:
            status = "unavailable"
            explanation = "This link was not reliable enough in the recording."
        elif gap < -0.060:
            status = "out_of_sequence"
            explanation = f"{target_label} peaked about {abs(gap) * 1000:.0f} ms before {source_label}."
        elif gap > 0.250:
            status = "delayed_transfer"
            explanation = f"The transfer from {source_label} to {target_label} took about {gap * 1000:.0f} ms."
        else:
            status = "connected"
            explanation = (
                f"{source_label} and {target_label} peaked within the same sampled moment."
                if abs(gap) <= 0.040
                else f"{target_label} followed {source_label} by about {gap * 1000:.0f} ms."
            )
        links.append({
            "id": f"{source_id}_to_{target_id}",
            "source": {"id": source_id, "label": source_label, "peakTimestampSeconds": source_time},
            "target": {"id": target_id, "label": target_label, "peakTimestampSeconds": target_time},
            "gapSeconds": None if gap is None else round(gap, 4),
            "status": status,
            "confidence": round(base_confidence * (0.68 if "turn" in source_label.lower() or "turn" in target_label.lower() else 0.78), 3),
            "explanation": explanation,
        })
    return links


def build_biomechanical_profile(
    result: BiomechanicsResult,
    action_type: str,
    phase_scores: list[dict[str, Any]],
    measurement_confidence: float,
) -> dict[str, Any]:
    anchors = _anchor_indices(result)
    metrics: list[dict[str, Any]] = []
    for spec in METRIC_SPECS:
        value = _calculate(spec, result, anchors)
        confidence = _metric_confidence(spec, result, anchors, measurement_confidence)
        metrics.append({
            "id": spec.id,
            "label": spec.label,
            "phase": spec.phase,
            "region": spec.region,
            "value": None if value is None else round(value, 5),
            "displayValue": _format_value(value, spec.unit),
            "unit": spec.unit,
            "status": "available" if value is not None else "unavailable",
            "confidence": confidence if value is not None else 0.0,
            "measurementBasis": spec.basis,
            "playerMeaning": spec.player_meaning,
        })

    legacy_phase_scores = {str(item.get("id")): item.get("score") for item in phase_scores}
    acceleration_score = legacy_phase_scores.get("acceleration")
    contact_score = legacy_phase_scores.get("contact")
    forward_swing_contact_score: float | None
    if acceleration_score is not None and contact_score is not None:
        forward_swing_contact_score = (float(acceleration_score) + float(contact_score)) / 2
    else:
        forward_swing_contact_score = acceleration_score if acceleration_score is not None else contact_score
    phase_score_map = {
        # Source ids here are the real scoring-policy phases from
        # analysis_control_policy.json (readiness/preparation/loading/
        # acceleration/contact/follow_through/recovery) — untouched by this
        # file's phase regrouping, just referenced by their existing keys.
        # "forward_swing_contact" blends the two real scores it merges.
        "ready": legacy_phase_scores.get("readiness"),
        "unit_turn": legacy_phase_scores.get("preparation"),
        "backswing": legacy_phase_scores.get("loading"),
        "forward_swing_contact": forward_swing_contact_score,
        "follow_through": legacy_phase_scores.get("follow_through"),
        "recovery": legacy_phase_scores.get("recovery"),
    }
    phases: list[dict[str, Any]] = []
    for phase_id, label in PHASE_LABELS.items():
        phase_metrics = [metric for metric in metrics if metric["phase"] == phase_id]
        available = [metric for metric in phase_metrics if metric["status"] == "available"]
        guide = _stage_guide_entry(action_type, phase_id)
        phases.append({
            "id": phase_id,
            "label": label,
            "score": phase_score_map.get(phase_id),
            "metricCount": len(phase_metrics),
            "availableMetricCount": len(available),
            "confidence": round(mean(metric["confidence"] for metric in available), 3) if available else 0.0,
            "sourceIds": list(PHASE_SOURCE_IDS.get(phase_id, ())),
            "coachingCue": guide.get("coachingCue") if guide else None,
            "whatIsMeasured": guide.get("whatIsMeasured") if guide else None,
            "checkpoints": guide.get("checkpoints", []) if guide else [],
            "benchmarkDescription": guide.get("benchmarkDescription") if guide else None,
            "commonMistakeTitles": [item["title"] for item in guide.get("commonMistakes", [])] if guide else [],
        })

    links = _linkage_analysis(result, anchors, measurement_confidence)
    connected_links = sum(1 for link in links if link["status"] == "connected")
    available_metrics = sum(1 for metric in metrics if metric["status"] == "available")
    return {
        "version": PROFILE_VERSION,
        "actionType": action_type,
        "metricCount": len(metrics),
        "availableMetricCount": available_metrics,
        "unavailableMetricCount": len(metrics) - available_metrics,
        "measurementStatement": f"{len(metrics)} transparent pose-kinematic checks across six movement phases, each grounded in cited tennis biomechanics research. Values are camera-aware estimates unless explicitly labelled measured; they are not force, load, muscle-activation, racket, or ball measurements.",
        "phases": phases,
        "linkages": links,
        "connectedLinkCount": connected_links,
        "linkCount": len(links),
        "metrics": metrics,
    }
