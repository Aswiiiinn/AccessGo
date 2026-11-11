from django.contrib import admin
from .models import AccessibilityReport, ReportImage, ReportVerification

@admin.register(AccessibilityReport)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "location", "status", "accessibility_impact", "created_at")
    list_filter = ("status", "accessibility_impact")
    search_fields = ("title", "description")

@admin.register(ReportVerification)
class VerificationAdmin(admin.ModelAdmin):
    list_display = ("report", "verifier", "vote", "created_at")
    list_filter = ("vote",)
