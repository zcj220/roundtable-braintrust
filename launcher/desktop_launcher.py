import socket
import sys
import tempfile
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


APP_URL_PATH = "/prototype-ui/index.html"
HEARTBEAT_TIMEOUT_SECONDS = 90
HEARTBEAT_CHECK_INTERVAL_SECONDS = 5
LOG_PATH = Path(tempfile.gettempdir()) / "roundtable-braintrust-launcher.log"
PROXY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def append_log(message: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as log_file:
        log_file.write(message.rstrip() + "\n")


def get_bundle_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent)) / "dist"
    return Path(__file__).resolve().parents[1] / "dist"


def find_free_port(preferred: int = 4175) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", preferred))
            return preferred
        except OSError:
            sock.bind(("127.0.0.1", 0))
            return int(sock.getsockname()[1])


def get_proxy_target_uri(path: str) -> str | None:
    parsed = urllib.parse.urlparse(path)
    query = urllib.parse.parse_qs(parsed.query)
    kind = (query.get("kind") or [""])[0]

    if kind == "duck":
        text = (query.get("q") or [""])[0].strip()
        if not text:
            return None
        return f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(text)}&kl=us-en"

    if kind == "wiki":
        text = (query.get("q") or [""])[0].strip()
        if not text:
            return None
        return (
            "https://en.wikipedia.org/w/api.php?action=query&list=search"
            f"&srsearch={urllib.parse.quote(text)}&srlimit=3&format=json&origin=*"
        )

    if kind == "url":
        target_url = (query.get("url") or [""])[0].strip()
        if not target_url or not target_url.startswith(("http://", "https://")):
            return None
        normalized = target_url.removeprefix("https://").removeprefix("http://")
        return f"https://r.jina.ai/http/{normalized}"

    return None


def invoke_proxy_request(target_uri: str) -> tuple[int, str, bytes]:
    request = urllib.request.Request(target_uri, headers={"User-Agent": PROXY_USER_AGENT}, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return int(response.status), response.headers.get("Content-Type", "application/octet-stream"), response.read()
    except urllib.error.HTTPError as error:
        return int(error.code), error.headers.get("Content-Type", "application/octet-stream"), error.read()


class LauncherRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, launcher, **kwargs):
        self.launcher = launcher
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format: str, *args) -> None:
        return

    def do_POST(self) -> None:
        if self.path.startswith("/__roundtable_heartbeat"):
            self.launcher.touch_heartbeat()
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404, "Not Found")

    def do_GET(self) -> None:
        if self.path.startswith("/__roundtable_proxy"):
            target_uri = get_proxy_target_uri(self.path)
            if not target_uri:
                self.send_error(400, "Bad Request")
                return
            try:
                status_code, content_type, payload = invoke_proxy_request(target_uri)
                self.send_response(status_code)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            except Exception as error:
                self.send_error(502, str(error))
            return
        super().do_GET()


class DesktopLauncher:
    def __init__(self) -> None:
        self.root_dir = get_bundle_root()
        self.port = find_free_port()
        self.url = f"http://127.0.0.1:{self.port}{APP_URL_PATH}"
        self.server: ThreadingHTTPServer | None = None
        self.monitor_thread: threading.Thread | None = None
        self.stop_event = threading.Event()
        self.last_heartbeat = time.monotonic()

    def touch_heartbeat(self) -> None:
        self.last_heartbeat = time.monotonic()

    def start(self) -> None:
        append_log(f"launch root={self.root_dir} url={self.url} frozen={getattr(sys, 'frozen', False)}")
        if not self.root_dir.exists():
            append_log(f"missing root_dir={self.root_dir}")
            raise FileNotFoundError(f"未找到静态资源目录：{self.root_dir}")

        self.server = ThreadingHTTPServer(
            ("127.0.0.1", self.port),
            partial(LauncherRequestHandler, directory=str(self.root_dir), launcher=self),
        )
        self.monitor_thread = threading.Thread(target=self.monitor_heartbeat, daemon=True)
        self.monitor_thread.start()
        append_log(f"server started port={self.port}")
        webbrowser.open(self.url, new=1)
        self.server.serve_forever(poll_interval=0.5)

    def monitor_heartbeat(self) -> None:
        while not self.stop_event.is_set():
            time.sleep(HEARTBEAT_CHECK_INTERVAL_SECONDS)
            idle_seconds = time.monotonic() - self.last_heartbeat
            if idle_seconds >= HEARTBEAT_TIMEOUT_SECONDS:
                append_log(f"heartbeat timeout after {idle_seconds:.1f}s, stopping server")
                self.stop()
                return

    def stop(self) -> None:
        if self.stop_event.is_set():
            return
        self.stop_event.set()
        try:
            if self.server is not None:
                self.server.shutdown()
                self.server.server_close()
                append_log("server stopped")
        except Exception:
            append_log(traceback.format_exc())


if __name__ == "__main__":
    launcher = DesktopLauncher()
    try:
        launcher.start()
    except Exception:
        append_log("launcher failed")
        append_log(traceback.format_exc())
        raise