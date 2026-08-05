from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

AgeBand = Literal[
    "u10",
    "10_to_12",
    "13_to_15",
    "16_to_17",
    "18_to_34",
    "35_to_54",
    "55_plus",
    "prefer_not_to_say",
]

PlayerLevel = Literal[
    "new_to_tennis",
    "improver",
    "club_competitive",
    "junior_tournament",
    "adult_league",
    "high_performance_academy",
]

DominantHand = Literal["right", "left", "unknown"]
BackhandStyle = Literal["one_handed", "two_handed", "slice_primary", "not_sure_let_engine_infer"]
AdaptivePlay = Literal["none", "wheelchair_tennis", "visual_impairment_adapted", "other_adaptive"]
CoachingRelationship = Literal["self_directed", "linked_to_coach", "linked_to_academy"]
GrantedByRole = Literal["self_adult", "guardian"]
ConsentStatus = Literal[
    "not_required_adult_self_consent",
    "guardian_consent_active",
    "guardian_consent_missing_blocked",
]
TrendStatus = Literal["improving", "steady", "recurring", "insufficient_history"]
PrecheckStatus = Literal["passed", "failed_benign_mismatch", "blocked_safety_review"]


class AccessibilityPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reduce_motion: bool | None = None
    high_contrast_overlay: bool | None = None
    captions_default_on: bool | None = None
    font_scale: Literal["100%", "125%", "150%", "200%"] | None = None
    dyslexia_friendly_font: bool | None = None


class PlayerProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    player_id: str
    age_band: AgeBand
    player_level: PlayerLevel
    dominant_hand: DominantHand
    backhand_style_declared: BackhandStyle | None = None
    adaptive_play: AdaptivePlay = "none"
    coaching_relationship: CoachingRelationship
    guardian_account_id: str | None = None
    preferred_language: str = Field(min_length=2)
    accessibility_preferences: AccessibilityPreferences = Field(default_factory=AccessibilityPreferences)


class PlayerProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age_band: AgeBand | None = None
    player_level: PlayerLevel | None = None
    dominant_hand: DominantHand | None = None
    backhand_style_declared: BackhandStyle | None = None
    adaptive_play: AdaptivePlay | None = None
    coaching_relationship: CoachingRelationship | None = None
    guardian_account_id: str | None = None
    preferred_language: str | None = Field(default=None, min_length=2)
    accessibility_preferences: AccessibilityPreferences | None = None


class PlayerProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    player_id: str
    age_band: AgeBand
    is_minor: bool
    player_level: PlayerLevel
    dominant_hand: DominantHand
    backhand_style_declared: BackhandStyle | None = None
    adaptive_play: AdaptivePlay = "none"
    coaching_relationship: CoachingRelationship
    guardian_account_id: str | None = None
    preferred_language: str
    accessibility_preferences: AccessibilityPreferences
    created_at: datetime
    updated_at: datetime


class ConsentScope(BaseModel):
    model_config = ConfigDict(extra="forbid", protected_namespaces=())

    video_capture_and_storage: bool
    ai_analysis: bool
    coach_sharing: bool
    model_improvement_use: bool = False


class ConsentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    consent_id: str
    player_id: str
    granted_by_user_id: str
    granted_by_role: GrantedByRole
    scope: ConsentScope
    granted_at: datetime
    revoked_at: datetime | None = None
    ontology_version_at_consent: str


class ConsentRecord(ConsentCreate):
    pass


class CoachGrantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coach_user_id: str
    expires_at: datetime


class CoachGrant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    player_id: str
    coach_user_id: str
    granted_at: datetime
    expires_at: datetime


class ModerationPrecheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_video_hash: str = Field(min_length=8)


class ModerationPrecheckResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    precheck_status: PrecheckStatus
    message: str


class ProgressTrend(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fault_id: str
    trend_status: TrendStatus
    headline: str


class ProgressSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trends: list[ProgressTrend]


class AcceptedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["accepted"]
    message: str


class GenericMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    details: dict[str, Any] | None = None
