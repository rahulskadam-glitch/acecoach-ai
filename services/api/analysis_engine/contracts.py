from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator


class AnalysisRequest(BaseModel):
    user_id: UUID
    video_id: UUID
    video_url: HttpUrl
    video_name: str = Field(..., min_length=1, max_length=255)
    sport_id: str = Field(default="tennis", min_length=1, max_length=64, pattern=r"^[a-z0-9_]+$")
    action_type: str = Field(default="forehand", min_length=1, max_length=64, pattern=r"^[a-z0-9_]+$")
    confirmed_action_type: str | None = Field(default=None, max_length=64, pattern=r"^[a-z0-9_]+$")
    expected_content_hash: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    age_band: str | None = Field(default=None, max_length=32)
    playing_level: str | None = Field(default=None, max_length=80)
    dominant_side: str | None = Field(default=None, max_length=32)
    primary_goal: str | None = Field(default=None, max_length=200)
    camera_angle: str | None = Field(default=None, max_length=32)
    shot_situation: str | None = Field(default=None, max_length=64)
    shot_intent: str | None = Field(default=None, max_length=64)
    athlete_question: str | None = Field(default=None, max_length=500)
    height_cm: float | None = Field(default=None, ge=80, le=230)

    @field_validator("video_name")
    @classmethod
    def clean_video_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("video_name cannot be blank")
        return cleaned

    @field_validator(
        "confirmed_action_type",
        "age_band",
        "playing_level",
        "dominant_side",
        "primary_goal",
        "camera_angle",
        "shot_situation",
        "shot_intent",
        "athlete_question",
    )
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AnalysisResponse(BaseModel):
    input_fingerprint: str = Field(..., pattern=r"^[a-fA-F0-9]{64}$")
    content_hash: str = Field(..., pattern=r"^[a-fA-F0-9]{64}$")
    overall_score: int | None = Field(default=None, ge=0, le=100)
    score_status: str
    score_label: str
    confidence: float = Field(..., ge=0, le=1)
    capture_quality: dict[str, Any]
    phase_scores: list[dict[str, Any]]
    metric_scores: list[dict[str, Any]]
    strengths: list[dict[str, Any]]
    priorities: list[dict[str, Any]]
    drills: list[dict[str, Any]]
    next_session: dict[str, Any]
    coach_summary: dict[str, Any]
    performance_story: dict[str, Any]
    visual_moments: list[dict[str, Any]]
    measurement_coverage: dict[str, Any]
    practice_plan: dict[str, Any]
    coaching_playbook: dict[str, Any]
    repetition_insights: dict[str, Any]
    evidence: list[dict[str, Any]]
    safety_note: str
    limitations: list[str]
    engine_manifest: dict[str, Any]
    frame_summary: dict[str, Any]
    movement_timeline: list[dict[str, Any]]
    repetitions: list[dict[str, Any]]
    movement_classification: dict[str, Any]
    coaching_areas: list[dict[str, Any]]
    reference_comparison: dict[str, Any]
    quality_gate: dict[str, Any]
