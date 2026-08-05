from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
from scipy.signal import find_peaks, savgol_filter

SIGNAL_ANALYTICS_VERSION = "scipy-robust-signal-v0.1.0"


@dataclass(frozen=True)
class RobustDistribution:
    median: float
    q1: float
    q3: float
    iqr: float
    mad: float

    def as_dict(self) -> dict[str, float]:
        return {
            "median": round(self.median, 6),
            "q1": round(self.q1, 6),
            "q3": round(self.q3, 6),
            "iqr": round(self.iqr, 6),
            "mad": round(self.mad, 6),
        }


def robust_distribution(values: Iterable[float]) -> RobustDistribution | None:
    items = np.asarray([float(value) for value in values if np.isfinite(float(value))], dtype=np.float64)
    if len(items) == 0:
        return None
    median = float(np.median(items))
    q1 = float(np.percentile(items, 25))
    q3 = float(np.percentile(items, 75))
    mad = float(np.median(np.abs(items - median)))
    return RobustDistribution(median=median, q1=q1, q3=q3, iqr=q3 - q1, mad=mad)


def smooth_signal(values: np.ndarray, fps: float) -> np.ndarray:
    """Deterministic median + Savitzky-Golay smoothing.

    The window adapts to frame rate while remaining odd and bounded by the
    available signal length. This preserves peak timing better than a broad
    moving average while reducing pose jitter.
    """
    if len(values) < 5:
        return values.astype(np.float64, copy=True)
    median_window = max(3, int(round(fps * 0.07)) | 1)
    radius = median_window // 2
    padded = np.pad(values, (radius, radius), mode="edge")
    median_smoothed = np.asarray([
        float(np.median(padded[index:index + median_window]))
        for index in range(len(values))
    ], dtype=np.float64)

    desired = max(5, int(round(fps * 0.16)) | 1)
    maximum = len(median_smoothed) if len(median_smoothed) % 2 == 1 else len(median_smoothed) - 1
    window = min(desired, maximum)
    if window < 5:
        return median_smoothed
    polyorder = min(3, window - 2)
    return savgol_filter(median_smoothed, window_length=window, polyorder=polyorder, mode="interp")


def detect_signal_peaks(values: np.ndarray, fps: float, threshold: float) -> list[int]:
    if len(values) < 5:
        return []
    min_distance = max(4, int(round(fps * 0.38)))
    positive = values[values > 0]
    if len(positive) == 0:
        return []
    prominence = max(float(np.percentile(positive, 65)) * 0.18, float(np.max(positive)) * 0.06)
    peaks, properties = find_peaks(values, height=threshold, distance=min_distance, prominence=prominence)
    ranked = sorted(
        (int(index) for index in peaks),
        key=lambda index: (-float(properties["prominences"][list(peaks).index(index)]), index),
    )
    return sorted(ranked[:24])


def robust_outlier_indices(values: Iterable[float], z_threshold: float = 3.5) -> list[int]:
    items = np.asarray([float(value) for value in values], dtype=np.float64)
    if len(items) < 3:
        return []
    median = float(np.median(items))
    mad = float(np.median(np.abs(items - median)))
    if mad <= 1e-9:
        return []
    modified_z = 0.6745 * (items - median) / mad
    return [int(index) for index, value in enumerate(modified_z) if abs(float(value)) > z_threshold]
