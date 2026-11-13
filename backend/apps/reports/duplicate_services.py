import math
import logging

from django.db.models import Q
from django.conf import settings

from .models import AccessibilityReport, ReportClassification, PotentialDuplicate

logger = logging.getLogger(__name__)

DUPLICATE_RADIUS_METERS = float(getattr(settings, "DUPLICATE_RADIUS_METERS", 100.0))
DUPLICATE_MIN_SIMILARITY = float(getattr(settings, "DUPLICATE_MIN_SIMILARITY", 0.3))


def _haversine(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return float("inf")
    r = 6371000.0
    p1 = math.radians(float(lat1))
    p2 = math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlam = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _tokenize(text):
    return set((text or "").lower().replace(",", " ").replace(".", " ").replace("!", " ").split())


def _jaccard_similarity(a, b):
    ta = _tokenize(a)
    tb = _tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def _category_similarity(cat1, cat2):
    if not cat1 or not cat2:
        return 0.0
    return 1.0 if str(cat1).strip().lower() == str(cat2).strip().lower() else 0.0


def _find_candidates(report):
    loc = report.location
    if not loc:
        return AccessibilityReport.objects.none()
    qs = AccessibilityReport.objects.select_related("location", "author").exclude(pk=report.pk)
    candidates = []
    for other in qs.iterator():
        if not other.location:
            continue
        dist = _haversine(loc.latitude, loc.longitude, other.location.latitude, other.location.longitude)
        if dist <= DUPLICATE_RADIUS_METERS:
            candidates.append((other, dist))
    return candidates


def detect_potential_duplicates(report, max_candidates=5):
    candidates = _find_candidates(report)
    if not candidates:
        return []

    results = []
    for other, dist in candidates:
        text_sim = _jaccard_similarity(report.description, other.description)
        cat_sim = _category_similarity(report.category, other.category)
        cat_sim2 = _category_similarity(report.category, getattr(other, "category", ""))
        cat_sim = max(cat_sim, cat_sim2)
        score = 0.6 * text_sim + 0.4 * cat_sim
        if score < DUPLICATE_MIN_SIMILARITY:
            continue
        results.append((other, score, dist))

    results.sort(key=lambda x: x[1], reverse=True)
    return results[:max_candidates]


def _store_duplicate_pair(source_report, matched_report, similarity_score, detection_method):
    if source_report.pk == matched_report.pk:
        return None
    a, b = (source_report, matched_report) if source_report.pk < matched_report.pk else (matched_report, source_report)
    obj, created = PotentialDuplicate.objects.get_or_create(
        source_report=a,
        matched_report=b,
        defaults={
            "similarity_score": similarity_score,
            "detection_method": detection_method,
            "status": PotentialDuplicate.Status.SUGGESTED,
        },
    )
    if not created and obj.status == PotentialDuplicate.Status.SUGGESTED:
        obj.similarity_score = similarity_score
        obj.detection_method = detection_method
        obj.save(update_fields=["similarity_score", "detection_method", "updated_at"])
    return obj


def create_potential_duplicates(report, max_candidates=5):
    matches = detect_potential_duplicates(report, max_candidates=max_candidates)
    created = []
    for other, score, dist in matches:
        obj = _store_duplicate_pair(
            report,
            other,
            similarity_score=score,
            detection_method="heuristic",
        )
        if obj:
            created.append(obj)
    return created


def get_potential_duplicates_for_report(report):
    qs = PotentialDuplicate.objects.filter(
        Q(source_report=report) | Q(matched_report=report)
    ).select_related("source_report", "matched_report", "reviewed_by").order_by("-created_at")
    return qs


def review_duplicate(duplicate_id, admin_user, action, reason=""):
    try:
        duplicate = PotentialDuplicate.objects.select_related("source_report", "matched_report").get(pk=duplicate_id)
    except PotentialDuplicate.DoesNotExist:
        from rest_framework.exceptions import Http404
        raise Http404("Duplicate suggestion not found.")
    if action not in (PotentialDuplicate.Status.CONFIRMED, PotentialDuplicate.Status.DISMISSED):
        from rest_framework.exceptions import ValidationError
        raise ValidationError({"detail": "Invalid action."})
    duplicate.status = action
    duplicate.reviewed_by = admin_user
    duplicate.reviewed_at = __import__("django").utils.timezone.now()
    if reason:
        duplicate.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    else:
        duplicate.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    return duplicate


def get_admin_duplicate_reports_queryset(status=None):
    qs = PotentialDuplicate.objects.select_related(
        "source_report", "matched_report", "reviewed_by"
    ).order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    return qs