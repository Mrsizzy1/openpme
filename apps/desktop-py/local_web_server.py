import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class DesktopHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def create_web_server(web_root, api_url, host="localhost", port=5173):
    root = Path(web_root).resolve()
    if not (root / "index.html").is_file():
        raise FileNotFoundError(f"Interface Web empaquetée introuvable : {root}")

    api_base_url = api_url.rstrip("/")
    config = json.dumps(
        {"desktop": True, "apiBaseUrl": api_base_url},
        ensure_ascii=True,
        separators=(",", ":"),
    )

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=os.fspath(root), **kwargs)

        def do_GET(self):
            if urlsplit(self.path).path == "/desktop-config.js":
                body = f"window.SMART_PME_CONFIG={config};".encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return

            requested_path = urlsplit(self.path).path
            if not Path(self.translate_path(requested_path)).is_file():
                if requested_path.startswith("/assets/") or Path(requested_path).suffix:
                    body = "Ressource de l’application introuvable.".encode("utf-8")
                    self.send_response(404)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                self.path = "/index.html"

            super().do_GET()

    server = DesktopHTTPServer((host, port), Handler)
    server.web_root = root
    server.base_url = f"http://{host}:{server.server_port}"
    return server
