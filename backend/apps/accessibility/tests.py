from django.test import TestCase
from .models import AccessibilityLocation
from .services import get_nearby_locations


class NearbyLocationsTest(TestCase):
    def setUp(self):
        AccessibilityLocation.objects.create(
            name="Central Station", latitude=51.5074, longitude=-0.1278,
            location_type="station",
        )
        AccessibilityLocation.objects.create(
            name="Far Away Stop", latitude=52.0, longitude=1.0,
            location_type="bus_stop",
        )

    def test_nearby_returns_close_location(self):
        results = get_nearby_locations(51.5074, -0.1278, radius_km=0.5)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Central Station")

    def test_nearby_excludes_distant_location(self):
        results = get_nearby_locations(51.5074, -0.1278, radius_km=0.5)
        names = [r.name for r in results]
        self.assertNotIn("Far Away Stop", names)
