import json

from django.conf import settings

from .gemini_client import (
    GeminiAPIError,
    GeminiInvalidResponseError,
    GeminiRateLimitError,
    GeminiUnavailableError,
    generate_classification_json,
)
from .prompts import ALLOWED_SEVERITIES, build_system_instruction, build_user_prompt


class ClassificationValidationError(ValueError):
    pass


def _normalize_text(value):
    if value is None:
        return None
    text = str(value).strip().lower()
    return text or None


def _extract_json_object(text: str):
    text = (text or "").strip()
    if not text:
        raise GeminiInvalidResponseError("Empty AI response.")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise GeminiInvalidResponseError("AI response is not valid JSON.") from exc
    raise GeminiInvalidResponseError("AI response is not valid JSON.")


def _validate_payload(data: dict, allowed_categories, allowed_severities):
    if not isinstance(data, dict):
        raise ClassificationValidationError("AI response must be a JSON object.")

    allowed_categories_norm = {str(c).strip().lower() for c in allowed_categories if str(c).strip()}
    allowed_severities_norm = {str(s).strip().lower() for s in allowed_severities if str(s).strip()}

    raw_category = _normalize_text(data.get("category"))
    raw_severity = _normalize_text(data.get("severity") or data.get("suggested_severity") or data.get("accessibility_impact"))

    if raw_category not in allowed_categories_norm:
        raise ClassificationValidationError("Invalid category returned by AI.")
    if raw_severity not in allowed_severities_norm:
        raise ClassificationValidationError("Invalid severity returned by AI.")

    keywords = data.get("keywords", [])
    if keywords is None:
        keywords = []
    if not isinstance(keywords, list):
        raise ClassificationValidationError("Keywords must be a list.")
    cleaned_keywords = []
    for k in keywords:
        if k is None:
            continue
        s = str(k).strip()
        if s:
            cleaned_keywords.append(s)

    summary = data.get("summary", "")
    if summary is None:
        summary = ""
    if not isinstance(summary, str):
        summary = str(summary)
    summary = summary.strip()

    confidence = data.get("confidence", data.get("confidence_score", None))
    if confidence is None or confidence == "":
        confidence_score = None
    else:
        try:
            confidence_score = float(confidence)
        except (TypeError, ValueError) as exc:
            raise ClassificationValidationError("Invalid confidence returned by AI.") from exc
        if confidence_score < 0.0 or confidence_score > 1.0:
            raise ClassificationValidationError("Confidence out of range.")

    return {
        "suggested_category": raw_category,
        "suggested_severity": raw_severity,
        "keywords": cleaned_keywords,
        "summary": summary,
        "confidence_score": confidence_score,
    }


def classify_report_text(title: str, description: str, user_category: str = "", user_severity: str = "", allowed_categories=None):
    allowed_categories = allowed_categories or []
    if "unknown" not in {str(c).lower() for c in allowed_categories}:
        allowed_categories = list(allowed_categories) + ["unknown"]
    allowed_severities = list(getattr(settings, "AI_ALLOWED_SEVERITIES", ALLOWED_SEVERITIES))

    system_instruction = build_system_instruction(allowed_categories)
    user_prompt = build_user_prompt(title, description, user_category=user_category, user_severity=user_severity)
    raw_text = generate_classification_json(system_instruction, user_prompt)
    parsed = _extract_json_object(raw_text)
    return _validate_payload(parsed, allowed_categories, allowed_severities)


__all__ = [
    "classify_report_text",
    "ClassificationValidationError",
    "GeminiAPIError",
    "GeminiInvalidResponseError",
    "GeminiRateLimitError",
    "GeminiUnavailableError",
]