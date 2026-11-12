from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from django.shortcuts import get_object_or_404

from .models import AccessibilityReport, ReportClassification, ReportImage, ReportVerification
from .serializers import (
    AccessibilityReportSerializer,
    ReportClassificationSerializer,
    ReportVerificationSerializer,
    ReportImageSerializer,
    ReportImageUploadSerializer,
    AdminReportStatusSerializer,
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
        except Exception:
            # Report creation must succeed even if classification setup/execution fails.
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
