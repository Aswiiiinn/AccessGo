from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccessibilityReportViewSet, ReportImageView

router = DefaultRouter()
router.register("", AccessibilityReportViewSet, basename="report")

urlpatterns = [
    path("", include(router.urls)),
    path("<int:report_pk>/images/", ReportImageView.as_view(), name="report-images"),
    path("<int:report_pk>/images/<int:pk>/", ReportImageView.as_view(), name="report-image-detail"),
]
