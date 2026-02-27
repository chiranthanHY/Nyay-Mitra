"""
whatsapp.py — Twilio WhatsApp webhook + /api/chat JSON endpoint
"""
import logging
from typing import Optional

from fastapi import APIRouter, Form, Request, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from twilio.twiml.messaging_response import MessagingResponse

from app.services.helpers import (
    resolve_location,
    detect_legal_category,
    find_lawyers,
    format_lawyer_suggestions,
    format_disclaimer,
)
from app.services.aws.bedrock import invoke_bedrock
from app.services.aws.transcribe import transcribe_audio
from app.services.aws.textract import extract_document_text
from app.services.aws.translate import detect_language, translate_to_english

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Constants ────────────────────────────────────────────────────────────────

WELCOME_MESSAGE = (
    "🙏 *Welcome to NyayMitra — आपका कानूनी साथी!*\n\n"
    "I can help you understand your legal rights in India.\n\n"
    "💬 *How to use:*\n"
    "• Send your legal question in text\n"
    "• Share your location for local lawyer suggestions\n"
    "• Send a voice note and I'll transcribe it\n"
    "• Send a photo of a legal document for analysis\n\n"
    "📍 Please share your city/area so I can give you relevant advice.\n\n"
    "_Example: 'My landlord won't return my deposit. I'm in Koramangala, Bengaluru.'_"
)

HELP_KEYWORDS = {"hi", "hello", "start", "help", "namaste", "ನಮಸ್ಕಾರ", "नमस्ते"}


# ─── Twilio WhatsApp Webhook ──────────────────────────────────────────────────

@router.post("/whatsapp", response_class=PlainTextResponse)
async def whatsapp_webhook(
    request: Request,
    From: str = Form(default=""),
    Body: str = Form(default=""),
    NumMedia: str = Form(default="0"),
    MediaUrl0: Optional[str] = Form(default=None),
    MediaContentType0: Optional[str] = Form(default=None),
    Latitude: Optional[str] = Form(default=None),
    Longitude: Optional[str] = Form(default=None),
    Address: Optional[str] = Form(default=None),
    ProfileName: Optional[str] = Form(default=""),
) -> PlainTextResponse:
    """
    Twilio WhatsApp Sandbox webhook endpoint.
    Receives messages and returns TwiML MessagingResponse XML.
    """
    logger.info(
        "WhatsApp webhook: From=%s, Body=%.80s, NumMedia=%s, ContentType=%s",
        From,
        Body,
        NumMedia,
        MediaContentType0,
    )

    try:
        reply_text = await _process_message(
            sender=From,
            body=Body,
            num_media=int(NumMedia or 0),
            media_url=MediaUrl0,
            media_content_type=MediaContentType0,
            latitude=Latitude,
            longitude=Longitude,
            address=Address,
            profile_name=ProfileName,
        )
    except Exception as e:
        logger.exception("Error processing WhatsApp message: %s", e)
        reply_text = (
            "⚠️ Sorry, I encountered an error processing your message. "
            "Please try again or rephrase your query.\n\n"
            "📞 For urgent legal help: *NALSA Toll-Free: 15100*"
        )

    # Build TwiML response
    twiml = MessagingResponse()
    twiml.message(reply_text)
    return PlainTextResponse(content=str(twiml), media_type="application/xml")


# ─── JSON Chat Endpoint (for web frontend) ───────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    location: str = "Bengaluru, Karnataka"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    category: Optional[str] = None
    location_resolved: str
    lawyers_suggested: bool = False


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    """
    JSON API endpoint for the web frontend chat interface.
    """
    logger.info("Chat API: message=%.80s, location=%s", payload.message, payload.location)

    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    location_data = resolve_location(payload.location)
    category = detect_legal_category(payload.message)
    lawyers = find_lawyers(category=category, limit=3) if category else []

    advice = invoke_bedrock(
        query=payload.message,
        location=location_data["display"],
        category=category,
    )

    lawyer_text = format_lawyer_suggestions(lawyers) if lawyers else ""
    disclaimer = format_disclaimer()
    full_reply = f"{advice}{lawyer_text}{disclaimer}"

    return ChatResponse(
        reply=full_reply,
        category=category,
        location_resolved=location_data["display"],
        lawyers_suggested=bool(lawyers),
    )


# ─── Health Check ─────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": "NyayMitra API", "version": "1.0.0"}


# ─── Internal message processing ─────────────────────────────────────────────

async def _process_message(
    sender: str,
    body: str,
    num_media: int,
    media_url: Optional[str],
    media_content_type: Optional[str],
    latitude: Optional[str],
    longitude: Optional[str],
    address: Optional[str],
    profile_name: str,
) -> str:
    """Core message routing logic."""

    # Greeting / help trigger
    body_stripped = body.strip()
    if not body_stripped and num_media == 0:
        return WELCOME_MESSAGE

    if body_stripped.lower() in HELP_KEYWORDS:
        return WELCOME_MESSAGE

    # ── Shared Location ───────────────────────────────────────────────────────
    if latitude and longitude:
        loc_text = address or f"GPS: {latitude},{longitude}"
        logger.info("User shared location: %s", loc_text)
        return (
            f"📍 *Location noted:* {loc_text}\n\n"
            "Now please send your legal question and I'll provide advice "
            "relevant to your area along with local lawyer contacts."
        )

    # ── Resolve location from message text ───────────────────────────────────
    location_data = resolve_location(body_stripped)

    # ── Voice message ─────────────────────────────────────────────────────────
    if num_media > 0 and media_content_type and media_content_type.startswith("audio/"):
        logger.info("Processing voice message from %s", sender)
        transcription = transcribe_audio(audio_url=media_url or "", language_code="en-IN")
        transcribed_text = transcription["transcript"]

        mock_note = ""
        if transcription.get("is_mock"):
            mock_note = "\n_(🎙️ Voice transcription simulated for demo)_\n"

        query_text = f"[Voice message transcribed]: {transcribed_text}"
        return await _generate_legal_reply(
            query=transcribed_text,
            location_data=location_data,
            prefix=f"🎙️ *I heard you say:*\n_{transcribed_text}_{mock_note}\n\n",
        )

    # ── Document/Image ────────────────────────────────────────────────────────
    if num_media > 0 and media_content_type and media_content_type.startswith("image/"):
        logger.info("Processing document image from %s", sender)
        extraction = await extract_document_text(image_url=media_url or "")
        extracted_text = extraction["extracted_text"]
        doc_type = extraction["document_type"]

        mock_note = "\n_(📄 OCR simulated for demo)_\n" if extraction.get("is_mock") else ""
        query = f"I have a {doc_type}. Here are the details: {extracted_text}. What are my rights and options?"

        return await _generate_legal_reply(
            query=query,
            location_data=location_data,
            prefix=(
                f"📄 *Document detected: {doc_type}*{mock_note}\n"
                f"_Key details extracted:_\n```{extracted_text[:300]}...```\n\n"
            ),
        )

    # ── Plain text ────────────────────────────────────────────────────────────
    # Detect + handle non-English
    detected_lang = detect_language(body_stripped)
    translated = translate_to_english(body_stripped, detected_lang)
    query_text = translated["translated_text"]

    lang_note = ""
    if detected_lang != "en" and translated.get("is_mock"):
        lang_note = f"_(Language detected: {detected_lang} — translation simulated)_\n\n"

    return await _generate_legal_reply(
        query=query_text,
        location_data=location_data,
        prefix=lang_note,
    )


async def _generate_legal_reply(
    query: str,
    location_data: dict,
    prefix: str = "",
) -> str:
    """Generate the full legal advice reply."""
    category = detect_legal_category(query)
    lawyers = find_lawyers(category=category, limit=3) if category else []

    advice = invoke_bedrock(
        query=query,
        location=location_data["display"],
        category=category,
    )

    lawyer_text = format_lawyer_suggestions(lawyers) if lawyers else ""
    disclaimer = format_disclaimer()

    return f"{prefix}{advice}{lawyer_text}{disclaimer}"
