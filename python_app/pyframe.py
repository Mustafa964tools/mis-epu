"""
PyFrame — Lightweight Python 3.10 Micro-Framework
Built on Python's standard library (http.server + re + json + urllib.parse)
providing Flask-style @app.route() routing, Request/Response helpers, and JSON APIs.
"""

from __future__ import annotations

import json
import os
import re
import traceback
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable
from urllib.parse import parse_qs, urlparse


class Request:
    def __init__(
        self,
        method: str,
        path: str,
        query: dict[str, list[str]],
        headers: dict[str, str],
        body: bytes,
    ) -> None:
        self.method = method.upper()
        self.path = path
        self.query = query
        self.headers = {k.lower(): v for k, v in headers.items()}
        self.body = body

    def arg(self, name: str, default: str = "") -> str:
        vals = self.query.get(name)
        return vals[0] if vals else default

    def json(self) -> dict[str, Any]:
        if not self.body:
            return {}
        try:
            data = json.loads(self.body.decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}


class Response:
    def __init__(
        self,
        body: bytes | str,
        status: int = 200,
        content_type: str = "text/html; charset=utf-8",
        headers: dict[str, str] | None = None,
    ) -> None:
        self.body = body.encode("utf-8") if isinstance(body, str) else body
        self.status = status
        self.content_type = content_type
        self.headers = headers or {}


def jsonify(payload: Any, status: int = 200) -> Response:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return Response(data, status=status, content_type="application/json; charset=utf-8")


def _compile_pattern(rule: str) -> re.Pattern[str]:
    # Convert Flask-style rules such as /api/news/<int:news_id> or /api/item/<slug>
    parts: list[str] = ["^"]
    pos = 0
    for match in re.finditer(r"<(?:(int):)?([a-zA-Z_][a-zA-Z0-9_]*)>", rule):
        parts.append(re.escape(rule[pos : match.start()]))
        param_type = match.group(1)
        param_name = match.group(2)
        if param_type == "int":
            parts.append(f"(?P<{param_name}>[0-9]+)")
        else:
            parts.append(f"(?P<{param_name}>[^/]+)")
        pos = match.end()
    parts.append(re.escape(rule[pos:]))
    parts.append("$")
    return re.compile("".join(parts))


class PyFrame:
    def __init__(self, import_name: str, static_dir: str | None = None) -> None:
        self.import_name = import_name
        self.static_dir = static_dir
        self._routes: list[tuple[re.Pattern[str], set[str], Callable[..., Any], dict[str, str]]] = []

    def route(self, rule: str, methods: list[str] | None = None) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        allowed = {m.upper() for m in (methods or ["GET"])}
        param_types: dict[str, str] = {}
        for match in re.finditer(r"<(?:(int):)?([a-zA-Z_][a-zA-Z0-9_]*)>", rule):
            param_types[match.group(2)] = match.group(1) or "str"
        compiled = _compile_pattern(rule)

        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            self._routes.append((compiled, allowed, func, param_types))
            return func

        return decorator

    def dispatch(self, req: Request) -> Response:
        if req.method == "OPTIONS":
            return Response(b"", status=204)

        path_matched = False
        for pattern, allowed, handler, param_types in self._routes:
            m = pattern.match(req.path)
            if not m:
                continue
            path_matched = True
            if req.method not in allowed:
                continue

            kwargs: dict[str, Any] = {}
            for k, v in m.groupdict().items():
                kwargs[k] = int(v) if param_types.get(k) == "int" else v

            try:
                result = handler(req, **kwargs)
                if isinstance(result, Response):
                    return result
                if isinstance(result, tuple) and len(result) == 2:
                    payload, status = result
                    if isinstance(payload, (dict, list)):
                        return jsonify(payload, status=status)
                    return Response(str(payload), status=status)
                if isinstance(result, (dict, list)):
                    return jsonify(result)
                return Response(str(result))
            except Exception as exc:
                traceback.print_exc()
                return jsonify({"error": "Internal server error", "detail": str(exc)}, status=500)

        if path_matched:
            return jsonify({"error": "Method not allowed"}, status=405)
        return jsonify({"error": "Not found"}, status=404)

    def run(self, host: str = "127.0.0.1", port: int = 5001) -> None:
        app = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, format: str, *args: Any) -> None:
                # Keep logs concise
                pass

            def _handle(self) -> None:
                parsed = urlparse(self.path)
                content_length = int(self.headers.get("Content-Length", "0") or "0")
                body = self.rfile.read(content_length) if content_length > 0 else b""
                req = Request(
                    method=self.command,
                    path=parsed.path,
                    query=parse_qs(parsed.query),
                    headers={k: v for k, v in self.headers.items()},
                    body=body,
                )
                resp = app.dispatch(req)

                self.send_response(resp.status)
                self.send_header("Content-Type", resp.content_type)
                self.send_header("Content-Length", str(len(resp.body)))
                self.send_header("Cache-Control", "no-store")
                for hk, hv in resp.headers.items():
                    self.send_header(hk, hv)
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(resp.body)

            def do_GET(self) -> None:
                self._handle()

            def do_POST(self) -> None:
                self._handle()

            def do_PUT(self) -> None:
                self._handle()

            def do_DELETE(self) -> None:
                self._handle()

            def do_OPTIONS(self) -> None:
                self._handle()

        class ReusableThreadingHTTPServer(ThreadingHTTPServer):
            allow_reuse_address = True
            daemon_threads = True

        server = ReusableThreadingHTTPServer((host, port), Handler)
        print(f"[PyFrame] Python web server listening on http://{host}:{port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
