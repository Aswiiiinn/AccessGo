from django.db import models


class AccessibilityLocation(models.Model):
    class LocationType(models.TextChoices):
        STATION = "station", "Station"
        BUS_STOP = "bus_stop", "Bus Stop"
        ENTRANCE = "entrance", "Entrance"
        PATHWAY = "pathway", "Pathway"
        OTHER = "other", "Other"

    name = models.CharField(max_length=255)
    location_type = models.CharField(max_length=20, choices=LocationType.choices, default=LocationType.OTHER)
    address = models.CharField(max_length=500, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["location_type"]),
        ]

    def __str__(self):
        return self.name


class AccessibilityAttribute(models.Model):
    class AttributeType(models.TextChoices):
        ELEVATOR = "elevator", "Elevator"
        RAMP = "ramp", "Ramp"
        TACTILE_PAVING = "tactile_paving", "Tactile Paving"
        ACCESSIBLE_TOILET = "accessible_toilet", "Accessible Toilet"
        HEARING_LOOP = "hearing_loop", "Hearing Loop"
        BRAILLE_SIGNAGE = "braille_signage", "Braille Signage"
        STEP_FREE = "step_free", "Step-Free Access"
        OTHER = "other", "Other"

    location = models.ForeignKey(
        AccessibilityLocation, on_delete=models.CASCADE, related_name="attributes"
    )
    attribute_type = models.CharField(max_length=30, choices=AttributeType.choices)
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("location", "attribute_type")

    def __str__(self):
        return f"{self.location.name} — {self.attribute_type}"
