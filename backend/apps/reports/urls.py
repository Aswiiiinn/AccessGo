from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccessibilityReportViewSet, ReportImageView, ClassificationReviewView, PotentialDuplicateListView, PotentialDuplicateReviewView

router = DefaultRouter()
router.register("", AccessibilityReportViewSet, basename="report")

urlpatterns = [
    # Must precede the router: its detail route (^<pk>/$) would otherwise capture "duplicate-reports/".
    path("duplicate-reports/", PotentialDuplicateListView.as_view(), name="admin-duplicate-reports"),
    path("duplicate-reports/<int:pk>/review/", PotentialDuplicateReviewView.as_view(), name="admin-duplicate-review"),
    path("", include(router.urls)),
    path("<int:report_pk>/images/", ReportImageView.as_view(), name="report-images"),
    path("<int:report_pk>/images/<int:pk>/", ReportImageView.as_view(), name="report-image-detail"),
    path("<int:report_pk>/classification/review/", ClassificationReviewView.as_view(), name="classification-review"),
    path("<int:report_pk>/potential-duplicates/", AccessibilityReportViewSet.potential_duplicates, name="report-potential-duplicates"),
]
