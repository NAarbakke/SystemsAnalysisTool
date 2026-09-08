"""Optional local/intranet server. Python 3.9+; no packages required."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = (Path(__file__).resolve().parent.parent / "dist").resolve()


class StaticHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript"}

    def send_head(self):
        request_path = unquote(urlsplit(self.path).path)
        if "\\" in request_path or "\0" in request_path or ".." in request_path.split("/"):
            self.send_error(403)
            return None
        candidate = (ROOT / request_path.lstrip("/")).resolve()
        if not candidate.is_relative_to(ROOT):
            self.send_error(403)
            return None
        if candidate.is_dir() and candidate != ROOT:
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()
    if not (ROOT / "index.html").is_file():
        parser.error("Build missing. Run npm.cmd run build first.")
    handler = partial(StaticHandler, directory=str(ROOT))
    with ThreadingHTTPServer((args.host, args.port), handler) as server:
        print(f"Open http://localhost:{args.port} — Ctrl+C to stop.", flush=True)
        if args.host == "0.0.0.0":
            print(f"Intranet: http://<this-machine-name-or-IP>:{args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
