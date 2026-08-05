from __future__ import annotations

import hashlib
import importlib.util
import os
import ssl
import tempfile
import urllib.request
from pathlib import Path

import certifi


POSE_MODEL_NAME = "pose_landmark_heavy.tflite"
POSE_MODEL_URL = f"https://storage.googleapis.com/mediapipe-assets/{POSE_MODEL_NAME}"
POSE_MODEL_SHA256 = "59e42d71bcd44cbdbabc419f0ff76686595fd265419566bd4009ef703ea8e1fe"
MAX_MODEL_BYTES = 100 * 1024 * 1024


def configure_tls() -> None:
    """Give urllib a maintained CA bundle on Python installations without one."""
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())


def _model_path() -> Path:
    spec = importlib.util.find_spec("mediapipe")
    if spec is None or not spec.submodule_search_locations:
        raise RuntimeError("MediaPipe is not installed in the analysis environment.")
    package_root = Path(next(iter(spec.submodule_search_locations)))
    return package_root / "modules" / "pose_landmark" / POSE_MODEL_NAME


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_pose_model() -> Path:
    """Download the heavy pose model atomically and verify its published bytes."""
    configure_tls()
    target = _model_path()
    if target.is_file() and _sha256(target) == POSE_MODEL_SHA256:
        print(f"Analysis pose model ready: {target}")
        return target

    target.parent.mkdir(parents=True, exist_ok=True)
    context = ssl.create_default_context(cafile=certifi.where())
    request = urllib.request.Request(
        POSE_MODEL_URL,
        headers={"User-Agent": "AceCoach-Analysis-Setup/0.9.0"},
    )
    temporary_path: Path | None = None
    try:
        with urllib.request.urlopen(request, context=context, timeout=120) as response:
            declared_length = int(response.headers.get("Content-Length", "0"))
            if declared_length and declared_length > MAX_MODEL_BYTES:
                raise RuntimeError("Pose model exceeded the expected download size.")
            with tempfile.NamedTemporaryFile(
                dir=target.parent,
                prefix="pose-heavy-",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary_path = Path(temporary.name)
                downloaded = 0
                while chunk := response.read(1024 * 1024):
                    downloaded += len(chunk)
                    if downloaded > MAX_MODEL_BYTES:
                        raise RuntimeError("Pose model exceeded the expected download size.")
                    temporary.write(chunk)

        if temporary_path is None or _sha256(temporary_path) != POSE_MODEL_SHA256:
            raise RuntimeError("Pose model checksum verification failed.")
        os.replace(temporary_path, target)
        temporary_path = None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

    print(f"Analysis pose model installed: {target}")
    return target


if __name__ == "__main__":
    ensure_pose_model()
