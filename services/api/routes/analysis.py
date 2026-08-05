import logging

from fastapi import APIRouter, Depends, HTTPException

from models.analysis import AnalysisRequest, AnalysisResponse
from services.analysis_service import AnalysisCapacityError, AnalysisService
from security import require_api_key

router = APIRouter(prefix="/analysis", tags=["analysis"])
service = AnalysisService()
logger = logging.getLogger(__name__)


@router.post("", response_model=AnalysisResponse, status_code=200, dependencies=[Depends(require_api_key)])
def create_analysis(payload: AnalysisRequest) -> AnalysisResponse:
    try:
        return AnalysisResponse(**service.run_pipeline(payload))
    except AnalysisCapacityError as error:
        raise HTTPException(status_code=429, detail=str(error), headers={"Retry-After": "15"}) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        logger.exception("Analysis pipeline failed")
        raise HTTPException(status_code=500, detail=f"Analysis pipeline failed: {type(error).__name__}") from error
