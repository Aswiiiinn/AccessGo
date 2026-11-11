import json
import logging
import urllib.request
import urllib.error
from django.conf import settings
from .schemas import validate_classification, ClassificationResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an accessibility report classifier.
Given a user's report text, return ONLY a JSON object with these fields:
- category: one of elevator, ramp, tactile_paving, accessible_toilet, hearing_loop, braille_signage, step_free, other
- issue: short snake_case description of the specific problem
- description: one sentence summary
- accessibility_impact: one of low, medium, high, critical
- confidence: float between 0.0 and 1.0

Do not invent locations. Do not add any text outside the JSON object."""


def classify_report(report_text: str) -> ClassificationResult | None:
    """
    Sends report_text to the configured LLM API and returns a validated ClassificationResult.
    Returns None on any failure — callers must handle the None case gracefully.
    AI classification never auto-verifies a report.
    """
    api_key = settings.AI_API_KEY
    api_url = settings.AI_API_URL

    if not api_key or not api_url:
        logger.warning("AI service not configured — skipping classification.")
        return None

    payload = json.dumps({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": report_text},
        ],
        "temperature": 0.2,
    }).encode("utf-8")

    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = json.loads(response.read())
            content = body["choices"][0]["message"]["content"]
            raw = json.loads(content)
            return validate_classification(raw)
    except (urllib.error.URLError, KeyError, json.JSONDecodeError) as exc:
        logger.error("AI API request failed: %s", exc)
        return None
    except ValueError as exc:
        logger.error("AI response validation failed: %s", exc)
        return None
