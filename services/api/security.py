from __future__ import annotations

import hmac
import os

from fastapi import Header, HTTPException


def require_api_key(x_analysis_api_key: str | None = Header(default=None)) -> None:
    """Require a strong shared secret for every analysis execution request."""
    expected = os.getenv("ANALYSIS_API_KEY", "").strip()
    if len(expected) < 32:
        raise HTTPException(
            status_code=503,
            detail="ANALYSIS_API_KEY must be configured with at least 32 characters.",
        )
    if not x_analysis_api_key or not hmac.compare_digest(x_analysis_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing analysis API key.")
