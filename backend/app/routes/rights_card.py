"""
rights_card.py — API endpoints for the Rights Card generator
"""
import logging
from typing import List

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.services.aws.rights_card import generate_rights_card

logger = logging.getLogger(__name__)

router = APIRouter()

class RightsCardRequest(BaseModel):
    situation: str = Field(..., description="The context/situation (e.g., 'Arrested by Police', 'Evicted without notice')")
    language: str = Field(default="English", description="The requested language for the output")

class RightsCardResponse(BaseModel):
    title: str
    entitlements: List[str]
    can_do: List[str]
    cannot_do: List[str]
    next_steps: List[str]

@router.post("/rights-card", response_model=RightsCardResponse)
async def create_rights_card(payload: RightsCardRequest) -> RightsCardResponse:
    """
    Generate a highly structured 'Know Your Rights' card using AWS Bedrock.
    Provides legal entitlements, authority limitations, and actionable next steps.
    """
    if not payload.situation.strip():
        raise HTTPException(status_code=400, detail="Situation cannot be empty")
        
    logger.info("Generating rights card for situation: '%s' in %s", payload.situation, payload.language)
    
    try:
        data = generate_rights_card(situation=payload.situation, language=payload.language)
        return RightsCardResponse(**data)
    except Exception as e:
        logger.exception("Error generating rights card: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate rights card")
