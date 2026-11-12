import json

ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"]


def build_system_instruction(allowed_categories):
    categories = sorted({str(c).strip() for c in allowed_categories if str(c).strip()})
    categories_json = json.dumps(categories)
    severities_json = json.dumps(ALLOWED_SEVERITIES)
    return (
        "You are an accessibility report classification assistant. "
        "Analyse the supplied report description and classify the accessibility issue using only the allowed categories and severity levels. "
        "Never invent facts, locations, evidence or accessibility conditions. "
        "If the description does not provide enough information, return an unknown or uncertain result. "
        "Do not decide whether the report is genuine or verified.\n"
        f"Allowed categories: {categories_json}\n"
        f"Allowed severity levels: {severities_json}\n"
        "Return a single JSON object with keys: "
        "category (string), severity (string), keywords (array of strings), summary (string), confidence (number 0..1 or null).\n"
        "If uncertain, set category to \"unknown\" (only if present in allowed categories, otherwise choose the closest allowed category) "
        "and lower confidence; do not invent details."
    )


def build_user_prompt(title: str, description: str, user_category: str = "", user_severity: str = ""):
    payload = {
        "title": (title or "").strip(),
        "description": (description or "").strip(),
        "user_provided_category": (user_category or "").strip(),
        "user_provided_severity": (user_severity or "").strip(),
    }
    return (
        "Classify this accessibility report. Use only the provided text. "
        "Do not override user-provided values; suggest classification only.\n"
        f"Report JSON:\n{json.dumps(payload, ensure_ascii=False)}"
    )