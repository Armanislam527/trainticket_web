#!/usr/bin/env python3
"""Serve the train search page and proxy its schedule request to the railway API."""

import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8000
UPSTREAM_URL = "https://railspaapi.shohoz.com/v1.0/web/train-routes"
MAX_REQUEST_BYTES = 1024


class TrainScheduleHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/train-routes":
            self.send_json(404, {"error": {"messages": ["Unknown API endpoint."]}})
            return

        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.send_json(400, {"error": {"messages": ["A valid Content-Length header is required."]}})
            return

        if content_length < 1 or content_length > MAX_REQUEST_BYTES:
            self.send_json(413, {"error": {"messages": ["Request body is missing or too large."]}})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": {"messages": ["Request body must be valid JSON."]}})
            return

        model = payload.get("model") if isinstance(payload, dict) else None
        if not isinstance(model, str) or re.fullmatch(r"\d{1,6}", model) is None:
            self.send_json(400, {"error": {"messages": ["The model field must be a train number."]}})
            return

        upstream_request = Request(
            UPSTREAM_URL,
            data=json.dumps({"model": model}).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            method="POST",
        )

        try:
            with urlopen(upstream_request, timeout=20) as response:
                body = response.read()
                content_type = response.headers.get("Content-Type", "application/json")
                self.send_response(response.status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except HTTPError as error:
            body = error.read()
            self.send_response(error.code)
            self.send_header("Content-Type", error.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except (URLError, TimeoutError, OSError) as error:
            self.send_json(502, {
                "error": {
                    "messages": [f"Could not reach train schedule API: {error}"]
                }
            })


if __name__ == "__main__":
    server = ThreadingHTTPServer(
        (HOST, PORT),
        TrainScheduleHandler,
    )
    print(f"Serving {ROOT} at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()
