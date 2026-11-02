#!/usr/bin/env python3
"""Download public Bangladesh Railway train schedule data to a JSON file.

Run with:
    python3 fetch_train_schedules.py

The script uses the public train list endpoint, then requests each unique train
number sequentially from the public schedule endpoint. It waits between requests
and checkpoints the output file so completed records survive an interruption.
Use --resume to retry missing schedules without downloading successful ones again.
"""

import argparse
import json
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_BASE = "https://railspaapi.shohoz.com/v1.0/web"
TRAIN_LIST_URL = f"{API_BASE}/all-trains/info"
TRAIN_SCHEDULE_URL = f"{API_BASE}/train-routes"
REQUEST_TIMEOUT_SECONDS = 20
MAX_RETRIES = 2
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def response_json(response):
    body = response.read(MAX_RESPONSE_BYTES + 1)
    if len(body) > MAX_RESPONSE_BYTES:
        raise ValueError("API response exceeded the 5 MB safety limit.")
    return json.loads(body.decode("utf-8"))


def retry_delay(error, attempt):
    retry_after = error.headers.get("Retry-After") if isinstance(error, HTTPError) else None
    if retry_after:
        try:
            return min(60.0, max(1.0, float(retry_after)))
        except ValueError:
            try:
                date = parsedate_to_datetime(retry_after)
                return min(60.0, max(1.0, (date - datetime.now(date.tzinfo)).total_seconds()))
            except (TypeError, ValueError, OverflowError):
                pass
    return min(30.0, 2.0 ** (attempt + 1))


def request_json(url, *, body=None):
    encoded_body = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    }
    if encoded_body is not None:
        headers["Content-Type"] = "application/json"

    for attempt in range(MAX_RETRIES + 1):
        request = Request(url, data=encoded_body, headers=headers, method="POST" if encoded_body else "GET")
        try:
            with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                return response_json(response)
        except HTTPError as error:
            detail = error.read(2000).decode("utf-8", "replace")
            retryable = error.code == 429 or 500 <= error.code < 600
            if not retryable or attempt == MAX_RETRIES:
                raise RuntimeError(f"API returned HTTP {error.code}: {detail}") from error
            delay = retry_delay(error, attempt)
        except (URLError, TimeoutError) as error:
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"Request failed after {MAX_RETRIES + 1} attempts: {error}") from error
            delay = retry_delay(error, attempt)

        print(f"  Request failed; retrying in {delay:g}s ({attempt + 1}/{MAX_RETRIES}).", flush=True)
        time.sleep(delay)

    raise RuntimeError("Request retry loop ended unexpectedly.")


def save_json(path, document):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_name(path.name + ".tmp")
    temporary_path.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().with_name("train-schedules.json"),
        help="JSON output file (default: train-schedules.json beside this script)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="minimum seconds between schedule requests (must be at least 1; default: 1)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="reuse successful schedules already present in the output file and retry missing ones",
    )
    args = parser.parse_args()
    if args.delay < 1:
        parser.error("--delay must be at least 1 second to avoid rapid requests.")

    print(f"Fetching train list: {TRAIN_LIST_URL}", flush=True)
    payload = request_json(TRAIN_LIST_URL)
    source_data = payload.get("data") if isinstance(payload, dict) else None
    source_trains = source_data.get("trains") if isinstance(source_data, dict) else None
    if not isinstance(source_trains, list):
        raise RuntimeError("Unexpected train list response: expected an array at data.trains.")

    cached_schedules = {}
    cached_errors = {}
    if args.resume and args.output.exists():
        try:
            previous_document = json.loads(args.output.read_text(encoding="utf-8"))
            for previous_train in previous_document.get("trains", []):
                if not isinstance(previous_train, dict):
                    continue
                previous_schedule = previous_train.get("schedule")
                if previous_train.get("train_number") is None:
                    continue
                number = str(previous_train["train_number"])
                if isinstance(previous_schedule, dict):
                    cached_schedules[number] = previous_schedule
                if previous_train.get("fetch_error"):
                    cached_errors[number] = previous_train["fetch_error"]
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError(f"Could not read existing output for resume: {error}") from error

    trains = []
    train_by_number = {}
    for train in source_trains:
        if not isinstance(train, dict) or train.get("train_number") is None:
            continue
        number = str(train["train_number"])
        record = {
            "train_number": number,
            "origin_city": train.get("origin_city"),
            "destination_city": train.get("destination_city"),
            "opening_time": train.get("opening_time"),
            "zone": train.get("zone"),
            "schedule": cached_schedules.get(number),
            "fetch_error": cached_errors.get(
                number,
                None if number in cached_schedules else "Schedule not fetched yet.",
            ),
        }
        trains.append(record)
        train_by_number.setdefault(number, record)

    unique_numbers = list(train_by_number)
    document = {
        "source": {
            "train_list_url": TRAIN_LIST_URL,
            "schedule_url": TRAIN_SCHEDULE_URL,
            "retrieved_at": utc_now(),
        },
        "summary": {
            "train_list_records": len(trains),
            "unique_train_numbers": len(unique_numbers),
            "schedules_fetched": sum(
                bool(schedule.get("train_name")) for schedule in cached_schedules.values()
            ),
            "schedule_responses_saved": len(cached_schedules),
            "failures": sum(record["fetch_error"] is not None for record in train_by_number.values()),
            "complete": False,
        },
        "trains": trains,
    }
    save_json(args.output, document)

    requests_started = 0
    for index, number in enumerate(unique_numbers, start=1):
        record = train_by_number[number]
        if record["schedule"] and record["schedule"].get("train_name"):
            print(f"[{index}/{len(unique_numbers)}] Train {number}: already saved; skipping", flush=True)
            continue

        if requests_started:
            time.sleep(args.delay)
        requests_started += 1
        record["schedule"] = None
        print(f"[{index}/{len(unique_numbers)}] Train {number}", flush=True)
        try:
            schedule_payload = request_json(TRAIN_SCHEDULE_URL, body={"model": number})
            schedule = schedule_payload.get("data") if isinstance(schedule_payload, dict) else None
            if not isinstance(schedule, dict):
                raise RuntimeError("Unexpected schedule response: expected an object at data.")
            record["schedule"] = schedule
            if not schedule.get("train_name"):
                raise RuntimeError("The schedule endpoint returned no train_name for this number.")
            record["fetch_error"] = None
            print(f"  {schedule['train_name']} ({len(schedule.get('routes') or [])} stops)", flush=True)
        except (RuntimeError, ValueError, URLError, TimeoutError) as error:
            record["fetch_error"] = str(error)
            print(f"  Failed: {error}", flush=True)

        document["summary"]["schedules_fetched"] = sum(
            bool(item["schedule"] and item["schedule"].get("train_name"))
            for item in train_by_number.values()
        )
        document["summary"]["schedule_responses_saved"] = sum(
            isinstance(item["schedule"], dict) for item in train_by_number.values()
        )
        document["summary"]["failures"] = sum(
            item["fetch_error"] is not None for item in train_by_number.values()
        )
        document["source"]["updated_at"] = utc_now()
        save_json(args.output, document)

    document["summary"]["complete"] = document["summary"]["failures"] == 0
    document["source"]["completed_at"] = utc_now()
    save_json(args.output, document)

    print(
        f"Saved {document['summary']['schedules_fetched']}/{len(unique_numbers)} schedules "
        f"to {args.output}",
        flush=True,
    )
    if document["summary"]["failures"]:
        print("Some requests failed; see each train's fetch_error in the JSON file.", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nInterrupted. The JSON file contains all completed schedule requests.", flush=True)
        raise SystemExit(130)
