import math
import gpxpy
import gpxpy.gpx

MOVING_SPEED_THRESHOLD = 0.5  # m/s — below this is considered stopped


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance between two GPS points in meters."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _extract_extension_value(point: gpxpy.gpx.GPXTrackPoint, tags: list[str]) -> int | None:
    """Extract a numeric value from GPX point extensions by tag name."""
    for ext in point.extensions:
        tag = ext.tag.lower()
        if "}" in tag:
            tag = tag.split("}")[1]
        if tag in tags:
            try:
                return int(float(ext.text or 0))
            except (ValueError, TypeError):
                pass
        # Check nested children (Garmin TrackPointExtension)
        for child in ext:
            child_tag = child.tag.lower()
            if "}" in child_tag:
                child_tag = child_tag.split("}")[1]
            if child_tag in tags:
                try:
                    return int(float(child.text or 0))
                except (ValueError, TypeError):
                    pass
    return None


def parse_gpx(content: bytes) -> dict:
    """Parse GPX file and return geometry, stats, and elevation profile."""
    gpx = gpxpy.parse(content.decode("utf-8"))

    # Collect all track points
    points: list[gpxpy.gpx.GPXTrackPoint] = []
    for track in gpx.tracks:
        for segment in track.segments:
            points.extend(segment.points)

    # Fallback: waypoints only
    if not points:
        points = list(gpx.waypoints)

    if not points:
        return {"error": "Aucun point GPS trouvé dans le fichier"}

    coords = [[p.longitude, p.latitude] for p in points]
    has_elevation = any(p.elevation is not None for p in points)
    has_timestamps = any(p.time is not None for p in points)

    # GeoJSON geometry
    geometry = (
        {"type": "Point", "coordinates": coords[0]}
        if len(coords) == 1
        else {"type": "LineString", "coordinates": coords}
    )

    stats: dict = {"num_points": len(points)}

    # --- Distance ---
    total_distance = 0.0
    for i in range(1, len(points)):
        p1, p2 = points[i - 1], points[i]
        total_distance += haversine(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
    stats["distance_m"] = round(total_distance)

    # --- Elevation ---
    if has_elevation:
        elevations = [p.elevation for p in points if p.elevation is not None]
        stats["elevation_min"] = round(min(elevations))
        stats["elevation_max"] = round(max(elevations))
        gain = loss = 0.0
        for i in range(1, len(points)):
            e1, e2 = points[i - 1].elevation, points[i].elevation
            if e1 is not None and e2 is not None:
                diff = e2 - e1
                if diff > 0:
                    gain += diff
                else:
                    loss += abs(diff)
        stats["elevation_gain"] = round(gain)
        stats["elevation_loss"] = round(loss)

    # --- Time-based stats ---
    if has_timestamps:
        times = [p.time for p in points if p.time is not None]
        if len(times) >= 2:
            total_duration = (times[-1] - times[0]).total_seconds()
            stats["duration_s"] = round(total_duration)

            moving_time = 0.0
            speeds: list[float] = []

            for i in range(1, len(points)):
                p1, p2 = points[i - 1], points[i]
                if p1.time is None or p2.time is None:
                    continue
                dt = (p2.time - p1.time).total_seconds()
                if dt <= 0:
                    continue
                d = haversine(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
                speed = d / dt  # m/s
                speeds.append(speed)
                if speed > MOVING_SPEED_THRESHOLD:
                    moving_time += dt

            stats["moving_duration_s"] = round(moving_time)
            if total_duration > 0:
                stats["avg_speed_kmh"] = round(total_distance / total_duration * 3.6, 1)
            if moving_time > 0:
                stats["avg_moving_speed_kmh"] = round(total_distance / moving_time * 3.6, 1)
            if speeds:
                stats["max_speed_kmh"] = round(max(speeds) * 3.6, 1)

    # --- Sensor extensions ---
    hr_values, cadence_values, power_values = [], [], []
    calories = None

    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                hr = _extract_extension_value(point, ["hr", "heartrate", "heartratebpm"])
                if hr:
                    hr_values.append(hr)
                cad = _extract_extension_value(point, ["cad", "cadence", "runcadence"])
                if cad:
                    cadence_values.append(cad)
                pwr = _extract_extension_value(point, ["power", "watts", "pwr"])
                if pwr:
                    power_values.append(pwr)
                cal = _extract_extension_value(point, ["calories"])
                if cal:
                    calories = cal

    if hr_values:
        stats["avg_hr"] = round(sum(hr_values) / len(hr_values))
        stats["max_hr"] = max(hr_values)
    if cadence_values:
        stats["avg_cadence"] = round(sum(cadence_values) / len(cadence_values))
    if power_values:
        stats["avg_power"] = round(sum(power_values) / len(power_values))
    if calories is not None:
        stats["calories"] = calories

    # --- Elevation profile (downsampled to ≤500 points) ---
    elevation_profile = []
    if has_elevation:
        step = max(1, len(points) // 500)
        cumulative = 0.0
        for i in range(0, len(points), step):
            if i > 0:
                for j in range(max(0, i - step) + 1, i + 1):
                    cumulative += haversine(
                        points[j - 1].latitude, points[j - 1].longitude,
                        points[j].latitude, points[j].longitude,
                    )
            p = points[i]
            if p.elevation is not None:
                elevation_profile.append({
                    "distance_m": round(cumulative),
                    "elevation_m": round(p.elevation, 1),
                })

    return {
        "geometry": geometry,
        "stats": stats,
        "elevation_profile": elevation_profile,
    }
