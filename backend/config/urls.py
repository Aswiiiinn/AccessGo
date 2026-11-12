from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/accessibility/", include("apps.accessibility.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
