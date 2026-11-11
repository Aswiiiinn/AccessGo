from django.contrib import admin
from .models import AccessibilityLocation, AccessibilityAttribute

@admin.register(AccessibilityLocation)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "location_type", "latitude", "longitude", "is_active")
    list_filter = ("location_type", "is_active")
    search_fields = ("name", "address")

@admin.register(AccessibilityAttribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ("location", "attribute_type", "is_available")
    list_filter = ("attribute_type", "is_available")
