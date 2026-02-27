"""
rights_card.py — Amazon Bedrock (Claude 3.5 Sonnet) integration for Right Card generation
"""
import json
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import get_settings

logger = logging.getLogger(__name__)

RIGHTS_CARD_SYSTEM_PROMPT = """You are NyayMitra, an expert AI legal assistant specializing in Indian law.
Your task is to generate a highly structured, simple, and actionable "Know Your Rights" guide for a specific situation (like being arrested, evicted, or scammed).

Guidelines:
- The output MUST be valid JSON matching the exact structure requested, with no markdown formatting around it (e.g. no ```json blocks).
- Always explain legal concepts in simple, easy-to-understand language.
- Ensure the advice is practically helpful for someone in distress.
- Output the content in the requested LANGUAGE. Translate carefully ensuring legal terms remain accurate.

Always return this exact JSON schema:
{
  "title": "A clear title (e.g., Your Rights if Arrested)",
  "entitlements": ["Right 1", "Right 2", "Right 3"],
  "can_do": ["What the authority/landlord CAN do 1", "What they CAN do 2"],
  "cannot_do": ["What they CANNOT do 1", "What they CANNOT do 2"],
  "next_steps": ["Step 1", "Step 2", "Step 3"]
}
"""

def build_rights_prompt(situation: str, language: str) -> str:
    """Build a structured prompt for generating the rights card."""
    return (
        f"Situation: {situation}\n"
        f"Language requested: {language}\n\n"
        f"Please generate the Know Your Rights JSON structure for a person facing this situation in India."
    )

def _mock_rights_card(situation: str, language: str) -> dict:
    """Fallback response for when real Bedrock access isn't available."""
    # We will just return a simple English/Hindi fallback
    if "arrest" in situation.lower():
        return {
            "title": "Your Rights During Arrest" if language.lower() == "english" else "गिरफ्तारी के दौरान आपके अधिकार",
            "entitlements": [
                "Right to be informed of grounds of arrest (Sec 50 CrPC).",
                "Right to consult a lawyer immediately (Article 22).",
                "Right to be produced before a Magistrate within 24 hours (Sec 57 CrPC).",
                "Right to inform a relative or friend about your arrest."
            ] if language.lower() == "english" else [
                "गिरफ्तारी का कारण जानने का अधिकार (धारा 50 CrPC)",
                "वकील से तुरंत परामर्श करने का अधिकार (अनुच्छेद 22)",
                "24 घंटे के भीतर मजिस्ट्रेट के सामने पेश होने का अधिकार",
                "अपने परिवार या दोस्त को सूचित करने का अधिकार"
            ],
            "can_do": [
                "Police can arrest without a warrant for cognizable offenses.",
                "Police can conduct a medical examination."
            ] if language.lower() == "english" else [
                "संज्ञेय अपराधों में बिना वारंट गिरफ्तार कर सकती है",
                "मेडिकल जांच करा सकती है"
            ],
            "cannot_do": [
                "Police cannot use unnecessary force or violence.",
                "Police cannot keep you in the station for more than 24 hrs without a court order."
            ] if language.lower() == "english" else [
                "पुलिस अनावश्यक बल या हिंसा का प्रयोग नहीं कर सकती",
                "कोर्ट के आदेश के बिना 24 घंटे से अधिक समय तक थाने में नहीं रख सकती"
            ],
            "next_steps": [
                "Ask for the memo of arrest.",
                "Call your lawyer or ask for Legal Aid.",
                "Do not sign any confession under pressure."
            ] if language.lower() == "english" else [
                "गिरफ्तारी का मेमो मांगें",
                "अपने वकील को बुलाएं या कानूनी सहायता मांगें",
                "दबाव में किसी भी बयान पर हस्ताक्षर न करें"
            ]
        }
    
    # Generic fallback
    return {
        "title": f"Rights concerning: {situation}",
        "entitlements": [
            "You have the right to fair treatment under law.",
            "You can seek free legal aid if eligible."
        ],
        "can_do": [
            "Authorities can ask for valid documentation.",
            "They can follow process established by law."
        ],
        "cannot_do": [
            "They cannot use illegal force or coercion.",
            "They cannot deny you basic constitutional rights."
        ],
        "next_steps": [
            "Stay calm and document everything.",
            "Consult a lawyer.",
            "Contact local authorities or helplines."
        ]
    }


def generate_rights_card(situation: str, language: str = "English") -> dict:
    """
    Call Amazon Bedrock to generate structured legal rights JSON.
    """
    settings = get_settings()

    if not settings.aws_configured:
        logger.warning("AWS credentials not configured — returning mock rights card")
        return _mock_rights_card(situation, language)

    try:
        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

        user_prompt = build_rights_prompt(situation, language)

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "system": RIGHTS_CARD_SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "top_p": 0.9,
        }

        logger.info("Invoking Bedrock model for Rights Card: %s", settings.bedrock_model_id)
        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        response_body = json.loads(response["body"].read())
        content = response_body.get("content", [])
        if content and isinstance(content, list):
            text_response = content[0].get("text", "").strip()
            # Clean up the response in case Claude added markdown like ```json
            if text_response.startswith("```json"):
                text_response = text_response.replace("```json", "", 1)
            if text_response.endswith("```"):
                text_response = text_response.rsplit("```", 1)[0]
                
            try:
                data = json.loads(text_response.strip())
                return data
            except json.JSONDecodeError as e:
                logger.error("Failed to parse Bedrock JSON response: %s\nText: %s", e, text_response)
                return _mock_rights_card(situation, language)

        logger.error("Unexpected Bedrock response format: %s", response_body)
        return _mock_rights_card(situation, language)

    except NoCredentialsError:
        logger.error("No AWS credentials available")
        return _mock_rights_card(situation, language)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        logger.error("Bedrock ClientError [%s]: %s", error_code, e)
        return _mock_rights_card(situation, language)
    except Exception as e:
        logger.exception("Unexpected error calling Bedrock: %s", e)
        return _mock_rights_card(situation, language)
