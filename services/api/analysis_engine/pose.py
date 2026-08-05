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
    frames: list[PoseFrame] = []

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
                    timestamp_seconds=round(frame_index / metadata.fps, 6),
                    landmarks=landmarks,
                    world_landmarks=world_landmarks,
                    mean_visibility=mean_visibility,
                    core_visibility=core_visibility,
                    brightness=brightness,
                    contrast=contrast,
                    blur_score=blur_score,
                    body_box=body_box,
                    edge_clipping=edge_clipping,
                )
            )
            frame_index += 1

    capture.release()
    return frames
