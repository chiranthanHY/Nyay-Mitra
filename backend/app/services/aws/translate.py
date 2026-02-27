"""
translate.py — Language detection + translation stub (mocks AWS Translate for demo)
In production: use boto3 + Amazon Translate.
"""
import logging
import re

logger = logging.getLogger(__name__)

# Simple heuristic: detect script to guess language
_KANNADA_RANGE = re.compile(r"[\u0C80-\u0CFF]")
_HINDI_DEVANAGARI_RANGE = re.compile(r"[\u0900-\u097F]")
_TAMIL_RANGE = re.compile(r"[\u0B80-\u0BFF]")
_TELUGU_RANGE = re.compile(r"[\u0C00-\u0C7F]")
_ARABIC_URDU_RANGE = re.compile(r"[\u0600-\u06FF]")


def detect_language(text: str) -> str:
    """
    Heuristic language detection based on Unicode script ranges.
    Returns BCP-47 language code.

    In production, use Amazon Comprehend DetectDominantLanguage.
    """
    if _KANNADA_RANGE.search(text):
        return "kn"  # Kannada
    if _HINDI_DEVANAGARI_RANGE.search(text):
        return "hi"  # Hindi
    if _TAMIL_RANGE.search(text):
        return "ta"  # Tamil
    if _TELUGU_RANGE.search(text):
        return "te"  # Telugu
    if _ARABIC_URDU_RANGE.search(text):
        return "ur"  # Urdu
    return "en"  # Default: English


def translate_to_english(text: str, source_language: str) -> dict:
    """
    Simulated translation to English.

    In production, this would:
    1. Call boto3 translate_client.translate_text(...)
    2. Return the translated text + source language

    Args:
        text: Input text in any language
        source_language: BCP-47 source language code

    Returns:
        dict with 'translated_text', 'source_language', 'is_mock'
    """
    if source_language == "en":
        return {
            "translated_text": text,
            "source_language": "en",
            "is_mock": False,
        }

    logger.info("Mock translate: %s → en for text: %.50s...", source_language, text)

    # In production: real boto3 call would go here
    # translate_client = boto3.client("translate", region_name=settings.aws_region)
    # response = translate_client.translate_text(
    #     Text=text,
    #     SourceLanguageCode=source_language,
    #     TargetLanguageCode="en"
    # )
    # return {"translated_text": response["TranslatedText"], ...}

    lang_name_map = {
        "kn": "Kannada",
        "hi": "Hindi",
        "ta": "Tamil",
        "te": "Telugu",
        "ur": "Urdu",
        "mr": "Marathi",
    }
    lang_name = lang_name_map.get(source_language, source_language)

    return {
        "translated_text": text,  # Pass-through for demo (no real translation)
        "source_language": source_language,
        "is_mock": True,
        "note": f"⚠️ Translation from {lang_name} is simulated. Real AWS Translate integration pending.",
    }


def translate_response(text: str, target_language: str) -> str:
    """
    Translate the bot's English response back to the user's language.
    Currently a stub — returns English with a note.
    """
    if target_language == "en":
        return text

    lang_name_map = {
        "kn": "Kannada",
        "hi": "Hindi",
        "ta": "Tamil",
        "te": "Telugu",
        "ur": "Urdu",
    }
    lang_name = lang_name_map.get(target_language, target_language)

    return (
        f"{text}\n\n"
        f"_(Response in {lang_name} coming soon — translation service integration pending)_"
    )
