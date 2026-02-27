"""
rights_card_routes.py — API endpoint for Know Your Rights card generation
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.rights_card import generate_rights_card, SITUATIONS

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / Response models ────────────────────────────────────────────────

class RightsCardRequest(BaseModel):
    situation: str = Field(
        ...,
        description="One of: arrested, evicted, fired, cheated",
        examples=["arrested"],
    )
    language: str = Field(
        default="English",
        description="Target language for the card",
        examples=["English", "Hindi", "Kannada"],
    )
    location: str = Field(
        default="Bengaluru, Karnataka",
        description="User's location for jurisdiction context",
    )


class RightsCardResponse(BaseModel):
    title: str
    situation: str
    situation_summary: str
    icon: str
    language: str
    your_rights: list[str]
    they_cannot: list[str]
    do_next: list[str]
    emergency_contacts: list[str]
    relevant_laws: list[str]
    is_mock: Optional[bool] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/rights-card", response_model=RightsCardResponse)
async def create_rights_card(payload: RightsCardRequest) -> RightsCardResponse:
    """
    Generate a structured 'Know Your Rights' card based on the user's situation.
    Returns all sections needed to render a shareable one-page card.
    """
    logger.info(
        "Rights card request: situation=%s, language=%s, location=%s",
        payload.situation,
        payload.language,
        payload.location,
    )

    if payload.situation not in SITUATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid situation. Must be one of: {', '.join(SITUATIONS.keys())}",
        )

    card_data = generate_rights_card(
        situation=payload.situation,
        language=payload.language,
        location=payload.location,
    )

    if card_data.get("error"):
        raise HTTPException(status_code=500, detail=card_data.get("message", "Failed to generate card"))

    return RightsCardResponse(**card_data)


@router.get("/rights-card/situations")
async def list_situations() -> dict:
    """Return the list of available situations for the card generator."""
    return {
        "situations": [
            {"id": k, "label": v["label"], "icon": v["icon"]}
            for k, v in SITUATIONS.items()
        ]
    }
