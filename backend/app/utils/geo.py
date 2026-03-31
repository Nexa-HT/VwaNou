from __future__ import annotations

from collections import defaultdict
from math import asin, cos, radians, sin, sqrt


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in meters using the Haversine formula."""
    earth_radius_m = 6_371_000

    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    )
    c = 2 * asin(sqrt(a))
    return earth_radius_m * c


def cluster_incidents(incidents: list[dict], precision: int = 2) -> list[dict]:
    """
    Group incidents by approximate geohash-like buckets.
    Precision 2 is suitable for simple city-level cluster previews.
    """
    buckets: dict[tuple[float, float], list[dict]] = defaultdict(list)
    for incident in incidents:
        key = (round(incident["lat"], precision), round(incident["lng"], precision))
        buckets[key].append(incident)

    clusters: list[dict] = []
    for (_, _), grouped in buckets.items():
        center_lat = sum(item["lat"] for item in grouped) / len(grouped)
        center_lng = sum(item["lng"] for item in grouped) / len(grouped)
        clusters.append(
            {
                "lat": center_lat,
                "lng": center_lng,
                "count": len(grouped),
                "incident_ids": [item["id"] for item in grouped],
            }
        )

    return clusters


def prepare_heatmap_points(incidents: list[dict]) -> list[dict]:
    points: list[dict] = []
    for incident in incidents:
        urgency_norm = max(incident.get("urgency", 1), 1) / 3.0
        confidence = min(max(incident.get("confidence_score", 0.0), 0.0), 1.0)
        intensity = round(min((confidence * 0.7) + (urgency_norm * 0.3), 1.0), 4)

        points.append(
            {
                "lat": incident["lat"],
                "lng": incident["lng"],
                "intensity": intensity,
            }
        )

    return points


def _point_in_polygon(lat: float, lng: float, polygon: list[list[float]]) -> bool:
    inside = False
    n = len(polygon)
    if n < 3:
        return False

    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]

        intersects = ((xi > lng) != (xj > lng)) and (
            lat < (yj - yi) * (lng - xi) / ((xj - xi) or 1e-12) + yi
        )
        if intersects:
            inside = not inside
        j = i

    return inside


def aggregate_zone_risk(zones: list[dict], incidents: list[dict]) -> list[dict]:
    aggregated: list[dict] = []

    for zone in zones:
        matched = [
            incident
            for incident in incidents
            if _point_in_polygon(incident["lat"], incident["lng"], zone["coordinates"])
        ]

        if not matched:
            avg_intensity = 0.0
        else:
            heat = prepare_heatmap_points(matched)
            avg_intensity = round(
                sum(point["intensity"] for point in heat) / len(heat),
                4,
            )

        aggregated.append(
            {
                "zone_id": zone["id"],
                "zone_name": zone["name"],
                "level": zone["level"],
                "incident_count": len(matched),
                "average_intensity": avg_intensity,
            }
        )

    return aggregated
