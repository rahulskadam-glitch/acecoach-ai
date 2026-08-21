from __future__ import annotations

from typing import Any

import cv2
import mediapipe as mp
import numpy as np

from .frame_types import PoseFrame
from .video import MAX_ANALYSIS_FRAMES, VideoMetadata


POSE_MODEL_VERSION = "mediapipe-pose-0.10.21-world-landmarks"
LANDMARK_NAMES = [landmark.name.lower() for landmark in mp.solutions.pose.PoseLandmark]
CORE_LANDMARKS = (
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
)


def _presentation_timestamp(
    capture: cv2.VideoCapture,
    frame_index: int,
    fps: float,
    previous_timestamp: float | None,
) -> tuple[float, str]:
    """Return the decoder presentation time, with a monotonic nominal fallback."""
    position_milliseconds = float(capture.get(cv2.CAP_PROP_POS_MSEC) or 0.0)
    decoder_time = position_milliseconds / 1000.0
    decoder_is_valid = (
        np.isfinite(decoder_time)
        and decoder_time >= 0.0
        and (frame_index == 0 or previous_timestamp is None or decoder_time > previous_timestamp + 1e-6)
    )
    if decoder_is_valid:
        return round(decoder_time, 6), "decoder_presentation_timestamp"
    nominal_step = 1.0 / max(fps, 1.0)
    fallback = frame_index * nominal_step if previous_timestamp is None else previous_timestamp + nominal_step
    return round(fallback, 6), "nominal_frame_rate_fallback"


def _serialize_landmark_list(landmark_list: Any | None) -> dict[str, dict[str, float]]:
    if not landmark_list:
        return {}
    landmarks: dict[str, dict[str, float]] = {}
    for name, landmark in zip(LANDMARK_NAMES, landmark_list.landmark, strict=True):
        landmarks[name] = {
            "x": round(float(landmark.x), 6),
            "y": round(float(landmark.y), 6),
            "z": round(float(landmark.z), 6),
            "visibility": round(float(landmark.visibility), 6),
        }
    return landmarks


def _visibility_summary(landmarks: dict[str, dict[str, float]]) -> tuple[float, float]:
    if not landmarks:
        return 0.0, 0.0
    all_visibility = [float(item.get("visibility", 0.0)) for item in landmarks.values()]
    core_visibility = [
        float(landmarks[name].get("visibility", 0.0))
        for name in CORE_LANDMARKS
        if name in landmarks
    ]
    return (
        round(float(np.mean(all_visibility)), 6),
        round(float(np.mean(core_visibility)), 6) if core_visibility else 0.0,
    )


def _image_quality(frame: np.ndarray) -> tuple[float, float, float]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray)) / 255.0
    contrast = float(np.std(gray)) / 128.0
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return round(brightness, 6), round(contrast, 6), round(blur_score, 4)


def _body_box(landmarks: dict[str, dict[str, float]]) -> tuple[dict[str, float] | None, bool]:
    visible = [
        item
        for name, item in landmarks.items()
        if name in CORE_LANDMARKS and float(item.get("visibility", 0.0)) >= 0.35
    ]
    if len(visible) < 6:
        return None, False
    x_values = [float(item["x"]) for item in visible]
    y_values = [float(item["y"]) for item in visible]
    left = min(x_values)
    right = max(x_values)
    top = min(y_values)
    bottom = max(y_values)
    box = {
        "left": round(left, 6),
        "top": round(top, 6),
        "right": round(right, 6),
        "bottom": round(bottom, 6),
        "width": round(right - left, 6),
        "height": round(bottom - top, 6),
    }
    edge_clipping = left <= 0.015 or right >= 0.985 or top <= 0.015 or bottom >= 0.985
    return box, edge_clipping


def extract_pose_frames(metadata: VideoMetadata) -> list[PoseFrame]:
    capture = cv2.VideoCapture(str(metadata.path))
    orientation_auto = getattr(cv2, "CAP_PROP_ORIENTATION_AUTO", None)
    # capture.set() returning True only means the backend accepted the request to
    # auto-rotate decoded frames to match the file's rotation metadata — many
    # OpenCV/FFmpeg builds don't support CAP_PROP_ORIENTATION_AUTO at all and
    # silently ignore it, leaving frames un-rotated. The report layer needs this
    # real outcome (not just "rotation metadata exists") to know whether pose
    # landmarks are already in the video's displayed orientation or still need a
    # manual rotation correction before they'll align with the athlete's body.
    orientation_auto_applied = bool(orientation_auto is not None and capture.set(orientation_auto, 1))
    frames: list[PoseFrame] = []
    previous_timestamp: float | None = None

    with mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=2,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.55,
        min_tracking_confidence=0.55,
    ) as pose:
        frame_index = 0
        while True:
            if frame_index >= MAX_ANALYSIS_FRAMES:
                capture.release()
                raise ValueError(f"Decoded frame count exceeded the safe limit of {MAX_ANALYSIS_FRAMES}.")
            ok, frame = capture.read()
            if not ok:
                break

            timestamp_seconds, timestamp_source = _presentation_timestamp(
                capture, frame_index, metadata.fps, previous_timestamp,
            )
            previous_timestamp = timestamp_seconds

            brightness, contrast, blur_score = _image_quality(frame)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            result = pose.process(rgb)
            landmarks = _serialize_landmark_list(result.pose_landmarks)
            world_landmarks = _serialize_landmark_list(result.pose_world_landmarks)
            mean_visibility, core_visibility = _visibility_summary(landmarks)
            body_box, edge_clipping = _body_box(landmarks)
            frames.append(
                PoseFrame(
                    frame_index=frame_index,
                    timestamp_seconds=timestamp_seconds,
                    landmarks=landmarks,
                    world_landmarks=world_landmarks,
                    mean_visibility=mean_visibility,
                    core_visibility=core_visibility,
                    brightness=brightness,
                    contrast=contrast,
                    blur_score=blur_score,
                    body_box=body_box,
                    edge_clipping=edge_clipping,
                    timestamp_source=timestamp_source,
                    source_width=int(frame.shape[1]),
                    source_height=int(frame.shape[0]),
                    orientation_auto_applied=orientation_auto_applied,
                )
            )
            frame_index += 1

    capture.release()
    return frames
