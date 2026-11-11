from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccessibilityReportViewSet

router = DefaultRouter()
router.register("", AccessibilityReportViewSet, basename="report")

urlpatterns = [path("", include(router.urls))]
