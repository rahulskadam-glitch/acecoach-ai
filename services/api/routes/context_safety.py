from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from models.context_safety import (
    AcceptedResponse,
    CoachGrant,
    CoachGrantCreate,
    ConsentCreate,
    ConsentRecord,
    GenericMessage,
    ModerationPrecheckRequest,
    ModerationPrecheckResponse,
    PlayerProfile,
    PlayerProfileCreate,
    PlayerProfilePatch,
    ProgressSummary,
)
from security import require_api_key
from services.context_safety_service import (
    ContextSafetyNotFoundError,
    ContextSafetyService,
    ContextSafetyValidationError,
)

router = APIRouter(prefix="/v1", tags=["context-safety"], dependencies=[Depends(require_api_key)])
service = ContextSafetyService()


@router.post("/players", response_model=PlayerProfile, status_code=status.HTTP_201_CREATED)
def create_player(payload: PlayerProfileCreate) -> PlayerProfile:
    try:
        return service.create_player(payload)
    except ContextSafetyValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/players/{playerId}", response_model=PlayerProfile)
def get_player(playerId: str) -> PlayerProfile:
    try:
        return service.get_player(playerId)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.patch("/players/{playerId}", response_model=PlayerProfile)
def patch_player(playerId: str, payload: PlayerProfilePatch) -> PlayerProfile:
    try:
        return service.patch_player(playerId, payload)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ContextSafetyValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/players/{playerId}", response_model=AcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
def delete_player(playerId: str) -> AcceptedResponse:
    try:
        service.delete_player(playerId)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return AcceptedResponse(status="accepted", message="Player profile deletion accepted.")


@router.post("/players/{playerId}/consent", response_model=ConsentRecord, status_code=status.HTTP_201_CREATED)
def upsert_consent(playerId: str, payload: ConsentCreate, request: Request) -> ConsentRecord:
    try:
        ontology_version = getattr(request.app.state, "ontology_version", "unknown")
        return service.upsert_consent(playerId, payload, ontology_version=ontology_version)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ContextSafetyValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/players/{playerId}/consent", response_model=AcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
def revoke_consent(playerId: str) -> AcceptedResponse:
    try:
        service.revoke_consent(playerId)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return AcceptedResponse(status="accepted", message="Consent revoked and pending analysis should be cancelled.")


@router.post("/players/{playerId}/coach-grants", response_model=CoachGrant, status_code=status.HTTP_201_CREATED)
def create_coach_grant(playerId: str, payload: CoachGrantCreate) -> CoachGrant:
    try:
        return service.create_coach_grant(playerId, payload)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ContextSafetyValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/moderation/precheck", response_model=ModerationPrecheckResponse)
def moderation_precheck(payload: ModerationPrecheckRequest) -> ModerationPrecheckResponse:
    return service.moderation_precheck(payload.source_video_hash)


@router.get("/players/{playerId}/progress", response_model=ProgressSummary)
def get_progress(playerId: str, fault_id: str | None = Query(default=None)) -> ProgressSummary:
    try:
        return service.get_progress(playerId, fault_id=fault_id)
    except ContextSafetyNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/context-safety/health", response_model=GenericMessage)
def context_safety_health() -> GenericMessage:
    return GenericMessage(message="Context and safety endpoints are enabled.")
