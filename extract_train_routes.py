#!/usr/bin/env python3
"""Extract ordered train routes from train-schedules.json."""

import argparse
import json
from pathlib import Path


def extract_routes(document):
    trains = document.get("trains") if isinstance(document, dict) else None
    if not isinstance(trains, list):
        raise ValueError("Expected an array at the top-level 'trains' property.")

    extracted = []
    for train in trains:
        if not isinstance(train, dict):
            raise ValueError("Each train record must be an object.")

        schedule = train.get("schedule")
        route_stops = schedule.get("routes") if isinstance(schedule, dict) else None
        train_name = schedule.get("train_name") if isinstance(schedule, dict) else None
        if not route_stops:
            continue
        if not isinstance(route_stops, list):
            raise ValueError(f"Train {train.get('train_number')}: routes must be an array.")

        cities = []
        for stop in route_stops:
            city = stop.get("city") if isinstance(stop, dict) else None
            if not isinstance(city, str) or not city:
                raise ValueError(f"Train {train.get('train_number')}: every route stop must have a city.")
            cities.append(city)

        origin = train.get("origin_city")
        destination = train.get("destination_city")
        try:
            start = cities.index(origin)
            end = cities.index(destination, start)
        except ValueError as error:
            raise ValueError(
                f"Train {train.get('train_number')}: origin and destination must appear in route order."
            ) from error

        train_number = train.get("train_number")
        
        if train_number is None:
            raise ValueError("Every train with a route must have a train_number.")
        extracted.append({"train_number": str(train_number), "train_name": train_name, "cities": cities[start : end + 1]})

    return extracted


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).resolve().with_name("train-schedules.json"),
        help="source schedule JSON (default: train-schedules.json beside this script)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().with_name("train-routes-unique.json"),
        help="route-only JSON output (default: train-routes-unique.json beside this script)",
    )
    args = parser.parse_args()

    if args.input.resolve() == args.output.resolve():
        raise ValueError("Input and output paths must be different to preserve the source JSON.")

    document = json.loads(args.input.read_text(encoding="utf-8"))
    routes = extract_routes(document)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = args.output.with_name(args.output.name + ".tmp")
    temporary_path.write_text(
        json.dumps(routes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(args.output)
    print(f"Saved {len(routes)} routes to {args.output}")


if __name__ == "__main__":
    main()
