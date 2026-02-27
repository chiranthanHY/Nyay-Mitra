"""
textract.py — Document OCR stub (mocks AWS Textract for demo)
In production: use boto3 + Amazon Textract AnalyzeDocument.
"""
import logging
import random
from typing import Optional

import boto3
import httpx
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import get_settings

logger = logging.getLogger(__name__)

# Sample extracted texts from common legal documents
_DEMO_EXTRACTIONS = [
    {
        "document_type": "Rent Agreement",
        "extracted_text": (
            "RENT AGREEMENT\n"
            "Landlord: Mr. Ramesh Kumar\n"
            "Tenant: Mr. Arun Sharma\n"
            "Property: Flat No. 204, Brigade Apartments, Koramangala, Bengaluru - 560034\n"
            "Monthly Rent: Rs. 18,000/- (Eighteen Thousand Only)\n"
            "Security Deposit: Rs. 54,000/- (Three months)\n"
            "Lease Period: 11 months from 01-Jan-2025\n"
            "Notice Period: 1 month\n"
            "Signed: 01-Jan-2025"
        ),
    },
    {
        "document_type": "Employment Letter",
        "extracted_text": (
            "APPOINTMENT LETTER\n"
            "Employee: Ms. Priya Nair\n"
            "Designation: Software Engineer\n"
            "Basic Salary: Rs. 45,000/- per month\n"
            "Notice Period: 60 days\n"
            "Date of Joining: 15-March-2024\n"
            "Probation Period: 6 months"
        ),
    },
    {
        "document_type": "Legal Notice",
        "extracted_text": (
            "LEGAL NOTICE\n"
            "From: Adv. Kavitha Reddy, Jayanagar, Bengaluru\n"
            "To: M/s XYZ Builders Pvt. Ltd.\n"
            "Subject: Delay in possession of flat and refund of amount paid\n"
            "You are hereby called upon to pay Rs. 8,50,000 within 15 days\n"
            "failing which legal proceedings shall be initiated."
        ),
    },
    {
        "document_type": "FIR Copy",
        "extracted_text": (
            "FIRST INFORMATION REPORT\n"
            "FIR No.: 456/2025\n"
            "Police Station: Koramangala\n"
            "Date: 22-Jan-2025\n"
            "Complainant: Suresh Babu\n"
            "Offence: IPC Section 420 (Cheating), IPC Section 506 (Criminal Intimidation)\n"
            "Brief facts: Accused defrauded complainant of Rs. 2,50,000 via fake investment scheme."
        ),
    },
]


async def _download_image(url: str, auth: Optional[tuple] = None) -> Optional[bytes]:
    """Download image payload from a URL."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, auth=auth, timeout=15.0)
            response.raise_for_status()
            return response.content
    except Exception as e:
        logger.error("Failed to download image from %s: %s", url, e)
        return None

def _extract_text_from_blocks(blocks: list) -> str:
    """Extract plain text from Textract blocks."""
    lines = []
    for block in blocks:
        if block["BlockType"] == "LINE":
            lines.append(block.get("Text", ""))
    return "\n".join(lines)


async def extract_document_text(image_url: str, document_type: str = "auto") -> dict:
    """
    Extract text from a document image using AWS Textract.
    If AWS depends are not configured or downloading fails, falls back to mock extractions.
    """
    settings = get_settings()
    logger.info("Textract called for image URL: %s", image_url)

    if not settings.aws_configured:
        logger.warning("AWS credentials not configured — returning mock OCR response")
        return _mock_textract_response()

    # Twilio Media URLs require Basic Auth using Account SID and Auth Token to download
    auth = None
    if settings.twilio_configured and "twilio.com" in image_url:
        auth = (settings.twilio_account_sid, settings.twilio_auth_token)

    image_bytes = await _download_image(image_url, auth=auth)
    
    if not image_bytes:
         logger.warning("Could not download image, falling back to mock OCR")
         return _mock_textract_response()

    try:
        client = boto3.client(
            "textract",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

        logger.info("Calling Textract analyze_document")
        response = client.analyze_document(
            Document={"Bytes": image_bytes},
            FeatureTypes=["FORMS", "TABLES"] # Requesting forms and tables support
        )

        extracted_text = _extract_text_from_blocks(response.get("Blocks", []))
        
        return {
            "extracted_text": extracted_text,
            "document_type": document_type,
            "confidence": 0.95, 
            "is_mock": False,
        }

    except NoCredentialsError:
        logger.error("No AWS credentials available for Textract")
        return _mock_textract_response()
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        logger.error("Textract ClientError [%s]: %s", error_code, e)
        return _mock_textract_response()
    except Exception as e:
        logger.exception("Unexpected error calling Textract: %s", e)
        return _mock_textract_response()

def _mock_textract_response() -> dict:
    sample = random.choice(_DEMO_EXTRACTIONS)
    return {
        "extracted_text": sample["extracted_text"],
        "document_type": sample["document_type"],
        "confidence": 0.87,
        "is_mock": True,
        "note": "⚠️ Document OCR is simulated due to failure or missing credentials.",
    }
