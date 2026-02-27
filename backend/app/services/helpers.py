"""
helpers.py — Jurisdiction mapping, lawyer search, message utilities
"""
import json
import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Lawyers JSON path ────────────────────────────────────────────────────────
_LAWYERS_PATH = Path(__file__).parent.parent.parent.parent / "docs" / "lawyers.json"

def _load_lawyers() -> list[dict]:
    """Load lawyers from the JSON file."""
    try:
        with open(_LAWYERS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("lawyers", [])
    except FileNotFoundError:
        logger.warning("lawyers.json not found at %s", _LAWYERS_PATH)
        return []
    except json.JSONDecodeError as e:
        logger.error("Invalid lawyers.json: %s", e)
        return []


# ── Jurisdiction / Area mapping ──────────────────────────────────────────────

# Pincode → area name for Bengaluru Urban district
PINCODE_MAP: dict[str, str] = {
    "560001": "Shivajinagar",
    "560002": "Shivajinagar",
    "560003": "MG Road",
    "560004": "Jayanagar",
    "560005": "Basavanagudi",
    "560006": "Malleswaram",
    "560008": "Rajajinagar",
    "560010": "Hebbal",
    "560011": "Peenya",
    "560012": "Majestic/City Market",
    "560017": "Yeshwanthpur",
    "560018": "Rajajinagar",
    "560019": "Vijayanagar",
    "560020": "Banashankari",
    "560022": "Kengeri",
    "560025": "Koramangala",
    "560027": "RT Nagar",
    "560029": "Lingarajapura",
    "560032": "Indiranagar",
    "560033": "Marathahalli",
    "560034": "Whitefield",
    "560035": "Hoodi",
    "560036": "Yelahanka",
    "560037": "Jalahalli",
    "560038": "Mathikere",
    "560040": "Basaveshwaranagar",
    "560041": "Nagarbhavi",
    "560043": "HSR Layout",
    "560045": "BTM Layout",
    "560047": "JP Nagar",
    "560076": "Electronic City",
    "560078": "Sarjapur Road",
    "560100": "Sarjapur",
    "560102": "Brookefield",
    "560103": "Doddaballapur Road",
    "560104": "Bannerghatta Road",
    "560105": "Anekal",
    "561203": "Doddaballapur",
    "562125": "Kanakapura",
    "562160": "Ramanagara",
}

# Keyword → area (for natural language area detection)
AREA_KEYWORDS: dict[str, str] = {
    "whitefield": "Whitefield",
    "koramangala": "Koramangala",
    "indiranagar": "Indiranagar",
    "jayanagar": "Jayanagar",
    "jp nagar": "JP Nagar",
    "hsr layout": "HSR Layout",
    "btm layout": "BTM Layout",
    "electronic city": "Electronic City",
    "marathahalli": "Marathahalli",
    "majestic": "Majestic/City Market",
    "shivajinagar": "Shivajinagar",
    "rajajinagar": "Rajajinagar",
    "basavanagudi": "Basavanagudi",
    "malleshwaram": "Malleswaram",
    "malleswaram": "Malleswaram",
    "yelahanka": "Yelahanka",
    "hebbal": "Hebbal",
    "peenya": "Peenya",
    "mg road": "MG Road",
    "brigade road": "MG Road",
    "ulsoor": "MG Road",
    "yeswanthpur": "Yeshwanthpur",
    "yeshwanthpur": "Yeshwanthpur",
    "vijayanagar": "Vijayanagar",
    "banashankari": "Banashankari",
    "rt nagar": "RT Nagar",
    "kengeri": "Kengeri",
    "nagarbhavi": "Nagarbhavi",
    "sarjapur": "Sarjapur Road",
    "brookefield": "Brookefield",
    "bannerghatta": "Bannerghatta Road",
    "anekal": "Anekal",
    "doddaballapur": "Doddaballapur",
    "kanakapura": "Kanakapura",
    "ramanagara": "Ramanagara",
    "bengaluru": "Bengaluru",
    "bangalore": "Bengaluru",
}


def resolve_location(raw_location: str) -> dict:
    """
    Map a pincode, area name, or free-text location to a structured location dict.

    Returns:
        {
            "state": "Karnataka",
            "district": "Bengaluru Urban",
            "area": "Koramangala",
            "display": "Koramangala, Bengaluru Urban, Karnataka"
        }
    """
    location = raw_location.strip().lower()

    # Try pincode match first (6 digits)
    pincode_match = re.search(r"\b(\d{6})\b", location)
    if pincode_match:
        pincode = pincode_match.group(1)
        area = PINCODE_MAP.get(pincode, "Bengaluru")
        return _build_location(area)

    # Try keyword match
    for keyword, area in AREA_KEYWORDS.items():
        if keyword in location:
            return _build_location(area)

    # Default fallback
    return _build_location("Bengaluru")


def _build_location(area: str) -> dict:
    return {
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "area": area,
        "display": f"{area}, Bengaluru Urban, Karnataka",
    }


# ── Legal category keyword detection ─────────────────────────────────────────

LEGAL_CATEGORIES: dict[str, list[str]] = {
    "family": [
        "divorce", "marriage", "alimony", "custody", "maintenance",
        "domestic violence", "wife", "husband", "separation", "dowry",
        "matrimonial", "child support",
    ],
    "property": [
        "rent", "tenant", "landlord", "eviction", "property", "land",
        "house", "flat", "lease", "agreement", "possession", "real estate",
        "rera", "builder",
    ],
    "labour": [
        "salary", "wage", "job", "employer", "termination", "fired",
        "pf", "provident fund", "esic", "working hours", "overtime",
        "labour", "worker", "migrant",
    ],
    "criminal": [
        "fir", "police", "arrest", "bail", "complaint", "assault",
        "theft", "fraud", "cheating", "case", "crime", "accused",
        "harassment", "threat",
    ],
    "consumer": [
        "consumer", "product", "defect", "refund", "complaint",
        "e-commerce", "online shopping", "amazon", "flipkart",
        "warranty", "service", "rera", "cheated",
    ],
    "cyber": [
        "cyber", "online fraud", "hacked", "phishing", "upi",
        "bank fraud", "otp", "scam", "social media", "fake account",
        "password", "data", "it act",
    ],
    "employment": [
        "sexual harassment", "posh", "workplace", "wrongful termination",
        "employment", "hr", "maternity leave", "discrimination",
    ],
    "human_rights": [
        "police atrocity", "torture", "dalit", "caste", "discrimination",
        "human rights", "child labour", "bonded labour", "trafficking",
    ],
}


def detect_legal_category(text: str) -> Optional[str]:
    """Detect the most likely legal category from user text."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for category, keywords in LEGAL_CATEGORIES.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score
    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def find_lawyers(category: Optional[str] = None, limit: int = 3) -> list[dict]:
    """
    Return matching lawyers/NGOs from lawyers.json.
    If category is provided, filter by specialty keywords.
    """
    all_lawyers = _load_lawyers()
    if not category:
        return all_lawyers[:limit]

    # Map category → specialty keywords to search for
    category_specialty_map: dict[str, list[str]] = {
        "family": ["family", "domestic", "women", "divorce", "matrimonial"],
        "property": ["property", "rent", "tenant", "rera"],
        "labour": ["labour", "wage", "worker"],
        "criminal": ["criminal", "bail", "fir"],
        "consumer": ["consumer", "rera", "fraud"],
        "cyber": ["cyber", "it law", "online fraud"],
        "employment": ["employment", "posh", "wrongful"],
        "human_rights": ["human rights", "dalit", "rights"],
    }

    keywords = category_specialty_map.get(category, [])
    matched = []
    for lawyer in all_lawyers:
        specialty = lawyer.get("specialty", "").lower()
        if any(kw in specialty for kw in keywords):
            matched.append(lawyer)

    # Always include free legal aid if available
    free_aid = [l for l in all_lawyers if l.get("fee_type") == "free"]
    for fa in free_aid:
        if fa not in matched:
            matched.append(fa)

    return matched[:limit]


def format_lawyer_suggestions(lawyers: list[dict]) -> str:
    """Format lawyer list into a readable WhatsApp message."""
    if not lawyers:
        return ""
    lines = ["\n\n📋 *Suggested Legal Help Near You (Bengaluru):*"]
    for i, lawyer in enumerate(lawyers, 1):
        fee_label = {
            "free": "🆓 Free",
            "sliding_scale": "💰 Sliding Scale",
            "consultation": "💵 Consultation Fee",
            "fixed": "💵 Fixed Fee",
        }.get(lawyer.get("fee_type", ""), "")
        ngo_tag = " 🏛️ NGO/Gov" if lawyer.get("is_ngo") else ""
        lines.append(
            f"\n{i}. *{lawyer['name']}*{ngo_tag}\n"
            f"   📌 {lawyer.get('specialty', 'General')}\n"
            f"   📍 {lawyer.get('area', 'Bengaluru')}\n"
            f"   📞 {lawyer.get('phone', 'N/A')} | {fee_label}\n"
            f"   🗣️ {', '.join(lawyer.get('languages', []))}"
        )
    return "\n".join(lines)


def format_disclaimer() -> str:
    return (
        "\n\n⚠️ *Disclaimer:* This is general information only and does NOT constitute "
        "legal advice. Laws may have changed. Always consult a qualified lawyer for your "
        "specific situation. NyayMitra is not liable for any decisions made based on "
        "this information."
    )
