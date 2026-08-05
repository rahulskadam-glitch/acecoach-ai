from __future__ import annotations

import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import patch

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.context_safety import CoachGrantCreate, ConsentCreate, PlayerProfileCreate
from services.context_safety_service import (
    ContextSafetyService,
    ContextSafetyStorageUnavailableError,
    ContextSafetyValidationError,
    _SupabaseContextSafetyStore,
)


class ContextSafetyServiceTests(unittest.TestCase):
    def test_in_memory_mode_without_supabase_env(self) -> None:
        with patch.dict("os.environ", {"NEXT_PUBLIC_SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""}, clear=False):
            service = ContextSafetyService()
            created = service.create_player(
                PlayerProfileCreate(
                    player_id="11111111-1111-1111-1111-111111111111",
                    age_band="18_to_34",
                    player_level="improver",
                    dominant_hand="right",
                    coaching_relationship="self_directed",
                    preferred_language="en-IN",
                )
            )

            loaded = service.get_player("11111111-1111-1111-1111-111111111111")

            self.assertEqual(created.player_id, loaded.player_id)
            self.assertFalse(created.is_minor)

    def test_minor_requires_guardian_fail_closed(self) -> None:
        with patch.dict("os.environ", {"NEXT_PUBLIC_SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""}, clear=False):
            service = ContextSafetyService()
            with self.assertRaises(ContextSafetyValidationError):
                service.create_player(
                    PlayerProfileCreate(
                        player_id="22222222-2222-2222-2222-222222222222",
                        age_band="13_to_15",
                        player_level="junior_tournament",
                        dominant_hand="left",
                        coaching_relationship="self_directed",
                        preferred_language="en-IN",
                    )
                )

    def test_consent_and_grants_revoke_path(self) -> None:
        with patch.dict("os.environ", {"NEXT_PUBLIC_SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""}, clear=False):
            service = ContextSafetyService()
            player = service.create_player(
                PlayerProfileCreate(
                    player_id="33333333-3333-3333-3333-333333333333",
                    age_band="13_to_15",
                    player_level="junior_tournament",
                    dominant_hand="right",
                    coaching_relationship="linked_to_coach",
                    guardian_account_id="33333333-3333-3333-3333-333333333333",
                    preferred_language="en-IN",
                )
            )

            service.upsert_consent(
                player.player_id,
                ConsentCreate(
                    consent_id="c-33333333-3333-3333-3333-333333333333",
                    player_id=player.player_id,
                    granted_by_user_id=player.player_id,
                    granted_by_role="guardian",
                    scope={
                        "video_capture_and_storage": True,
                        "ai_analysis": True,
                        "coach_sharing": True,
                        "model_improvement_use": False,
                    },
                    granted_at=datetime.now(UTC),
                    ontology_version_at_consent="2.2.0",
                ),
                ontology_version="2.2.0",
            )

            grant = service.create_coach_grant(
                player.player_id,
                CoachGrantCreate(
                    coach_user_id="44444444-4444-4444-4444-444444444444",
                    expires_at=datetime.now(UTC) + timedelta(days=7),
                ),
            )
            self.assertEqual(grant.player_id, player.player_id)

            service.revoke_consent(player.player_id)

            with self.assertRaises(ContextSafetyValidationError):
                service.create_coach_grant(
                    player.player_id,
                    CoachGrantCreate(
                        coach_user_id="55555555-5555-5555-5555-555555555555",
                        expires_at=datetime.now(UTC) + timedelta(days=7),
                    ),
                )

    def test_fallback_to_memory_when_persistent_store_unavailable(self) -> None:
        with patch.dict(
            "os.environ",
            {
                "NEXT_PUBLIC_SUPABASE_URL": "https://example.supabase.co",
                "SUPABASE_SERVICE_ROLE_KEY": "dummy-key",
            },
            clear=False,
        ):
            with patch.object(
                _SupabaseContextSafetyStore,
                "create_player",
                side_effect=ContextSafetyStorageUnavailableError("table missing"),
            ):
                service = ContextSafetyService()
                created = service.create_player(
                    PlayerProfileCreate(
                        player_id="66666666-6666-6666-6666-666666666666",
                        age_band="18_to_34",
                        player_level="improver",
                        dominant_hand="right",
                        coaching_relationship="self_directed",
                        preferred_language="en-IN",
                    )
                )
                self.assertEqual(created.player_id, "66666666-6666-6666-6666-666666666666")


if __name__ == "__main__":
    unittest.main()
