from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
import math

from rest_framework import serializers as drf_serializers

from .models import AccessibilityReport, ReportClassification, ReportImage, ReportVerification, ClassificationReview, PotentialDuplicate
from .serializers import (
    AccessibilityReportSerializer,
    ReportClassificationSerializer,
    ReportVerificationSerializer,
    ReportImageSerializer,
    ReportImageUploadSerializer,
    AdminReportStatusSerializer,
    ClassificationReviewSerializer,
    ClassificationReviewRequestSerializer,
    PotentialDuplicateListSerializer,
    PotentialDuplicateReviewRequestSerializer,
)
from .permissions import IsAuthorOrAdmin, IsAuthorOrReadOnly, IsImageOwner
from .services import (
    add_verification,
    change_verification,
    classify_report_async,
    withdraw_verification,
    add_image,
    delete_image,
    update_report_status,
    review_classification,
    get_classification_reviews_for_report,
    create_potential_duplicates,
    get_potential_duplicates_for_report,
    review_duplicate,
    get_admin_duplicate_reports_queryset,
)
from apps.accounts.permissions import IsAdminUser


class AccessibilityReportViewSet(viewsets.ModelViewSet):
    queryset = AccessibilityReport.objects.select_related(
        "author", "location", "classification"
    ).prefetch_related("images", "verifications")
    serializer_class = AccessibilityReportSerializer
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    filterset_fields = ("status", "location", "accessibility_impact")
    search_fields = ("title", "description")
    ordering_fields = ("created_at", "accessibility_impact")

    def get_queryset(self):
        qs = super().get_queryset()
        # GET /reports/?author=me — the requesting user's own reports (used by "My Reports").
        if self.action == "list" and self.request.query_params.get("author") == "me":
            user = self.request.user
            return qs.filter(author=user) if user.is_authenticated else qs.none()
        return qs

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAuthorOrReadOnly()]
        if self.action == "set_status":
            return [permissions.IsAuthenticated(), IsAdminUser()]
        if self.action == "classification":
            return [permissions.IsAuthenticated(), IsAuthorOrAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        report = serializer.save(author=self.request.user)
        try:
            ReportClassification.objects.get_or_create(
                report=report,
                defaults={"classification_status": ReportClassification.Status.PENDING},
            )
            classify_report_async(report)
            create_potential_duplicates(report)
        except Exception:
            # Report creation must succeed even if classification/duplicate detection fails.
            pass

    def _require_auth(self, request):
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated()

    def _get_report_checked(self, request):
        """Get report and enforce self-verification guard."""
        report = self.get_object()
        if report.author == request.user:
            raise PermissionDenied("You cannot verify your own report.")
        return report

    # VER-01: POST /reports/{id}/verify/
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def verify(self, request, pk=None):
        self._require_auth(request)
        report = self._get_report_checked(request)
        serializer = ReportVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = add_verification(
            report,
            request.user,
            serializer.validated_data["vote"],
            serializer.validated_data.get("comment", ""),
        )
        return Response(ReportVerificationSerializer(verification).data, status=status.HTTP_201_CREATED)

    # VER-02: POST /reports/{id}/dispute/
    @action(detail=True, methods=["post"], url_path="dispute", permission_classes=[permissions.IsAuthenticated])
    def dispute(self, request, pk=None):
        self._require_auth(request)
        report = self._get_report_checked(request)
        verification = add_verification(
            report,
            request.user,
            ReportVerification.Vote.DISPUTE,
            request.data.get("comment", ""),
        )
        return Response(ReportVerificationSerializer(verification).data, status=status.HTTP_201_CREATED)

    # VER-03: GET /reports/{id}/verifications/
    @action(detail=True, methods=["get"], url_path="verifications", permission_classes=[permissions.AllowAny])
    def verifications(self, request, pk=None):
        report = self.get_object()
        qs = report.verifications.select_related("verifier").order_by("-created_at")
        serializer = ReportVerificationSerializer(qs, many=True)
        return Response(serializer.data)

    # VER-04: DELETE /reports/{id}/my-verification/
    @action(detail=True, methods=["delete"], url_path="my-verification", permission_classes=[permissions.IsAuthenticated])
    def my_verification(self, request, pk=None):
        self._require_auth(request)
        report = self.get_object()
        withdraw_verification(report, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH /reports/{id}/my-verification/ — change existing vote
    @my_verification.mapping.patch
    def update_my_verification(self, request, pk=None):
        self._require_auth(request)
        report = self.get_object()
        if report.author == request.user:
            raise PermissionDenied("You cannot verify your own report.")
        serializer = ReportVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = change_verification(
            report,
            request.user,
            serializer.validated_data["vote"],
            serializer.validated_data.get("comment", ""),
        )
        return Response(ReportVerificationSerializer(verification).data)

    # Admin: PATCH /reports/{id}/set-status/
    @action(detail=True, methods=["patch"], url_path="set-status", permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def set_status(self, request, pk=None):
        report = self.get_object()
        serializer = AdminReportStatusSerializer(report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_report_status(report, serializer.validated_data["status"])
        return Response(AccessibilityReportSerializer(updated).data)

    @action(detail=True, methods=["get"], url_path="classification", permission_classes=[permissions.IsAuthenticated, IsAuthorOrAdmin])
    def classification(self, request, pk=None):
        report = self.get_object()
        classification, _ = ReportClassification.objects.get_or_create(
            report=report,
            defaults={"classification_status": ReportClassification.Status.PENDING},
        )
        return Response(ReportClassificationSerializer(classification).data)

    @action(detail=True, methods=["post"], url_path="classification/review", permission_classes=[permissions.IsAuthenticated, IsAuthorOrAdmin])
    def classification_review(self, request, pk=None):
        report = self.get_object()
        serializer = ClassificationReviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = review_classification(
            report,
            request.user,
            serializer.validated_data["action"],
            serializer.validated_data.get("reason", ""),
        )
        return Response(ClassificationReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="classification/reviews", permission_classes=[permissions.IsAuthenticated, IsAuthorOrAdmin])
    def classification_reviews(self, request, pk=None):
        report = self.get_object()
        qs = get_classification_reviews_for_report(report)
        return Response(ClassificationReviewSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="potential-duplicates", permission_classes=[permissions.IsAuthenticated, IsAuthorOrAdmin])
    def potential_duplicates(self, request, pk=None):
        report = self.get_object()
        qs = get_potential_duplicates_for_report(report)
        return Response(PotentialDuplicateListSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="near-route", permission_classes=[permissions.AllowAny])
    def near_route(self, request):
        """Return reports within a configurable distance (meters) of a route polyline."""
        route = request.data.get("route")
        distance_m = request.data.get("distance_m", 50)
        if not isinstance(route, list) or len(route) < 2:
            return Response({"detail": "route must be a list of at least 2 [lat, lng] points."}, status=status.HTTP_400_BAD_REQUEST)
        if len(route) > 500:
            return Response({"detail": "route has too many points (max 500)."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            distance_m = float(distance_m)
        except (TypeError, ValueError):
            return Response({"detail": "distance_m must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        if distance_m <= 0 or distance_m > 2000:
            return Response({"detail": "distance_m must be between 1 and 2000."}, status=status.HTTP_400_BAD_REQUEST)

        points = []
        for p in route:
            if not isinstance(p, (list, tuple)) or len(p) < 2:
                return Response({"detail": "Each route point must be [lat, lng]."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                lat, lng = float(p[0]), float(p[1])
            except (TypeError, ValueError):
                return Response({"detail": "Route coordinates must be numeric."}, status=status.HTTP_400_BAD_REQUEST)
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                return Response({"detail": "Route coordinates out of range."}, status=status.HTTP_400_BAD_REQUEST)
            points.append((lat, lng))

        # Bounding box prefilter with buffer
        lats = [p[0] for p in points]
        lngs = [p[1] for p in points]
        # ~111320 m per degree lat; lng varies
        lat_buffer = distance_m / 111320.0
        mean_lat = sum(lats) / len(lats)
        lng_buffer = distance_m / (111320.0 * max(math.cos(math.radians(mean_lat)), 0.01))
        min_lat, max_lat = min(lats) - lat_buffer, max(lats) + lat_buffer
        min_lng, max_lng = min(lngs) - lng_buffer, max(lngs) + lng_buffer

        qs = self.get_queryset().select_related("location", "author", "classification").prefetch_related(
            "images", "verifications"
        ).filter(
            location__latitude__gte=min_lat,
            location__latitude__lte=max_lat,
            location__longitude__gte=min_lng,
            location__longitude__lte=max_lng,
        )

        def haversine_m(lat1, lon1, lat2, lon2):
            R = 6371000.0
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dl = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
            return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        def point_to_segment_distance_m(p, a, b):
            # Equirectangular projection approximation for short distances
            lat, lng = p
            lat1, lng1 = a
            lat2, lng2 = b
            x = (lng - lng1) * math.cos(math.radians((lat1 + lat2) / 2)) * 111320.0
            y = (lat - lat1) * 111320.0
            x2 = (lng2 - lng1) * math.cos(math.radians((lat1 + lat2) / 2)) * 111320.0
            y2 = (lat2 - lat1) * 111320.0
            seg_len2 = x2 * x2 + y2 * y2
            if seg_len2 == 0:
                return math.sqrt(x * x + y * y)
            t = max(0.0, min(1.0, (x * x2 + y * y2) / seg_len2))
            projx = t * x2
            projy = t * y2
            dx = x - projx
            dy = y - projy
            return math.sqrt(dx * dx + dy * dy)

        def min_distance_to_route_m(lat, lng):
            p = (lat, lng)
            min_d = float("inf")
            for i in range(len(points) - 1):
                d = point_to_segment_distance_m(p, points[i], points[i + 1])
                if d < min_d:
                    min_d = d
            return min_d

        matched = []
        for report in qs:
            loc = report.location
            if not loc:
                continue
            lat = float(loc.latitude)
            lng = float(loc.longitude)
            d = min_distance_to_route_m(lat, lng)
            if d <= distance_m:
                matched.append(report)

        serializer = self.get_serializer(matched, many=True)
        return Response({"count": len(matched), "distance_m": distance_m, "results": serializer.data})


class ReportImageView(APIView):
    """
    POST   /api/v1/reports/{report_pk}/images/       — upload image
    DELETE /api/v1/reports/{report_pk}/images/{pk}/  — delete image
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = (permissions.IsAuthenticated,)

    def _get_report_for_author(self, report_pk, user):
        report = get_object_or_404(
            AccessibilityReport.objects.select_related("author"), pk=report_pk
        )
        if report.author != user:
            raise PermissionDenied("Only the report author can manage images.")
        return report

    def post(self, request, report_pk):
        report = self._get_report_for_author(report_pk, request.user)
        serializer = ReportImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = add_image(report, serializer.validated_data["image"])
        return Response(ReportImageSerializer(image).data, status=status.HTTP_201_CREATED)

    def delete(self, request, report_pk, pk):
        report = self._get_report_for_author(report_pk, request.user)
        image = get_object_or_404(ReportImage, pk=pk, report=report)
        delete_image(image)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClassificationReviewView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, report_pk):
        report = get_object_or_404(AccessibilityReport, pk=report_pk)
        user = request.user
        if not (user == report.author or getattr(user, "is_admin_user", False)):
            raise PermissionDenied("Only the report author or an admin can review AI suggestions.")
        serializer = ClassificationReviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = review_classification(
            report,
            user,
            serializer.validated_data["action"],
            serializer.validated_data.get("reason", ""),
        )
        return Response(ClassificationReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class PotentialDuplicateListView(ListAPIView):
    permission_classes = (IsAdminUser,)
    serializer_class = PotentialDuplicateListSerializer
    queryset = get_admin_duplicate_reports_queryset()
    filterset_fields = ("status",)
    search_fields = ("source_report__title", "matched_report__title")
    ordering_fields = ("created_at", "similarity_score")
    ordering = ("-created_at",)


class PotentialDuplicateReviewView(APIView):
    permission_classes = (IsAdminUser,)

    def post(self, request, pk):
        duplicate = get_object_or_404(PotentialDuplicate, pk=pk)
        serializer = PotentialDuplicateReviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # The request uses verbs ("confirm"/"dismiss"); the service expects the resulting status.
        action = {
            "confirm": PotentialDuplicate.Status.CONFIRMED,
            "dismiss": PotentialDuplicate.Status.DISMISSED,
        }[serializer.validated_data["action"]]
        reason = serializer.validated_data.get("reason", "")
        duplicate = review_duplicate(pk, request.user, action, reason)
        return Response(PotentialDuplicateListSerializer(duplicate).data)
