from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccessibilityLocationViewSet

router = DefaultRouter()
router.register("locations", AccessibilityLocationViewSet, basename="location")

urlpatterns = [path("", include(router.urls))]
