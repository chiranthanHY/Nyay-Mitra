"""
bedrock.py — Amazon Bedrock (Claude 3.5 Sonnet) integration for legal advice generation
"""
import json
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import get_settings

logger = logging.getLogger(__name__)

LEGAL_SYSTEM_PROMPT = """You are NyayMitra, a helpful and empathetic AI legal assistant specializing in Indian law.
Your role is to help ordinary citizens in India understand their legal rights and options in simple, clear language.

Guidelines:
- Provide practical, actionable information about Indian laws (IPC, CPC, Constitution, consumer law, labour law, etc.)
- Always explain legal concepts in simple terms — assume the user is not a lawyer
- Mention relevant laws, sections, or acts when applicable
- Suggest practical next steps the user can take
- Be empathetic and culturally sensitive
- Keep responses concise but complete (max ~300 words for WhatsApp)
- If the situation is urgent (domestic violence, arrest, etc.), emphasize emergency resources first
- ALWAYS end with the disclaimer that this is general information and not legal advice

You must NEVER:
- Give specific legal strategy that only a licensed lawyer should provide
- Pretend to know the outcome of a specific case
- Discourage users from seeking professional legal help
"""


def build_legal_prompt(query: str, location: str, category: Optional[str] = None) -> str:
    """Build a structured prompt for Claude."""
    category_context = f" The query appears to relate to **{category} law**." if category else ""
    return (
        f"The user is located in **{location}**.{category_context}\n\n"
        f"User's query: {query}\n\n"
        "Please provide:\n"
        "1. A clear explanation of their legal situation\n"
        "2. Relevant Indian laws or acts that apply\n"
        "3. Practical next steps they can take\n"
        "4. Any important warnings or urgent actions if needed\n\n"
        "Keep the response friendly and suitable for WhatsApp (use simple formatting)."
    )


def invoke_bedrock(
    query: str,
    location: str,
    category: Optional[str] = None,
) -> str:
    """
    Call Amazon Bedrock (Claude 3.5 Sonnet) with the legal query.

    Returns:
        AI-generated legal advice string, or a fallback message if unavailable.
    """
    settings = get_settings()

    if not settings.aws_configured:
        logger.warning("AWS credentials not configured — returning mock response")
        return _mock_bedrock_response(query, location, category)

    try:
        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

        user_prompt = build_legal_prompt(query, location, category)

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": LEGAL_SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "top_p": 0.9,
        }

        logger.info("Invoking Bedrock model: %s", settings.bedrock_model_id)
        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        response_body = json.loads(response["body"].read())
        content = response_body.get("content", [])
        if content and isinstance(content, list):
            return content[0].get("text", "").strip()

        logger.error("Unexpected Bedrock response format: %s", response_body)
        return _mock_bedrock_response(query, location, category)

    except NoCredentialsError:
        logger.error("No AWS credentials available")
        return _mock_bedrock_response(query, location, category)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        logger.error("Bedrock ClientError [%s]: %s", error_code, e)
        return _mock_bedrock_response(query, location, category)
    except Exception as e:
        logger.exception("Unexpected error calling Bedrock: %s", e)
        return _mock_bedrock_response(query, location, category)


def _mock_bedrock_response(query: str, location: str, category: Optional[str]) -> str:
    """
    Fallback response when AWS Bedrock is not configured.
    Used during development / demo without real AWS credentials.
    """
    category_advice: dict[str, str] = {
        "family": (
            "🏠 *Family Law — Your Rights in India*\n\n"
            "For domestic issues, you have strong protections under Indian law:\n\n"
            "• *Domestic Violence:* File a complaint under the Protection of Women "
            "from Domestic Violence Act, 2005. Contact your local Women's Protection Officer or police.\n"
            "• *Divorce:* Can be filed under Hindu Marriage Act / Special Marriage Act. "
            "Mutual consent divorce typically takes 6-18 months.\n"
            "• *Maintenance:* Under Section 125 CrPC, spouses and children are entitled to maintenance.\n\n"
            "📍 *Next Steps:*\n"
            "1️⃣ Document all incidents with dates\n"
            "2️⃣ Visit your nearest Family Court\n"
            "3️⃣ Contact a legal aid lawyer (many offer free first consultations)"
        ),
        "property": (
            "🏗️ *Property/Rent Law — Your Rights*\n\n"
            "• *Rent Disputes:* Karnataka Rent Control Act protects tenants. "
            "A landlord cannot evict without proper notice (typically 1-3 months).\n"
            "• *Illegal Eviction:* File a complaint with the Rent Controller in your jurisdiction.\n"
            "• *Property Fraud:* Register an FIR with police + file civil suit for recovery.\n"
            "• *RERA Complaints:* For builder disputes, file on karera.karnataka.gov.in\n\n"
            "📍 *Next Steps:*\n"
            "1️⃣ Secure all documents (agreement, receipts)\n"
            "2️⃣ Send a legal notice first\n"
            "3️⃣ Approach Civil Court or Consumer Forum"
        ),
        "labour": (
            "⚒️ *Labour Law — Your Rights as a Worker*\n\n"
            "• *Unpaid Wages:* File complaint with the Labour Commissioner under "
            "Payment of Wages Act, 1936.\n"
            "• *Wrongful Termination:* Industrial Disputes Act, 1947 protects you. "
            "Employer must give notice or pay in lieu.\n"
            "• *PF Issues:* File complaint on the EPFO portal (epfindia.gov.in)\n"
            "• *ESIC Benefits:* Contact your nearest ESIC office.\n\n"
            "📍 *Next Steps:*\n"
            "1️⃣ Collect payslips, appointment letter, and any communication\n"
            "2️⃣ Visit the Karnataka Labour Department office\n"
            "3️⃣ File online complaint: labour.karnataka.gov.in"
        ),
        "criminal": (
            "🚔 *Criminal Law — Know Your Rights*\n\n"
            "• *Filing FIR:* Police must register your FIR under Section 154 CrPC. "
            "If they refuse, approach the SP/DSP or file a complaint with the Magistrate.\n"
            "• *Arrest Rights:* You have the right to be informed of charges, "
            "consult a lawyer, and be produced before a Magistrate within 24 hours.\n"
            "• *Bail:* For bailable offences, you are entitled to bail as a right.\n\n"
            "📍 *Next Steps:*\n"
            "1️⃣ Go to the nearest police station and request FIR registration\n"
            "2️⃣ Get FIR copy (it's free of cost)\n"
            "3️⃣ If arrested, call a lawyer immediately"
        ),
        "cyber": (
            "💻 *Cyber Crime — Protect Yourself*\n\n"
            "• *Online Fraud/UPI Scam:* Report immediately at cybercrime.gov.in or call 1930\n"
            "• *Hacking/Data Theft:* File complaint under IT Act 2000, Sections 43 and 66\n"
            "• *Social Media Harassment:* IT Act Section 67 (obscene content), IPC 503 (threats)\n\n"
            "📍 *Next Steps:*\n"
            "1️⃣ Do NOT share more OTPs or personal information\n"
            "2️⃣ Contact your bank immediately to freeze transactions\n"
            "3️⃣ File complaint at cybercrime.gov.in or nearest Cyber Police Station\n"
            "4️⃣ Take screenshots of all evidence"
        ),
    }

    default_advice = (
        f"📋 *Legal Information for: {location}*\n\n"
        "I understand you need legal help. Here's what I can tell you:\n\n"
        "Indian citizens have strong constitutional rights and access to free legal aid. "
        "The Karnataka Legal Services Authority (KLSA) provides free legal assistance to:\n"
        "• Women, children, and senior citizens\n"
        "• SC/ST community members\n"
        "• People with disabilities\n"
        "• Those earning below ₹3 lakh/year\n\n"
        "📍 *Immediate Options:*\n"
        "1️⃣ Call KLSA: 080-2235-0202 (free legal aid)\n"
        "2️⃣ National Legal Services: 15100 (NALSA toll-free)\n"
        "3️⃣ Visit your nearest District Court for free legal help"
    )

    advice = category_advice.get(category or "", default_advice)
    return advice
