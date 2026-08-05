from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PoseFrame:
    """Model-neutral pose observations for one decoded video frame.

    Keeping this contract independent of MediaPipe allows the biomechanics,
    temporal, and classification layers to be tested and later fed by other
    pose providers without importing a model runtime.
    """

    frame_index: int
    timestamp_seconds: float
    landmarks: dict[str, dict[str, float]]
    world_landmarks: dict[str, dict[str, float]]
    mean_visibility: float
    core_visibility: float
    brightness: float
    contrast: float
    blur_score: float
    body_box: dict[str, float] | None
    edge_clipping: bool
