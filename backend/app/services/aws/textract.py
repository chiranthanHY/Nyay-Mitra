"""
textract.py — Document OCR stub (mocks AWS Textract for demo)
In production: use boto3 + Amazon Textract AnalyzeDocument.
"""
import logging
import random

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


def extract_document_text(image_url: str, document_type: str = "auto") -> dict:
    """
    Simulated OCR extraction from a document image.

    In production, this would:
    1. Download image from Twilio MediaUrl
    2. Upload to S3
    3. Call boto3 textract_client.analyze_document(...)
    4. Parse blocks and return key-value pairs + raw text

    Args:
        image_url: URL of the document image (from Twilio MediaUrl0)
        document_type: 'auto', 'rent_agreement', 'fir', 'notice', etc.

    Returns:
        dict with 'extracted_text', 'document_type', 'confidence', 'is_mock'
    """
    logger.info("Mock Textract called for image URL: %s", image_url)

    # In production: real boto3 call would go here
    # textract_client = boto3.client("textract", region_name=settings.aws_region)
    # with open(image_path, "rb") as f:
    #     response = textract_client.analyze_document(
    #         Document={"Bytes": f.read()},
    #         FeatureTypes=["FORMS", "TABLES"]
    #     )

    sample = random.choice(_DEMO_EXTRACTIONS)

    return {
        "extracted_text": sample["extracted_text"],
        "document_type": sample["document_type"],
        "confidence": 0.87,
        "is_mock": True,
        "note": "⚠️ Document OCR is simulated. Real AWS Textract integration pending.",
    }
