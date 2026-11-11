from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AccessibilityReport, ReportVerification
from .serializers import AccessibilityReportSerializer, ReportVerificationSerializer
from .permissions import IsAuthorOrReadOnly, IsVerifierNotAuthor
from .services import create_report, add_verification


class AccessibilityReportViewSet(viewsets.ModelViewSet):
    queryset = AccessibilityReport.objects.select_related("author", "location").prefetch_related("images", "verifications")
    serializer_class = AccessibilityReportSerializer
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
        create_report(self.request.user, serializer.validated_data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsVerifierNotAuthor])
    def verify(self, request, pk=None):
        report = self.get_object()
        serializer = ReportVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = add_verification(
            report, request.user,
            serializer.validated_data["vote"],
            serializer.validated_data.get("comment", ""),
        )
        return Response(ReportVerificationSerializer(verification).data, status=status.HTTP_201_CREATED)
