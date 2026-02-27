"""
transcribe.py — Voice-to-text stub (mocks AWS Transcribe for demo)
In production: use boto3 + Amazon Transcribe Streaming or pre-recorded job.
"""
import logging
import random

logger = logging.getLogger(__name__)

# Sample phrases that simulate transcription for demo purposes
_DEMO_TRANSCRIPTIONS = [
    "My landlord is refusing to return my security deposit after I moved out.",
    "I have not received my salary for the past two months from my employer.",
    "My husband is physically abusing me and I need help understanding my legal options.",
    "I received a fake WhatsApp message and I lost money through a UPI transfer.",
    "Can you help me understand how to file an FIR at the police station?",
    "My employer fired me without any notice or explanation. What are my rights?",
]


def transcribe_audio(audio_url: str, language_code: str = "en-IN") -> dict:
    """
    Simulated transcription of a voice message.

    In production, this would:
    1. Download the audio file from Twilio's media URL
    2. Upload to S3
    3. Start a Transcribe job (or use streaming)
    4. Poll/wait for completion
    5. Return the transcript

    Args:
        audio_url: URL of the audio file (from Twilio MediaUrl)
        language_code: BCP-47 language code (e.g., 'en-IN', 'kn-IN', 'hi-IN')

    Returns:
        dict with 'transcript', 'confidence', 'language', 'is_mock'
    """
    logger.info("Mock transcribe called for audio URL: %s (lang: %s)", audio_url, language_code)

    # In production: real boto3 call would go here
    # transcribe_client = boto3.client("transcribe", region_name=settings.aws_region)
    # job_name = f"nyaymitra-{uuid.uuid4()}"
    # transcribe_client.start_transcription_job(...)

    transcript = random.choice(_DEMO_TRANSCRIPTIONS)

    return {
        "transcript": transcript,
        "confidence": 0.92,
        "language": language_code,
        "is_mock": True,
        "note": "⚠️ Voice transcription is simulated. Real AWS Transcribe integration pending.",
    }
