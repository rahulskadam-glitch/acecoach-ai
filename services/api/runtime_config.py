from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable


def _candidate_env_files() -> list[Path]:
    base_dir = Path(__file__).resolve().parents[2]
    candidates = [
        base_dir / ".env.local",
        base_dir / ".env",
    ]
    return [path for path in candidates if path.exists()]


def load_web_environment() -> None:
    for env_file in _candidate_env_files():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_web_environment()
