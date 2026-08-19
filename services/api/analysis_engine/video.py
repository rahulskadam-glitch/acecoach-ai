from __future__ import annotations

import hashlib
import ipaddress
import os
import socket
import ssl
import tempfile
import urllib.parse
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import cv2
import certifi

MAX_DOWNLOAD_BYTES = int(os.getenv("MAX_VIDEO_DOWNLOAD_BYTES", str(500 * 1024 * 1024)))
DOWNLOAD_TIMEOUT_SECONDS = int(os.getenv("VIDEO_DOWNLOAD_TIMEOUT_SECONDS", "90"))
MAX_ANALYSIS_SECONDS = float(os.getenv("MAX_ANALYSIS_SECONDS", "30"))
MAX_ANALYSIS_FRAMES = int(os.getenv("MAX_ANALYSIS_FRAMES", "3600"))
MAX_VIDEO_WIDTH = int(os.getenv("MAX_VIDEO_WIDTH", "3840"))
MAX_VIDEO_HEIGHT = int(os.getenv("MAX_VIDEO_HEIGHT", "2160"))
MAX_VIDEO_PIXELS = int(os.getenv("MAX_VIDEO_PIXELS", str(3840 * 2160)))


@dataclass(frozen=True)
class VideoMetadata:
    path: Path
    content_hash: str
    fps: float
    frame_count: int
    width: int
    height: int
    duration_seconds: float
    rotation_degrees: int = 0
    mirrored: bool = False


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


_TLS_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_NO_REDIRECT_OPENER = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=_TLS_CONTEXT),
    _NoRedirectHandler,
)
_REDIRECT_CODES = {301, 302, 303, 307, 308}
_MAX_REDIRECTS = 3


def _open_validated_url(url: str):  # type: ignore[no-untyped-def]
    current_url = url
    for _ in range(_MAX_REDIRECTS + 1):
        _validate_remote_url(current_url)
        request = urllib.request.Request(
            current_url,
            headers={"User-Agent": "AceCoach-Analysis/0.9.0"},
        )
        try:
            return _NO_REDIRECT_OPENER.open(request, timeout=DOWNLOAD_TIMEOUT_SECONDS)
        except urllib.error.HTTPError as error:
            if error.code not in _REDIRECT_CODES:
                raise
            location = error.headers.get("Location")
            error.close()
            if not location:
                raise ValueError("Video download redirect did not include a destination.") from error
            current_url = urllib.parse.urljoin(current_url, location)
    raise ValueError("Video download exceeded the safe redirect limit.")


def _validate_remote_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        raise ValueError("Video analysis only accepts secure HTTPS video URLs.")
    if not parsed.hostname:
        raise ValueError("Video URL has no valid host.")
    if parsed.username or parsed.password:
        raise ValueError("Video URLs with embedded credentials are not allowed.")
    if parsed.port not in (None, 443):
        raise ValueError("Video analysis only accepts the standard HTTPS port.")

    allowed = {host.strip().lower().rstrip(".") for host in os.getenv("VIDEO_ALLOWED_HOSTS", "").split(",") if host.strip()}
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    if supabase_url:
        try:
            sp_host = urllib.parse.urlparse(supabase_url).hostname
            if sp_host:
                allowed.add(sp_host.lower())
        except Exception:
            pass
    allowed.add("wkjbuitzqkoanwjyfzsy.supabase.co")

    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    hostname = parsed.hostname.lower()
    allow_unlisted = os.getenv("ALLOW_UNLISTED_VIDEO_HOSTS", "false").strip().lower() == "true"
    if allowed and hostname not in allowed and not allow_unlisted:
        raise ValueError(f"Video URL host '{hostname}' is not in the configured allowlist.")

    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM)}
    except socket.gaierror as error:
        raise ValueError("Video URL host could not be resolved.") from error
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise ValueError("Video URL resolves to a non-public network address.")


def download_video(url: str, expected_hash: str | None = None) -> VideoMetadata:
    _validate_remote_url(url)
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower() or ".mp4"
    if suffix not in {".mp4", ".mov", ".m4v", ".webm"}:
        suffix = ".mp4"

    temp = tempfile.NamedTemporaryFile(prefix="acecoach-", suffix=suffix, delete=False)
    sha256 = hashlib.sha256()
    downloaded = 0
    try:
        with _open_validated_url(url) as response, temp:
            content_type = (response.headers.get("Content-Type") or "").lower()
            if content_type and not (content_type.startswith("video/") or content_type == "application/octet-stream"):
                raise ValueError("Remote file did not return a supported video content type.")
            declared_length = response.headers.get("Content-Length")
            if declared_length and int(declared_length) > MAX_DOWNLOAD_BYTES:
                raise ValueError("Video exceeds the configured analysis download limit.")
            while chunk := response.read(1024 * 1024):
                downloaded += len(chunk)
                if downloaded > MAX_DOWNLOAD_BYTES:
                    raise ValueError("Video exceeds the configured analysis download limit.")
                sha256.update(chunk)
                temp.write(chunk)
    except Exception:
        Path(temp.name).unlink(missing_ok=True)
        raise

    content_hash = sha256.hexdigest()
    if expected_hash and expected_hash.lower() != content_hash:
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError("Downloaded video content hash does not match the expected hash.")

    capture = cv2.VideoCapture(temp.name)
    if not capture.isOpened():
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError("The uploaded file could not be opened as a video.")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    orientation_property = getattr(cv2, "CAP_PROP_ORIENTATION_META", None)
    rotation_degrees = int(round(float(capture.get(orientation_property) or 0.0))) if orientation_property is not None else 0
    rotation_degrees = rotation_degrees % 360 if rotation_degrees in {0, 90, 180, 270, -90, -180, -270} else 0
    capture.release()

    if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError("Video metadata is incomplete or invalid.")

    duration_seconds = frame_count / fps
    if duration_seconds > MAX_ANALYSIS_SECONDS:
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError(f"Analysis clips must be {MAX_ANALYSIS_SECONDS:g} seconds or shorter in this release.")
    if frame_count > MAX_ANALYSIS_FRAMES:
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError(
            f"The clip contains {frame_count} frames; the current safe limit is {MAX_ANALYSIS_FRAMES}. "
            "Trim the clip or lower its frame rate."
        )
    if width < 480 or height < 360:
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError("Video resolution is too low for reliable pose analysis. Use at least 480×360.")
    if width > MAX_VIDEO_WIDTH or height > MAX_VIDEO_HEIGHT or width * height > MAX_VIDEO_PIXELS:
        Path(temp.name).unlink(missing_ok=True)
        raise ValueError(
            f"Video resolution exceeds the safe analysis limit of {MAX_VIDEO_WIDTH}×{MAX_VIDEO_HEIGHT}. "
            "Export a smaller clip before analysis."
        )

    return VideoMetadata(
        path=Path(temp.name),
        content_hash=content_hash,
        fps=round(fps, 6),
        frame_count=frame_count,
        width=width,
        height=height,
        duration_seconds=round(duration_seconds, 4),
        rotation_degrees=rotation_degrees,
        mirrored=False,
    )
