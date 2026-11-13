import json
import logging
import os
import socket

from django.conf import settings

from google import genai
from google.genai import types

DEFAULT_TIMEOUT_SECONDS = 15

logger = logging.getLogger(__name__)


class GeminiAPIError(Exception):
    pass


class GeminiRateLimitError(GeminiAPIError):
    pass


class GeminiUnavailableError(GeminiAPIError):
    pass


class GeminiInvalidResponseError(GeminiAPIError):
    pass


def _get_config():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model = os.environ.get("GEMINI_MODEL", "").strip()
    try:
        timeout = float(os.environ.get("GEMINI_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
    except (TypeError, ValueError):
        timeout = float(DEFAULT_TIMEOUT_SECONDS)
    return api_key, model, timeout


def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    return code == 429 or "429" in msg or "rate" in msg and "limit" in msg or "resource_exhausted" in msg


def _is_timeout_or_unavailable(exc: Exception) -> bool:
    if isinstance(exc, (TimeoutError, socket.timeout, ConnectionError)):
        return True
    msg = str(exc).lower()
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if code in (408, 500, 502, 503, 504):
        return True
    return any(s in msg for s in ["timeout", "timed out", "unavailable", "temporarily", "connection", "network", "503", "502", "504"])


def generate_classification_json(system_instruction: str, user_prompt: str) -> str:
    if not getattr(settings, "GEMINI_ENABLED", True):
        raise GeminiUnavailableError("Gemini is disabled (GEMINI_ENABLED=false or running tests).")
    api_key, model, timeout = _get_config()
    if not api_key or not model:
        raise GeminiUnavailableError("Gemini is not configured.")

    try:
        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.1,
            response_mime_type="application/json",
            http_options=types.HttpOptions(timeout=int(timeout * 1000)),
        )
        response = client.models.generate_content(
            model=model,
            contents=user_prompt,
            config=config,
        )
    except Exception as exc:
        # Keep the provider's own message in the server log; the API response stays generic.
        logger.warning("Gemini call failed (model=%s): %s: %s", model, type(exc).__name__, str(exc)[:500])
        if _is_rate_limit_error(exc):
            raise GeminiRateLimitError("Gemini rate limit exceeded.") from exc
        if _is_timeout_or_unavailable(exc):
            raise GeminiUnavailableError("Gemini request timed out or service unavailable.") from exc
        # Try to map common SDK/http errors
        msg = str(exc).lower()
        if "api key" in msg or "unauthorized" in msg or "permission" in msg:
            raise GeminiAPIError("Gemini API authentication or permission error.") from exc
        raise GeminiAPIError(f"Gemini API error: {exc}") from exc

    try:
        text = getattr(response, "text", None)
        if not text:
            # fallback: extract from candidates/parts
            candidates = getattr(response, "candidates", None) or []
            if candidates:
                content = getattr(candidates[0], "content", None)
                parts = getattr(content, "parts", None) or []
                texts = [getattr(p, "text", "") for p in parts if getattr(p, "text", None)]
                text = "\n".join(texts).strip()
        text = (text or "").strip()
        if not text:
            raise GeminiInvalidResponseError("Gemini returned empty content.")
        return text
    except GeminiInvalidResponseError:
        raise
    except Exception as exc:
        raise GeminiInvalidResponseError("Gemini response schema unexpected.") from exc