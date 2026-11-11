import math
from .models import AccessibilityLocation


def get_nearby_locations(latitude: float, longitude: float, radius_km: float = 1.0):
    """
    Returns locations within radius_km of the given coordinates.
    Uses a bounding-box pre-filter then Haversine for accuracy.
    Designed to be swappable with PostGIS ST_DWithin when migrating.
    """
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * math.cos(math.radians(latitude)))

    candidates = AccessibilityLocation.objects.filter(
        is_active=True,
        latitude__range=(latitude - lat_delta, latitude + lat_delta),
        longitude__range=(longitude - lng_delta, longitude + lng_delta),
    )

    results = []
    for location in candidates:
        distance = _haversine(latitude, longitude, float(location.latitude), float(location.longitude))
        if distance <= radius_km:
            results.append((location, distance))

    results.sort(key=lambda x: x[1])
    return [loc for loc, _ in results]


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
