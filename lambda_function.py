import base64
import json
import os
import re
from datetime import datetime, timezone
from urllib.parse import unquote, urlencode
import urllib.error
import urllib.request

REQUEST_TIMEOUT_SECONDS = 8.0
TRANSPORT_MODES = {"driving", "walking", "bicycling", "transit"}
ROUTES_MODE_MAPPING = {
    "driving": "DRIVE",
    "walking": "WALK",
    "bicycling": "BICYCLE",
    "transit": "TRANSIT",
}


def lambda_handler(event, context):
    method = extract_method(event)
    headers = normalize_headers(event.get("headers"))
    origin = headers.get("origin", "")
    extension_id = headers.get("x-extension-id", "")
    authorized_origins = split_env_csv("AUTHORIZED_ORIGINS")
    authorized_extension_ids = split_env_csv("AUTHORIZED_EXTENSION_IDS")
    allow_origin = get_allow_origin(origin, authorized_origins, authorized_extension_ids)
    cors_headers = build_cors_headers(allow_origin)

    if method == "OPTIONS":
        if is_authorized_origin_or_extension(
            origin, extension_id, authorized_origins, authorized_extension_ids
        ):
            return response(200, cors_headers, {"message": "Accepted"})
        return response(403, cors_headers, {"error": "You are not allowed to make this request."})

    if method != "POST":
        return response(405, cors_headers, {"error": "Wrong method."})

    if not is_authorized_origin_or_extension(
        origin, extension_id, authorized_origins, authorized_extension_ids
    ):
        return response(403, cors_headers, {"error": "You are not allowed to make this request."})

    try:
        request_body = parse_json_body(event)
    except ValueError as exc:
        return response(400, cors_headers, {"error": str(exc)})

    try:
        validated_request = validate_request(request_body)
    except ValueError as exc:
        return response(400, cors_headers, {"error": str(exc)})

    direction = get_directions(validated_request)
    return response(200, cors_headers, direction)


def extract_method(event):
    return (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or ""
    ).upper()


def normalize_headers(headers):
    if not isinstance(headers, dict):
        return {}
    normalized = {}
    for key, value in headers.items():
        if not isinstance(key, str):
            continue
        normalized[key.lower()] = value
    return normalized


def split_env_csv(env_var):
    value = os.environ.get(env_var, "")
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def get_allow_origin(origin, authorized_origins, authorized_extension_ids):
    if "*" in authorized_origins:
        return "*"
    if origin and origin in authorized_origins:
        return origin
    origin_extension_id = extract_extension_id_from_origin(origin)
    if origin_extension_id and origin_extension_id in authorized_extension_ids:
        return origin
    return "null"


def build_cors_headers(allow_origin):
    return {
        "Access-Control-Allow-Headers": (
            "Content-Type,X-Amz-Date,X-Amz-Security-Token,Authorization,"
            "X-Api-Key,X-Requested-With,Accept,Origin,X-Extension-Id"
        ),
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Vary": "Origin",
    }


def is_authorized_origin_or_extension(
    origin, extension_id, authorized_origins, authorized_extension_ids
):
    if "*" in authorized_origins:
        return True
    if origin and origin in authorized_origins:
        return True
    origin_extension_id = extract_extension_id_from_origin(origin)
    if origin_extension_id and origin_extension_id in authorized_extension_ids:
        return True
    if extension_id and extension_id in authorized_extension_ids:
        return True
    return False


def extract_extension_id_from_origin(origin):
    prefix = "chrome-extension://"
    if not origin or not origin.startswith(prefix):
        return ""
    extension_part = origin[len(prefix):]
    return extension_part.split("/", maxsplit=1)[0]


def parse_json_body(event):
    if "body" not in event:
        raise ValueError("Invalid request body.")

    body = event.get("body")
    if body is None:
        raise ValueError("Invalid request body.")

    if event.get("isBase64Encoded"):
        try:
            body = base64.b64decode(body).decode("utf-8")
        except Exception as exc:  # pylint: disable=broad-except
            raise ValueError("Invalid base64 request body.") from exc

    if not isinstance(body, str):
        raise ValueError("Invalid request body.")

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid request body.") from exc


def validate_request(request_body):
    if not isinstance(request_body, dict):
        raise ValueError("Invalid request body.")

    required_fields = ["origin", "destination", "transport_mode"]
    for field in required_fields:
        if field not in request_body:
            raise ValueError(f"Missing required field: {field}")

    origin = maybe_unquote(str(request_body.get("origin", "")).strip())
    destination = maybe_unquote(str(request_body.get("destination", "")).strip())
    transport_mode = maybe_unquote(str(request_body.get("transport_mode", "")).strip().lower())
    arrival_time = str(request_body.get("arrival_time", "")).strip()
    departure_time = str(request_body.get("departure_time", "")).strip()
    time_reference = maybe_unquote(str(request_body.get("time_reference", "")).strip().lower())
    time_value = str(request_body.get("time_value", "")).strip()

    if not origin:
        raise ValueError("Field origin cannot be empty.")
    if not destination:
        raise ValueError("Field destination cannot be empty.")
    if transport_mode not in TRANSPORT_MODES:
        raise ValueError(
            "Invalid transport_mode. Allowed values: driving, walking, bicycling, transit."
        )

    # New payload style: time_reference + time_value
    if time_reference:
        if time_reference not in {"none", "arrival", "departure"}:
            raise ValueError("time_reference must be one of: none, arrival, departure.")
        if time_reference == "none":
            arrival_time = ""
            departure_time = ""
        else:
            if not time_value:
                raise ValueError("time_value is required when time_reference is arrival or departure.")
            if not time_value.isdigit():
                raise ValueError("time_value must be a Unix timestamp in seconds.")
            if time_reference == "arrival":
                arrival_time = time_value
                departure_time = ""
            else:
                departure_time = time_value
                arrival_time = ""

    if arrival_time and not arrival_time.isdigit():
        raise ValueError("arrival_time must be a Unix timestamp in seconds.")
    if departure_time and not departure_time.isdigit():
        raise ValueError("departure_time must be a Unix timestamp in seconds.")

    if arrival_time and departure_time:
        raise ValueError("Use either arrival_time or departure_time, not both.")
    if arrival_time and transport_mode != "transit":
        raise ValueError("arrival_time is only supported with transit mode.")

    return {
        "origin": origin,
        "destination": destination,
        "transport_mode": transport_mode,
        "arrival_time": arrival_time,
        "departure_time": departure_time,
    }


def maybe_unquote(value):
    # Keep backward compatibility with older extension versions that URL-encoded values.
    decoded = unquote(value)
    return decoded


def response(status_code, headers, payload):
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(payload),
    }


def get_directions(request):
    preferred_api = os.environ.get("GOOGLE_API_PREFERRED", "routes").strip().lower()
    if preferred_api == "directions":
        legacy_result = get_legacy_directions(request)
        if legacy_result.get("status") == "OK":
            return legacy_result
        return get_routes_api_directions(request)

    routes_result = get_routes_api_directions(request)
    if routes_result.get("status") == "OK":
        return routes_result

    fallback_enabled = os.environ.get("ENABLE_DIRECTIONS_FALLBACK", "true").lower() == "true"
    if fallback_enabled and should_try_legacy_fallback(routes_result):
        return get_legacy_directions(request)
    return routes_result


def should_try_legacy_fallback(routes_result):
    fallback_statuses = {
        "REQUEST_DENIED",
        "PERMISSION_DENIED",
        "UNIMPLEMENTED",
        "REQUEST_FAILED",
        "INVALID_ARGUMENT",
    }
    return routes_result.get("status") in fallback_statuses


def get_routes_api_directions(request):
    api_key = (
        os.environ.get("GOOGLE_ROUTES_API_KEY")
        or os.environ.get("GOOGLE_DIRECTIONS_API_KEY")
        or ""
    ).strip()
    if not api_key:
        return {
            "status": "REQUEST_DENIED",
            "error_message": "Google API key is missing.",
        }

    payload = {
        "origin": {"address": request["origin"]},
        "destination": {"address": request["destination"]},
        "travelMode": ROUTES_MODE_MAPPING[request["transport_mode"]],
        "languageCode": "en",
        "units": "METRIC",
    }
    if request["arrival_time"]:
        payload["arrivalTime"] = unix_to_rfc3339(request["arrival_time"])
    elif request["departure_time"]:
        payload["departureTime"] = unix_to_rfc3339(request["departure_time"])

    routes_endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes"
    routes_headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "routes.duration,"
            "routes.legs.duration,"
            "routes.legs.localizedValues.duration,"
            "routes.distanceMeters"
        ),
    }

    try:
        status_code, response_text = send_http_request(
            "POST",
            routes_endpoint,
            headers=routes_headers,
            body=json.dumps(payload),
        )
    except Exception as exc:  # pylint: disable=broad-except
        print("Routes API error:", exc)
        return {"status": "REQUEST_FAILED", "error_message": str(exc)}

    try:
        response_json = json.loads(response_text) if response_text else {}
    except json.JSONDecodeError:
        return {"status": "REQUEST_FAILED", "error_message": "Invalid response from Routes API."}

    if status_code >= 400:
        error = response_json.get("error", {}) if isinstance(response_json, dict) else {}
        return {
            "status": error.get("status", "REQUEST_FAILED"),
            "error_message": error.get(
                "message",
                f"Routes API HTTP {status_code}",
            ),
        }

    routes = response_json.get("routes", [])
    if not routes:
        return {"status": "ZERO_RESULTS", "error_message": "No route found."}

    first_route = routes[0]
    legs = first_route.get("legs", [])
    first_leg = legs[0] if legs else {}
    duration_seconds = parse_duration_seconds(
        first_leg.get("duration") or first_route.get("duration", "")
    )
    duration_text = (
        first_leg.get("localizedValues", {})
        .get("duration", {})
        .get("text", "")
    ) or humanize_duration(duration_seconds)

    # Keep the same shape expected by the extension popup code.
    return {
        "status": "OK",
        "routes": [
            {
                "legs": [
                    {
                        "duration": {
                            "text": duration_text,
                            "value": duration_seconds,
                        }
                    }
                ]
            }
        ],
        "api_source": "ROUTES_API",
    }


def get_legacy_directions(request):
    api_key = os.environ.get("GOOGLE_DIRECTIONS_API_KEY", "").strip()
    if not api_key:
        return {
            "status": "REQUEST_DENIED",
            "error_message": "Google Directions API key is missing.",
        }

    params = {
        "origin": request["origin"],
        "destination": request["destination"],
        "mode": request["transport_mode"],
        "language": "en",
        "key": api_key,
    }
    if request["arrival_time"]:
        params["arrival_time"] = request["arrival_time"]
    elif request["departure_time"]:
        params["departure_time"] = request["departure_time"]

    url = f"https://maps.googleapis.com/maps/api/directions/json?{urlencode(params)}"

    try:
        status_code, response_text = send_http_request("GET", url)
        response_json = json.loads(response_text)
        if status_code >= 400:
            return {
                "status": "REQUEST_FAILED",
                "error_message": f"Directions API HTTP {status_code}",
            }
        return response_json
    except Exception as exc:  # pylint: disable=broad-except
        print("Directions API error:", exc)
        return {"status": "REQUEST_FAILED", "error_message": str(exc)}


def send_http_request(method, url, headers=None, body=None):
    payload = None
    if body is not None:
        payload = body.encode("utf-8") if isinstance(body, str) else body

    request = urllib.request.Request(
        url=url,
        data=payload,
        headers=headers or {},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        response_data = exc.read().decode("utf-8") if exc.fp else ""
        return exc.code, response_data


def unix_to_rfc3339(unix_timestamp):
    date = datetime.fromtimestamp(int(unix_timestamp), tz=timezone.utc)
    return date.isoformat().replace("+00:00", "Z")


def parse_duration_seconds(duration_value):
    if isinstance(duration_value, (int, float)):
        return int(duration_value)

    if not isinstance(duration_value, str):
        return 0

    # Routes API format: "123s"
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)s$", duration_value.strip())
    if not match:
        return 0
    return int(float(match.group(1)))


def humanize_duration(seconds):
    if not seconds or seconds < 0:
        return "N/A"
    hours, remainder = divmod(seconds, 3600)
    minutes = remainder // 60
    if hours and minutes:
        return f"{hours} h {minutes} min"
    if hours:
        return f"{hours} h"
    return f"{minutes} min"
