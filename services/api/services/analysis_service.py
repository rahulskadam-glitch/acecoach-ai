from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from typing import Iterator

from analysis_engine.pipeline import AnalysisPipeline
from analysis_engine.contracts import AnalysisRequest


class AnalysisCapacityError(RuntimeError):
    """Raised when all configured analysis worker slots are occupied."""


class AnalysisService:
    def __init__(self) -> None:
        self.pipeline = AnalysisPipeline()
        capacity = max(1, int(os.getenv("ANALYSIS_MAX_CONCURRENT_JOBS", "1")))
        self._slots = threading.BoundedSemaphore(capacity)

    @contextmanager
    def _job_slot(self) -> Iterator[None]:
        acquired = self._slots.acquire(blocking=False)
        if not acquired:
            raise AnalysisCapacityError(
                "The analysis engine is busy. Wait for the current analysis to finish, then try again."
            )
        try:
            yield
        finally:
            self._slots.release()

    def run_pipeline(self, payload: AnalysisRequest) -> dict:
        with self._job_slot():
            return self.pipeline.analyze(payload)
