"""
rights_card.py — "Know Your Rights" card generator using LLM prompt engineering
"""
import json
import logging
from typing import Optional

from app.services.aws.bedrock import invoke_bedrock
from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Situation templates ──────────────────────────────────────────────────────

SITUATIONS = {
    "arrested": {
        "label": "Arrested / Detained by Police",
        "icon": "🚔",
        "prompt_context": "The user has been arrested or detained by police in India.",
    },
    "evicted": {
        "label": "Evicted / Landlord Dispute",
        "icon": "🏠",
        "prompt_context": "The user is being illegally evicted or has a landlord/tenant dispute in India.",
    },
    "fired": {
        "label": "Fired / Wrongful Termination",
        "icon": "💼",
        "prompt_context": "The user has been fired or wrongfully terminated from their job in India.",
    },
    "cheated": {
        "label": "Cheated by a Vendor / Fraud",
        "icon": "🛒",
        "prompt_context": "The user has been cheated by a vendor, online seller, or is a victim of consumer fraud in India.",
    },
}

RIGHTS_CARD_SYSTEM_PROMPT = """You are NyayMitra, an expert Indian legal rights advisor.
Your task is to generate a structured "Know Your Rights" card for an Indian citizen in distress.

You MUST respond with ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "title": "Short title for the card (include an emoji)",
  "situation_summary": "One-line summary of the situation",
  "your_rights": [
    "Right 1 — with specific Indian law reference (Act/Section)",
    "Right 2 — with specific Indian law reference",
    "Right 3 — with specific Indian law reference",
    "Right 4 — with specific Indian law reference",
    "Right 5 — with specific Indian law reference"
  ],
  "they_cannot": [
    "What the authority/party CANNOT legally do — thing 1",
    "Thing 2 they cannot do",
    "Thing 3 they cannot do",
    "Thing 4 they cannot do"
  ],
  "do_next": [
    "Immediate step 1 the person should take",
    "Step 2",
    "Step 3",
    "Step 4",
    "Step 5"
  ],
  "emergency_contacts": [
    "NALSA Legal Aid Helpline: 15100",
    "Other relevant helpline with number",
    "Another relevant contact"
  ],
  "relevant_laws": [
    "Law/Act 1 with section number",
    "Law/Act 2 with section number",
    "Law/Act 3 with section number"
  ]
}

Rules:
- Be specific to Indian law (IPC, CrPC, Constitution, specific Acts)
- Use simple, clear language that a non-lawyer can understand
- Each right/step should be concise (one line, max 15 words)
- Include at least 4-5 rights and 4-5 next steps
- Emergency contacts should include real Indian helpline numbers
- If a language other than English is requested, translate ALL content to that language
- Keep the tone empowering and reassuring
"""


def generate_rights_card(
    situation: str,
    language: str = "English",
    location: str = "India",
) -> dict:
    """
    Generate a structured rights card using LLM.

    Args:
        situation: One of 'arrested', 'evicted', 'fired', 'cheated'
        language: Target language (English, Hindi, Kannada)
        location: User's location for jurisdiction context

    Returns:
        Structured dict with card content
    """
    if situation not in SITUATIONS:
        return _error_response(f"Unknown situation: {situation}")

    sit = SITUATIONS[situation]
    settings = get_settings()

    user_prompt = (
        f"{sit['prompt_context']}\n"
        f"Location: {location}\n"
        f"Language: {language}\n\n"
        f"Generate a 'Know Your Rights' card for this situation. "
        f"Respond with ONLY the JSON object, no other text."
    )

    if not settings.aws_configured:
        logger.warning("AWS not configured — using mock rights card")
        return _mock_rights_card(situation, language)

    try:
        # Use Bedrock with our specialized system prompt
        import boto3
        from botocore.exceptions import ClientError, NoCredentialsError

        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "system": RIGHTS_CARD_SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.2,
            "top_p": 0.9,
        }

        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        response_body = json.loads(response["body"].read())
        content = response_body.get("content", [])

        if content and isinstance(content, list):
            raw_text = content[0].get("text", "").strip()
            # Parse the JSON response
            card_data = json.loads(raw_text)
            card_data["situation"] = situation
            card_data["language"] = language
            card_data["icon"] = sit["icon"]
            return card_data

        logger.error("Unexpected Bedrock response: %s", response_body)
        return _mock_rights_card(situation, language)

    except json.JSONDecodeError as e:
        logger.error("Failed to parse LLM JSON response: %s", e)
        return _mock_rights_card(situation, language)
    except Exception as e:
        logger.exception("Error generating rights card: %s", e)
        return _mock_rights_card(situation, language)


def _error_response(message: str) -> dict:
    return {"error": True, "message": message}


# ── Mock responses for development ──────────────────────────────────────────

def _mock_rights_card(situation: str, language: str) -> dict:
    """Fallback mock data when AWS Bedrock is not available."""
    sit = SITUATIONS.get(situation, SITUATIONS["arrested"])

    mock_cards = {
        "arrested": {
            "title": "🛡️ Know Your Rights — If You Are Arrested",
            "situation_summary": "You have been arrested or detained by police. Here are your fundamental rights.",
            "your_rights": [
                "Right to know the grounds of arrest — Section 50, CrPC",
                "Right to a lawyer immediately — Article 22(1), Constitution",
                "Right to be produced before a Magistrate within 24 hours — Article 22(2)",
                "Right to inform a family member or friend — Section 50A, CrPC",
                "Right to free legal aid if you can't afford a lawyer — Article 39A",
                "Right to remain silent — Article 20(3), Constitution",
                "Right to medical examination — Section 54, CrPC",
            ],
            "they_cannot": [
                "Police CANNOT arrest without informing you of the reason",
                "Police CANNOT use torture or third-degree methods — DK Basu guidelines",
                "Police CANNOT keep you for more than 24 hours without a Magistrate's order",
                "Police CANNOT force you to confess — confessions to police are inadmissible",
                "Police CANNOT deny you access to a lawyer",
                "Police CANNOT handcuff you without a court order (in most cases)",
            ],
            "do_next": [
                "Stay calm and do NOT resist arrest",
                "Ask for the arrest memo with date, time, and reason",
                "Immediately inform a family member or friend",
                "Call NALSA Legal Aid Helpline: 15100 for free legal help",
                "Do NOT sign any blank papers or make any statement",
                "Request to be produced before the nearest Magistrate",
                "Apply for bail — it is your right for bailable offences",
            ],
            "emergency_contacts": [
                "NALSA Legal Aid Helpline: 15100 (Toll-Free)",
                "National Human Rights Commission: 1800-345-4545",
                "Women's Helpline: 181 (if applicable)",
                "Karnataka SLSA: 080-2235-0202",
            ],
            "relevant_laws": [
                "Article 22 — Protection against arrest and detention (Constitution)",
                "Section 41A, CrPC — Notice before arrest in certain cases",
                "Section 50, CrPC — Right to be informed of grounds of arrest",
                "Section 50A, CrPC — Right to inform someone about arrest",
                "DK Basu vs State of West Bengal — Supreme Court guidelines on arrest",
            ],
        },
        "evicted": {
            "title": "🛡️ Know Your Rights — If You're Being Evicted",
            "situation_summary": "Your landlord is trying to evict you. You have strong legal protections.",
            "your_rights": [
                "Right to a proper written eviction notice — Rent Control Act",
                "Right to continue living until a court order is obtained",
                "Right to get back your security deposit — as per agreement",
                "Right to essential services (water, electricity) even during dispute",
                "Right to file a counter-claim if landlord is in violation",
                "Right to 15 days minimum notice before eviction proceedings",
            ],
            "they_cannot": [
                "Landlord CANNOT lock you out or forcibly evict you",
                "Landlord CANNOT cut off water or electricity as pressure",
                "Landlord CANNOT enter your premises without prior notice",
                "Landlord CANNOT increase rent arbitrarily mid-tenancy",
                "Landlord CANNOT evict without a court order",
            ],
            "do_next": [
                "Do NOT vacate immediately — you have legal protection",
                "Keep all rent receipts and rental agreement safely",
                "Send a written reply to the eviction notice",
                "File complaint with Rent Controller in your jurisdiction",
                "Contact NALSA for free legal aid: 15100",
                "Document everything — photos of property, all communications",
            ],
            "emergency_contacts": [
                "NALSA Legal Aid Helpline: 15100 (Toll-Free)",
                "Karnataka Rent Controller Office: Local Civil Court",
                "Legal Services Authority Karnataka: 080-2235-0202",
            ],
            "relevant_laws": [
                "Karnataka Rent Control Act, 1999",
                "Transfer of Property Act, 1882 — Section 106 (termination of lease)",
                "Indian Contract Act — Section 73 (breach of agreement)",
                "CPC Order 39 — Injunction against illegal eviction",
            ],
        },
        "fired": {
            "title": "🛡️ Know Your Rights — If You Were Fired",
            "situation_summary": "You have been terminated from your job. Know your legal protections as a worker.",
            "your_rights": [
                "Right to written notice or pay in lieu — Industrial Disputes Act",
                "Right to reason for termination in writing",
                "Right to full and final settlement within 2 days",
                "Right to gratuity if you've worked 5+ years — Gratuity Act",
                "Right to PF withdrawal — EPF & MP Act, 1952",
                "Right to challenge wrongful termination in Labour Court",
            ],
            "they_cannot": [
                "Employer CANNOT fire without notice or compensation",
                "Employer CANNOT withhold your earned salary",
                "Employer CANNOT deny your PF or gratuity benefits",
                "Employer CANNOT terminate during maternity leave",
                "Employer CANNOT fire you for union activity — Section 25N",
                "Employer CANNOT discriminate based on caste, religion, or gender",
            ],
            "do_next": [
                "Request a written termination letter with reasons",
                "Collect copies of appointment letter, payslips, and all HR communications",
                "Calculate pending dues: salary, bonus, leave encashment, gratuity",
                "File complaint with Labour Commissioner if dues are unpaid",
                "File EPFO complaint for PF issues: epfindia.gov.in",
                "Contact a labour lawyer — free aid available via NALSA: 15100",
            ],
            "emergency_contacts": [
                "NALSA Legal Aid Helpline: 15100 (Toll-Free)",
                "Karnataka Labour Commissioner: 080-2286-1386",
                "EPFO Helpline: 1800-118-005",
                "POSH (Sexual Harassment): Internal/Local Complaints Committee",
            ],
            "relevant_laws": [
                "Industrial Disputes Act, 1947 — Section 25F (conditions for retrenchment)",
                "Payment of Gratuity Act, 1972",
                "Payment of Wages Act, 1936",
                "EPF & Miscellaneous Provisions Act, 1952",
                "Maternity Benefit Act, 1961",
            ],
        },
        "cheated": {
            "title": "🛡️ Know Your Rights — If You Were Cheated",
            "situation_summary": "You were cheated by a vendor or are a victim of consumer fraud. You have strong consumer rights.",
            "your_rights": [
                "Right to file a consumer complaint — Consumer Protection Act, 2019",
                "Right to a refund, replacement, or compensation",
                "Right to file complaint online at consumerhelpline.gov.in",
                "Right to file an FIR for cheating — Section 420, IPC",
                "Right to compensation for defective goods or deficient services",
                "Right to be heard before a Consumer Forum without a lawyer",
            ],
            "they_cannot": [
                "Vendor CANNOT sell defective or expired products",
                "Vendor CANNOT refuse a refund for defective goods",
                "Vendor CANNOT mislead with false advertising",
                "E-commerce platforms CANNOT deny grievance redressal",
                "Vendor CANNOT impose unfair contract terms",
            ],
            "do_next": [
                "Collect all evidence: bills, receipts, photos, chat screenshots",
                "Send a written complaint to the vendor first (keep proof)",
                "File complaint on National Consumer Helpline: 1800-11-4000",
                "File online at consumerhelpline.gov.in or edaakhil.nic.in",
                "For amounts up to ₹1 crore — file in District Consumer Forum",
                "For UPI/online fraud — also file on cybercrime.gov.in",
            ],
            "emergency_contacts": [
                "National Consumer Helpline: 1800-11-4000 (Toll-Free)",
                "NALSA Legal Aid: 15100",
                "Cyber Crime Helpline: 1930 (for online fraud)",
                "Karnataka Consumer Forum: District-level offices",
            ],
            "relevant_laws": [
                "Consumer Protection Act, 2019",
                "Section 420, IPC — Cheating and dishonestly inducing delivery of property",
                "E-Commerce Rules, 2020 — Consumer Protection",
                "IT Act, 2000 — Section 66D (cheating using computer resources)",
            ],
        },
    }

    card = mock_cards.get(situation, mock_cards["arrested"])
    card["situation"] = situation
    card["language"] = language
    card["icon"] = sit["icon"]
    card["is_mock"] = True
    return card
