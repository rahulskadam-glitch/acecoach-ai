from __future__ import annotations

import os
import socket
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from analysis_engine.contracts import AnalysisRequest
from analysis_engine.video import _validate_remote_url
from security import require_api_key


class SecurityBoundaryTests(unittest.TestCase):
    def test_analysis_api_requires_strong_key(self) -> None:
        with patch.dict(os.environ, {"ANALYSIS_API_KEY": ""}, clear=False):
            with self.assertRaises(HTTPException) as context:
                require_api_key(None)
            self.assertEqual(context.exception.status_code, 503)

        secret = "s" * 40
        with patch.dict(os.environ, {"ANALYSIS_API_KEY": secret}, clear=False):
            with self.assertRaises(HTTPException) as context:
                require_api_key("wrong")
            self.assertEqual(context.exception.status_code, 401)
            require_api_key(secret)

    def test_video_url_blocks_credentials_nonstandard_ports_and_private_networks(self) -> None:
        with patch.dict(os.environ, {"VIDEO_ALLOWED_HOSTS": "storage.example.com", "ALLOW_UNLISTED_VIDEO_HOSTS": "false"}, clear=False):
            with self.assertRaises(ValueError):
                _validate_remote_url("https://user:pass@storage.example.com/video.mp4")
            with self.assertRaises(ValueError):
                _validate_remote_url("https://storage.example.com:8443/video.mp4")
            with patch.object(socket, "getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]):
                with self.assertRaises(ValueError):
                    _validate_remote_url("https://storage.example.com/video.mp4")

    def test_video_url_requires_exact_allowlisted_storage_host(self) -> None:
        public_result = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]
        with patch.dict(os.environ, {"VIDEO_ALLOWED_HOSTS": "storage.example.com", "ALLOW_UNLISTED_VIDEO_HOSTS": "false"}, clear=False), patch.object(socket, "getaddrinfo", return_value=public_result):
            _validate_remote_url("https://storage.example.com/video.mp4")
            with self.assertRaises(ValueError):
                _validate_remote_url("https://attacker.example/video.mp4")
            with self.assertRaises(ValueError):
                _validate_remote_url("https://media.storage.example.com/video.mp4")

    def test_analysis_contract_rejects_non_uuid_identity(self) -> None:
        with self.assertRaises(ValidationError):
            AnalysisRequest(
                user_id="not-a-uuid",
                video_id="also-not-a-uuid",
                video_url="https://storage.example.com/video.mp4",
                video_name="clip.mp4",
                sport_id="tennis",
                action_type="forehand",
            )

    def test_analysis_contract_rejects_mislabeled_validated_outcomes(self) -> None:
        base = {
            "user_id": "11111111-1111-4111-8111-111111111111",
            "video_id": "22222222-2222-4222-8222-222222222222",
            "video_url": "https://storage.example.com/video.mp4",
            "video_name": "clip.mp4",
            "sport_id": "tennis",
            "action_type": "forehand",
        }
        with self.assertRaises(ValidationError):
            AnalysisRequest(**base, validated_outcomes=[{
                "repetition_index": 0,
                "outcome_source": "credentialed_coach",
                "validation_status": "tracker_verified",
                "execution_result": "success",
            }])

        request = AnalysisRequest(**base, validated_outcomes=[{
            "repetition_index": 0,
            "outcome_source": "credentialed_coach",
            "validation_status": "coach_verified",
            "execution_result": "success",
        }])
        self.assertEqual(len(request.validated_outcomes), 1)


if __name__ == "__main__":
    unittest.main()
