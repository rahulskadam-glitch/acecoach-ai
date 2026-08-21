from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from typing import Any
from threading import Lock
from urllib import error, parse, request

from models.context_safety import (
    CoachGrant,
    CoachGrantCreate,
    ConsentCreate,
    ConsentRecord,
    ModerationPrecheckResponse,
    PlayerProfile,
    PlayerProfileCreate,
    PlayerProfilePatch,
    ProgressSummary,
    ProgressTrend,
)


class ContextSafetyNotFoundError(KeyError):
    """Raised when a requested player or consent record does not exist."""


class ContextSafetyValidationError(ValueError):
    """Raised when business rules fail."""


class ContextSafetyStorageUnavailableError(RuntimeError):
    """Raised when persistent storage is not available in the current runtime."""


class _InMemoryContextSafetyStore:
    """In-memory store used as a safe fallback when persistent storage is unavailable."""

    _ADULT_AGE_BANDS = {"18_to_34", "35_to_54", "55_plus"}

    def __init__(self) -> None:
        self._lock = Lock()
        self._players: dict[str, PlayerProfile] = {}
        self._consents: dict[str, ConsentRecord] = {}
        self._coach_grants: dict[str, list[CoachGrant]] = {}
        self._progress_by_player: dict[str, list[ProgressTrend]] = {}

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(UTC)

    def _is_minor_age_band(self, age_band: str) -> bool:
        # Fail-closed: unknown or non-adult values are treated as minor.
        return age_band not in self._ADULT_AGE_BANDS

    def _ensure_minor_guardian(self, profile: PlayerProfile) -> None:
        if profile.is_minor and not profile.guardian_account_id:
            raise ContextSafetyValidationError(
                "guardian_account_id is required for minors (fail-closed policy)."
            )

    def create_player(self, payload: PlayerProfileCreate) -> PlayerProfile:
        with self._lock:
            if payload.player_id in self._players:
                raise ContextSafetyValidationError("player_id already exists")

            now = self._utc_now()
            profile = PlayerProfile(
                player_id=payload.player_id,
                age_band=payload.age_band,
                is_minor=self._is_minor_age_band(payload.age_band),
                player_level=payload.player_level,
                dominant_hand=payload.dominant_hand,
                backhand_style_declared=payload.backhand_style_declared,
                adaptive_play=payload.adaptive_play,
                coaching_relationship=payload.coaching_relationship,
                guardian_account_id=payload.guardian_account_id,
                preferred_language=payload.preferred_language,
                accessibility_preferences=payload.accessibility_preferences,
                created_at=now,
                updated_at=now,
            )
            self._ensure_minor_guardian(profile)
            self._players[profile.player_id] = profile
            return profile

    def get_player(self, player_id: str) -> PlayerProfile:
        with self._lock:
            profile = self._players.get(player_id)
            if profile is None:
                raise ContextSafetyNotFoundError("player profile not found")
            return profile

    def patch_player(self, player_id: str, payload: PlayerProfilePatch) -> PlayerProfile:
        with self._lock:
            current = self._players.get(player_id)
            if current is None:
                raise ContextSafetyNotFoundError("player profile not found")

            patch_data = payload.model_dump(exclude_unset=True)
            candidate = current.model_copy(update=patch_data)
            candidate = candidate.model_copy(
                update={
                    "is_minor": self._is_minor_age_band(candidate.age_band),
                    "updated_at": self._utc_now(),
                }
            )
            self._ensure_minor_guardian(candidate)
            self._players[player_id] = candidate
            return candidate

    def delete_player(self, player_id: str) -> None:
        with self._lock:
            if player_id not in self._players:
                raise ContextSafetyNotFoundError("player profile not found")
            self._players.pop(player_id, None)
            self._consents.pop(player_id, None)
            self._coach_grants.pop(player_id, None)
            self._progress_by_player.pop(player_id, None)

    def upsert_consent(self, player_id: str, payload: ConsentCreate, ontology_version: str) -> ConsentRecord:
        with self._lock:
            profile = self._players.get(player_id)
            if profile is None:
                raise ContextSafetyNotFoundError("player profile not found")
            if payload.player_id != player_id:
                raise ContextSafetyValidationError("payload.player_id must match path playerId")

            if profile.is_minor and payload.granted_by_role != "guardian":
                raise ContextSafetyValidationError("minor players require guardian consent")
            if not profile.is_minor and payload.granted_by_role != "self_adult":
                raise ContextSafetyValidationError("adult players require self_adult consent")

            record = ConsentRecord(
                consent_id=payload.consent_id,
                player_id=payload.player_id,
                granted_by_user_id=payload.granted_by_user_id,
                granted_by_role=payload.granted_by_role,
                scope=payload.scope,
                granted_at=payload.granted_at,
                revoked_at=payload.revoked_at,
                ontology_version_at_consent=ontology_version,
            )
            self._consents[player_id] = record
            return record

    def revoke_consent(self, player_id: str) -> ConsentRecord:
        with self._lock:
            profile = self._players.get(player_id)
            if profile is None:
                raise ContextSafetyNotFoundError("player profile not found")
            consent = self._consents.get(player_id)
            if consent is None:
                raise ContextSafetyNotFoundError("consent record not found")

            revoked = consent.model_copy(update={"revoked_at": self._utc_now()})
            self._consents[player_id] = revoked
            # Revoking consent invalidates coach grants.
            self._coach_grants[player_id] = []
            return revoked

    def create_coach_grant(self, player_id: str, payload: CoachGrantCreate) -> CoachGrant:
        with self._lock:
            profile = self._players.get(player_id)
            if profile is None:
                raise ContextSafetyNotFoundError("player profile not found")

            consent = self._consents.get(player_id)
            if consent is None or consent.revoked_at is not None:
                raise ContextSafetyValidationError("active consent is required before creating coach grants")
            if not consent.scope.coach_sharing:
                raise ContextSafetyValidationError("consent scope does not include coach_sharing")
            if payload.expires_at <= self._utc_now():
                raise ContextSafetyValidationError("expires_at must be in the future")

            grant = CoachGrant(
                player_id=player_id,
                coach_user_id=payload.coach_user_id,
                granted_at=self._utc_now(),
                expires_at=payload.expires_at,
            )
            grants = self._coach_grants.setdefault(player_id, [])
            grants.append(grant)
            return grant

    def moderation_precheck(self, source_video_hash: str) -> ModerationPrecheckResponse:
        # NOT a real content-safety scanner. source_video_hash is a SHA-256 hex digest
        # (see the ^[a-f0-9]{64}$ validation before this is called), so it can only ever
        # contain the characters 0-9a-f — none of blocked_tokens below are valid hex, so
        # this branch is structurally unreachable on any real upload. This function
        # currently provides no protection against harmful content and must not be
        # treated as trust-and-safety coverage. Real moderation (e.g. hash-matching
        # against a known-bad-content database, or a real scanning provider) is not yet
        # implemented — this is a placeholder for the response shape only.
        normalized = source_video_hash.strip().lower()
        blocked_tokens = ("csam", "ncii", "abuse", "explicit_minor")
        if any(token in normalized for token in blocked_tokens):
            return ModerationPrecheckResponse(
                precheck_status="blocked_safety_review",
                message="Upload blocked and queued for trust-and-safety review.",
            )
        if len(normalized) < 16:
            return ModerationPrecheckResponse(
                precheck_status="failed_benign_mismatch",
                message="This does not look like a valid analysis video hash. Please re-upload.",
            )
        return ModerationPrecheckResponse(
            precheck_status="passed",
            message="Precheck passed.",
        )

    def get_progress(self, player_id: str, fault_id: str | None) -> ProgressSummary:
        with self._lock:
            if player_id not in self._players:
                raise ContextSafetyNotFoundError("player profile not found")

            trends = list(self._progress_by_player.get(player_id, []))
            if fault_id is not None:
                trends = [trend for trend in trends if trend.fault_id == fault_id]
                if not trends:
                    trends = [
                        ProgressTrend(
                            fault_id=fault_id,
                            trend_status="insufficient_history",
                            headline="Need more comparable sessions to evaluate trend.",
                        )
                    ]

            return ProgressSummary(trends=trends)


class _SupabaseContextSafetyStore:
    """Supabase REST-backed store for context and safety entities."""

    _ADULT_AGE_BANDS = {"18_to_34", "35_to_54", "55_plus"}

    def __init__(self, base_url: str, service_role_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_role_key = service_role_key

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(UTC)

    def _is_minor_age_band(self, age_band: str) -> bool:
        return age_band not in self._ADULT_AGE_BANDS

    def _headers(self, *, include_content_type: bool = False, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self._service_role_key,
            "Authorization": f"Bearer {self._service_role_key}",
        }
        if include_content_type:
            headers["Content-Type"] = "application/json"
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, str] | None = None,
        body: dict[str, Any] | None = None,
        prefer: str | None = None,
    ) -> Any:
        endpoint = f"{self._base_url}/rest/v1/{path}"
        if query:
            endpoint = f"{endpoint}?{parse.urlencode(query)}"

        payload = None
        if body is not None:
            payload = json.dumps(body).encode("utf-8")

        req = request.Request(
            endpoint,
            data=payload,
            method=method,
            headers=self._headers(
                include_content_type=body is not None,
                prefer=prefer,
            ),
        )

        try:
            with request.urlopen(req, timeout=15) as response:
                raw = response.read().decode("utf-8")
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code in {404, 406} or "does not exist" in detail or "PGRST" in detail:
                raise ContextSafetyStorageUnavailableError(detail) from exc
            if exc.code == 409:
                raise ContextSafetyValidationError(detail or "Duplicate resource") from exc
            raise ContextSafetyValidationError(detail or f"Supabase request failed with HTTP {exc.code}") from exc
        except error.URLError as exc:
            raise ContextSafetyStorageUnavailableError(str(exc.reason)) from exc

        if not raw:
            return None
        return json.loads(raw)

    def _profile_from_row(self, row: dict[str, Any]) -> PlayerProfile:
        return PlayerProfile(
            player_id=str(row["player_id"]),
            age_band=row["age_band"],
            is_minor=bool(row["is_minor"]),
            player_level=row["player_level"],
            dominant_hand=row["dominant_hand"],
            backhand_style_declared=row.get("backhand_style_declared"),
            adaptive_play=row.get("adaptive_play") or "none",
            coaching_relationship=row["coaching_relationship"],
            guardian_account_id=row.get("guardian_account_id"),
            preferred_language=row["preferred_language"],
            accessibility_preferences=row.get("accessibility_preferences") or {},
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _consent_from_row(self, row: dict[str, Any]) -> ConsentRecord:
        return ConsentRecord(
            consent_id=str(row["consent_id"]),
            player_id=str(row["player_id"]),
            granted_by_user_id=str(row["granted_by_user_id"]),
            granted_by_role=row["granted_by_role"],
            scope={
                "video_capture_and_storage": bool(row.get("scope_video_capture_and_storage", False)),
                "ai_analysis": bool(row.get("scope_ai_analysis", False)),
                "coach_sharing": bool(row.get("scope_coach_sharing", False)),
                "model_improvement_use": bool(row.get("scope_model_improvement_use", False)),
            },
            granted_at=row["granted_at"],
            revoked_at=row.get("revoked_at"),
            ontology_version_at_consent=row["ontology_version_at_consent"],
        )

    def _get_profile_row(self, player_id: str) -> dict[str, Any]:
        rows = self._request(
            "GET",
            "player_profiles",
            query={
                "player_id": f"eq.{player_id}",
                "select": "*",
                "limit": "1",
            },
        )
        if not rows:
            raise ContextSafetyNotFoundError("player profile not found")
        return rows[0]

    def _get_active_consent_row(self, player_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "guardian_consent",
            query={
                "player_id": f"eq.{player_id}",
                "revoked_at": "is.null",
                "order": "granted_at.desc",
                "limit": "1",
                "select": "*",
            },
        )
        return rows[0] if rows else None

    def create_player(self, payload: PlayerProfileCreate) -> PlayerProfile:
        now = self._utc_now().isoformat()
        row = {
            "player_id": payload.player_id,
            "user_id": payload.player_id,
            "age_band": payload.age_band,
            "is_minor": self._is_minor_age_band(payload.age_band),
            "player_level": payload.player_level,
            "dominant_hand": payload.dominant_hand,
            "backhand_style_declared": payload.backhand_style_declared,
            "adaptive_play": payload.adaptive_play,
            "coaching_relationship": payload.coaching_relationship,
            "guardian_account_id": payload.guardian_account_id,
            "preferred_language": payload.preferred_language,
            "accessibility_preferences": payload.accessibility_preferences.model_dump(exclude_none=True),
            "updated_at": now,
        }
        if row["is_minor"] and not row["guardian_account_id"]:
            raise ContextSafetyValidationError(
                "guardian_account_id is required for minors (fail-closed policy)."
            )

        try:
            rows = self._request(
                "POST",
                "player_profiles",
                body=row,
                prefer="return=representation",
            )
        except ContextSafetyValidationError as exc:
            if "duplicate" in str(exc).lower() or "unique" in str(exc).lower():
                raise ContextSafetyValidationError("player_id already exists") from exc
            raise
        return self._profile_from_row(rows[0])

    def get_player(self, player_id: str) -> PlayerProfile:
        return self._profile_from_row(self._get_profile_row(player_id))

    def patch_player(self, player_id: str, payload: PlayerProfilePatch) -> PlayerProfile:
        current = self._get_profile_row(player_id)
        patch_data = payload.model_dump(exclude_unset=True)

        age_band = patch_data.get("age_band", current["age_band"])
        is_minor = self._is_minor_age_band(age_band)
        guardian_account_id = patch_data.get("guardian_account_id", current.get("guardian_account_id"))

        if is_minor and not guardian_account_id:
            raise ContextSafetyValidationError(
                "guardian_account_id is required for minors (fail-closed policy)."
            )

        row: dict[str, Any] = {
            "updated_at": self._utc_now().isoformat(),
            "is_minor": is_minor,
        }
        for key in (
            "age_band",
            "player_level",
            "dominant_hand",
            "backhand_style_declared",
            "adaptive_play",
            "coaching_relationship",
            "guardian_account_id",
            "preferred_language",
        ):
            if key in patch_data:
                row[key] = patch_data[key]

        if "accessibility_preferences" in patch_data and patch_data["accessibility_preferences"] is not None:
            row["accessibility_preferences"] = patch_data["accessibility_preferences"].model_dump(exclude_none=True)

        rows = self._request(
            "PATCH",
            "player_profiles",
            query={"player_id": f"eq.{player_id}", "select": "*"},
            body=row,
            prefer="return=representation",
        )
        if not rows:
            raise ContextSafetyNotFoundError("player profile not found")
        return self._profile_from_row(rows[0])

    def delete_player(self, player_id: str) -> None:
        rows = self._request(
            "DELETE",
            "player_profiles",
            query={"player_id": f"eq.{player_id}", "select": "player_id"},
            prefer="return=representation",
        )
        if not rows:
            raise ContextSafetyNotFoundError("player profile not found")

    def upsert_consent(self, player_id: str, payload: ConsentCreate, ontology_version: str) -> ConsentRecord:
        profile = self._profile_from_row(self._get_profile_row(player_id))
        if payload.player_id != player_id:
            raise ContextSafetyValidationError("payload.player_id must match path playerId")

        if profile.is_minor and payload.granted_by_role != "guardian":
            raise ContextSafetyValidationError("minor players require guardian consent")
        if not profile.is_minor and payload.granted_by_role != "self_adult":
            raise ContextSafetyValidationError("adult players require self_adult consent")

        active = self._get_active_consent_row(player_id)
        if active:
            self._request(
                "PATCH",
                "guardian_consent",
                query={"consent_id": f"eq.{active['consent_id']}"},
                body={"revoked_at": self._utc_now().isoformat()},
            )

        row = {
            "consent_id": payload.consent_id,
            "player_id": player_id,
            "granted_by_user_id": payload.granted_by_user_id,
            "granted_by_role": payload.granted_by_role,
            "scope_video_capture_and_storage": payload.scope.video_capture_and_storage,
            "scope_ai_analysis": payload.scope.ai_analysis,
            "scope_coach_sharing": payload.scope.coach_sharing,
            "scope_model_improvement_use": payload.scope.model_improvement_use,
            "ontology_version_at_consent": ontology_version,
            "granted_at": payload.granted_at.isoformat(),
            "revoked_at": payload.revoked_at.isoformat() if payload.revoked_at else None,
        }
        rows = self._request(
            "POST",
            "guardian_consent",
            body=row,
            prefer="return=representation",
        )
        return self._consent_from_row(rows[0])

    def revoke_consent(self, player_id: str) -> ConsentRecord:
        self._profile_from_row(self._get_profile_row(player_id))
        consent = self._get_active_consent_row(player_id)
        if consent is None:
            raise ContextSafetyNotFoundError("consent record not found")

        revoked_at = self._utc_now().isoformat()
        rows = self._request(
            "PATCH",
            "guardian_consent",
            query={"consent_id": f"eq.{consent['consent_id']}", "select": "*"},
            body={"revoked_at": revoked_at},
            prefer="return=representation",
        )
        self._request(
            "PATCH",
            "coach_access_grants",
            query={"player_id": f"eq.{player_id}", "revoked_at": "is.null"},
            body={"revoked_at": revoked_at},
        )
        return self._consent_from_row(rows[0])

    def create_coach_grant(self, player_id: str, payload: CoachGrantCreate) -> CoachGrant:
        self._profile_from_row(self._get_profile_row(player_id))
        consent = self._get_active_consent_row(player_id)
        if consent is None:
            raise ContextSafetyValidationError("active consent is required before creating coach grants")
        if not bool(consent.get("scope_coach_sharing")):
            raise ContextSafetyValidationError("consent scope does not include coach_sharing")
        if payload.expires_at <= self._utc_now():
            raise ContextSafetyValidationError("expires_at must be in the future")

        row = {
            "player_id": player_id,
            "coach_user_id": payload.coach_user_id,
            "granted_by_consent_id": consent["consent_id"],
            "granted_at": self._utc_now().isoformat(),
            "expires_at": payload.expires_at.isoformat(),
        }
        rows = self._request(
            "POST",
            "coach_access_grants",
            body=row,
            prefer="return=representation",
        )
        saved = rows[0]
        return CoachGrant(
            player_id=str(saved["player_id"]),
            coach_user_id=str(saved["coach_user_id"]),
            granted_at=saved["granted_at"],
            expires_at=saved["expires_at"],
        )

    def moderation_precheck(self, source_video_hash: str) -> ModerationPrecheckResponse:
        # NOT a real content-safety scanner. source_video_hash is a SHA-256 hex digest
        # (see the ^[a-f0-9]{64}$ validation before this is called), so it can only ever
        # contain the characters 0-9a-f — none of blocked_tokens below are valid hex, so
        # this branch is structurally unreachable on any real upload. This function
        # currently provides no protection against harmful content and must not be
        # treated as trust-and-safety coverage. Real moderation (e.g. hash-matching
        # against a known-bad-content database, or a real scanning provider) is not yet
        # implemented — this is a placeholder for the response shape only.
        normalized = source_video_hash.strip().lower()
        blocked_tokens = ("csam", "ncii", "abuse", "explicit_minor")
        if any(token in normalized for token in blocked_tokens):
            return ModerationPrecheckResponse(
                precheck_status="blocked_safety_review",
                message="Upload blocked and queued for trust-and-safety review.",
            )
        if len(normalized) < 16:
            return ModerationPrecheckResponse(
                precheck_status="failed_benign_mismatch",
                message="This does not look like a valid analysis video hash. Please re-upload.",
            )
        return ModerationPrecheckResponse(
            precheck_status="passed",
            message="Precheck passed.",
        )

    def get_progress(self, player_id: str, fault_id: str | None) -> ProgressSummary:
        self._profile_from_row(self._get_profile_row(player_id))

        query = {
            "player_id": f"eq.{player_id}",
            "select": "fault_id,trend_status",
            "order": "computed_at.desc",
        }
        if fault_id:
            query["fault_id"] = f"eq.{fault_id}"

        rows = self._request("GET", "progress_trends", query=query)
        trends = [
            ProgressTrend(
                fault_id=str(item["fault_id"]),
                trend_status=item["trend_status"],
                headline=f"{item['fault_id']}: {item['trend_status'].replace('_', ' ')}.",
            )
            for item in rows
        ]
        if fault_id and not trends:
            trends = [
                ProgressTrend(
                    fault_id=fault_id,
                    trend_status="insufficient_history",
                    headline="Need more comparable sessions to evaluate trend.",
                )
            ]
        return ProgressSummary(trends=trends)


class ContextSafetyService:
    """Context and safety service backed by Supabase when available.

    Falls back to in-memory storage when Supabase config or tables are missing,
    so local development remains functional before migrations are applied.
    """

    def __init__(self) -> None:
        self._memory = _InMemoryContextSafetyStore()
        self._persistent = self._build_persistent_store()

    @staticmethod
    def _build_persistent_store() -> _SupabaseContextSafetyStore | None:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not supabase_url or not service_role_key:
            return None
        return _SupabaseContextSafetyStore(supabase_url, service_role_key)

    def _with_fallback(self, method: str, *args: Any, **kwargs: Any) -> Any:
        if self._persistent is None:
            return getattr(self._memory, method)(*args, **kwargs)
        try:
            return getattr(self._persistent, method)(*args, **kwargs)
        except ContextSafetyStorageUnavailableError:
            return getattr(self._memory, method)(*args, **kwargs)

    def create_player(self, payload: PlayerProfileCreate) -> PlayerProfile:
        return self._with_fallback("create_player", payload)

    def get_player(self, player_id: str) -> PlayerProfile:
        return self._with_fallback("get_player", player_id)

    def patch_player(self, player_id: str, payload: PlayerProfilePatch) -> PlayerProfile:
        return self._with_fallback("patch_player", player_id, payload)

    def delete_player(self, player_id: str) -> None:
        self._with_fallback("delete_player", player_id)

    def upsert_consent(self, player_id: str, payload: ConsentCreate, ontology_version: str) -> ConsentRecord:
        return self._with_fallback("upsert_consent", player_id, payload, ontology_version)

    def revoke_consent(self, player_id: str) -> ConsentRecord:
        return self._with_fallback("revoke_consent", player_id)

    def create_coach_grant(self, player_id: str, payload: CoachGrantCreate) -> CoachGrant:
        return self._with_fallback("create_coach_grant", player_id, payload)

    def moderation_precheck(self, source_video_hash: str) -> ModerationPrecheckResponse:
        return self._with_fallback("moderation_precheck", source_video_hash)

    def get_progress(self, player_id: str, fault_id: str | None) -> ProgressSummary:
        return self._with_fallback("get_progress", player_id, fault_id)
