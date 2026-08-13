from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np

from .frame_types import PoseFrame
from .signal_analytics import detect_signal_peaks, smooth_signal

TEMPORAL_MODEL_VERSION = "robust-motion-segmentation-v0.4.0"


@dataclass(frozen=True)
class RepetitionWindow:
    index: int
    start_frame: int
    peak_frame: int
    end_frame: int
    peak_motion: float
    mean_visibility: float

    def as_dict(self, fps: float, frames: list[PoseFrame] | None = None) -> dict[str, float | int]:
        timestamp = lambda index: (
            float(frames[index].timestamp_seconds)
            if frames and 0 <= index < len(frames)
            else index / fps
        )
        return {
            "index": self.index,
            "startFrame": self.start_frame,
            "peakFrame": self.peak_frame,
            "endFrame": self.end_frame,
            "startSeconds": round(timestamp(self.start_frame), 4),
            "peakSeconds": round(timestamp(self.peak_frame), 4),
            "endSeconds": round(timestamp(self.end_frame), 4),
            "peakMotion": round(self.peak_motion, 6),
            "meanVisibility": round(self.mean_visibility, 4),
        }


def _point(frame: PoseFrame, name: str) -> np.ndarray | None:
    source = frame.world_landmarks or frame.landmarks
    item = source.get(name)
    if not item or float(item.get("visibility", 0.0)) < 0.40:
        return None
    dimensions = [float(item["x"]), float(item["y"])]
    if "z" in item:
        dimensions.append(float(item["z"]))
    return np.asarray(dimensions, dtype=np.float64)


def _velocity(points: list[np.ndarray | None], frames: list[PoseFrame], fps: float) -> np.ndarray:
    result = np.zeros(len(points), dtype=np.float64)
    for index in range(1, len(points)):
        previous = points[index - 1]
        current = points[index]
        if previous is None or current is None:
            continue
        delta_time = frames[index].timestamp_seconds - frames[index - 1].timestamp_seconds
        if delta_time <= 1e-6:
            delta_time = 1.0 / max(fps, 1.0)
        result[index] = float(np.linalg.norm(current - previous) / delta_time)
    return result


def _rolling_median(values: np.ndarray, window: int) -> np.ndarray:
    if len(values) == 0 or window <= 1:
        return values.copy()
    radius = window // 2
    padded = np.pad(values, (radius, radius), mode="edge")
    return np.asarray([
        float(np.median(padded[index:index + window]))
        for index in range(len(values))
    ], dtype=np.float64)


def _moving_average(values: np.ndarray, window: int) -> np.ndarray:
    if len(values) == 0 or window <= 1:
        return values.copy()
    kernel = np.ones(window, dtype=np.float64) / float(window)
    return np.convolve(values, kernel, mode="same")


def build_motion_signal(
    frames: list[PoseFrame],
    fps: float,
    dominant_side: str = "right",
) -> np.ndarray:
    """Build a deterministic, noise-resistant whole-chain motion signal.

    The signal uses wrist, elbow and shoulder velocities from pose-world coordinates
    when available. It is intentionally model-agnostic and does not classify the
    stroke by itself.
    """
    side = "left" if dominant_side.lower().startswith("left") else "right"
    other = "right" if side == "left" else "left"

    dominant_wrist = [_point(frame, f"{side}_wrist") for frame in frames]
    dominant_elbow = [_point(frame, f"{side}_elbow") for frame in frames]
    dominant_shoulder = [_point(frame, f"{side}_shoulder") for frame in frames]
    other_wrist = [_point(frame, f"{other}_wrist") for frame in frames]

    signal = (
        _velocity(dominant_wrist, frames, fps) * 0.50
        + _velocity(dominant_elbow, frames, fps) * 0.24
        + _velocity(dominant_shoulder, frames, fps) * 0.16
        + _velocity(other_wrist, frames, fps) * 0.10
    )

    return smooth_signal(signal, fps)


def _local_peaks(values: np.ndarray, threshold: float, min_distance: int) -> list[int]:
    candidates: list[int] = []
    for index in range(1, len(values) - 1):
        if values[index] < threshold:
            continue
        if values[index] >= values[index - 1] and values[index] > values[index + 1]:
            candidates.append(index)

    # Greedy non-maximum suppression keeps the stronger peak when strokes overlap.
    ranked = sorted(candidates, key=lambda index: (-values[index], index))
    selected: list[int] = []
    for index in ranked:
        if all(abs(index - chosen) >= min_distance for chosen in selected):
            selected.append(index)
    return sorted(selected)


def detect_repetitions(
    frames: list[PoseFrame],
    fps: float,
    dominant_side: str = "right",
    maximum_repetitions: int = 12,
) -> tuple[np.ndarray, list[RepetitionWindow]]:
    signal = build_motion_signal(frames, fps, dominant_side)
    if len(signal) < 8 or float(np.max(signal, initial=0.0)) <= 0:
        return signal, []

    positive = signal[signal > 0]
    if len(positive) == 0:
        return signal, []

    robust_high = float(np.percentile(positive, 78))
    robust_mid = float(np.percentile(positive, 55))
    threshold = max(robust_mid * 1.25, robust_high * 0.72)
    min_distance = max(4, int(round(fps * 0.38)))
    peaks = detect_signal_peaks(signal, fps, threshold)

    # A single clearly dominant movement is still a valid repetition.
    if not peaks:
        peak = int(np.argmax(signal))
        if signal[peak] >= robust_high:
            peaks = [peak]

    windows: list[RepetitionWindow] = []
    for peak in peaks[:maximum_repetitions]:
        peak_value = float(signal[peak])
        boundary = max(robust_mid * 0.65, peak_value * 0.18)
        left_limit = max(0, peak - int(round(fps * 1.4)))
        right_limit = min(len(signal) - 1, peak + int(round(fps * 1.4)))

        start = peak
        quiet_count = 0
        while start > left_limit:
            start -= 1
            quiet_count = quiet_count + 1 if signal[start] <= boundary else 0
            if quiet_count >= max(2, int(round(fps * 0.10))):
                start += quiet_count - 1
                break

        end = peak
        quiet_count = 0
        while end < right_limit:
            end += 1
            quiet_count = quiet_count + 1 if signal[end] <= boundary else 0
            if quiet_count >= max(2, int(round(fps * 0.12))):
                end -= quiet_count - 1
                break

        if end - start < max(5, int(round(fps * 0.20))):
            continue
        visibility = float(np.mean([frame.core_visibility for frame in frames[start:end + 1]]))
        windows.append(
            RepetitionWindow(
                index=len(windows),
                start_frame=start,
                peak_frame=peak,
                end_frame=end,
                peak_motion=peak_value,
                mean_visibility=visibility,
            )
        )

    # Merge near-duplicate overlapping windows generated by noisy double peaks.
    merged: list[RepetitionWindow] = []
    for window in windows:
        if merged and window.start_frame <= merged[-1].end_frame:
            previous = merged[-1]
            if window.peak_motion > previous.peak_motion:
                merged[-1] = RepetitionWindow(
                    index=previous.index,
                    start_frame=min(previous.start_frame, window.start_frame),
                    peak_frame=window.peak_frame,
                    end_frame=max(previous.end_frame, window.end_frame),
                    peak_motion=window.peak_motion,
                    mean_visibility=round((previous.mean_visibility + window.mean_visibility) / 2.0, 6),
                )
            else:
                merged[-1] = RepetitionWindow(
                    index=previous.index,
                    start_frame=min(previous.start_frame, window.start_frame),
                    peak_frame=previous.peak_frame,
                    end_frame=max(previous.end_frame, window.end_frame),
                    peak_motion=previous.peak_motion,
                    mean_visibility=round((previous.mean_visibility + window.mean_visibility) / 2.0, 6),
                )
        else:
            merged.append(window)

    return signal, [
        RepetitionWindow(
            index=index,
            start_frame=item.start_frame,
            peak_frame=item.peak_frame,
            end_frame=item.end_frame,
            peak_motion=item.peak_motion,
            mean_visibility=item.mean_visibility,
        )
        for index, item in enumerate(merged[:maximum_repetitions])
    ]


def coefficient_of_variation(values: Iterable[float]) -> float | None:
    items = np.asarray([float(value) for value in values], dtype=np.float64)
    if len(items) < 2:
        return None
    mean_value = float(np.mean(items))
    if abs(mean_value) <= 1e-9:
        return None
    return float(np.std(items) / abs(mean_value))
