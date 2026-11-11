from dataclasses import dataclass
from typing import Literal


VALID_CATEGORIES = {
    "elevator", "ramp", "tactile_paving", "accessible_toilet",
    "hearing_loop", "braille_signage", "step_free", "other",
}

VALID_IMPACTS = {"low", "medium", "high", "critical"}


@dataclass
class ClassificationResult:
    category: str
    issue: str
    description: str
    accessibility_impact: str
    confidence: float

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "issue": self.issue,
            "description": self.description,
            "accessibility_impact": self.accessibility_impact,
            "confidence": self.confidence,
        }


def validate_classification(data: dict) -> ClassificationResult:
    required = {"category", "issue", "description", "accessibility_impact", "confidence"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"AI response missing fields: {missing}")

    if data["category"] not in VALID_CATEGORIES:
        raise ValueError(f"Invalid category: {data['category']}")

    if data["accessibility_impact"] not in VALID_IMPACTS:
        raise ValueError(f"Invalid accessibility_impact: {data['accessibility_impact']}")

    confidence = float(data["confidence"])
    if not (0.0 <= confidence <= 1.0):
        raise ValueError(f"Confidence out of range: {confidence}")

    return ClassificationResult(
        category=data["category"],
        issue=str(data["issue"]),
        description=str(data["description"]),
        accessibility_impact=data["accessibility_impact"],
        confidence=confidence,
    )
