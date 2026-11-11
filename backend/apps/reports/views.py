from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import AccessibilityReport, ReportImage
from .serializers import (
    AccessibilityReportSerializer,
    ReportVerificationSerializer,
    ReportImageSerializer,
    ReportImageUploadSerializer,
)
from .permissions import IsAuthorOrReadOnly, IsVerifierNotAuthor, IsImageOwner
from .services import add_verification, add_image, delete_image


class AccessibilityReportViewSet(viewsets.ModelViewSet):
    queryset = AccessibilityReport.objects.select_related(
        "author", "location"
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
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def verify(self, request, pk=None):
        if not request.user or not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated()
        report = self.get_object()
        # Prevent authors from verifying their own report
        if report.author == request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot verify your own report.")
        serializer = ReportVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = add_verification(
            report,
            request.user,
            serializer.validated_data["vote"],
            serializer.validated_data.get("comment", ""),
        )
        return Response(
            ReportVerificationSerializer(verification).data,
            status=status.HTTP_201_CREATED,
        )


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
            from rest_framework.exceptions import PermissionDenied
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
