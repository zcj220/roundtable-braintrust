import socket
import sys
import tempfile
import threading
import traceback
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tkinter import BOTH, LEFT, RIGHT, Button, Frame, Label, Tk


APP_TITLE = "Roundtable Braintrust"
APP_URL_PATH = "/prototype-ui/index.html"
LOG_PATH = Path(tempfile.gettempdir()) / "roundtable-braintrust-launcher.log"


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


class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format: str, *args) -> None:
        return


class DesktopLauncher:
    def __init__(self) -> None:
        self.root_dir = get_bundle_root()
        self.port = find_free_port()
        self.url = f"http://127.0.0.1:{self.port}{APP_URL_PATH}"
        self.server = None
        self.server_thread = None
        self.window = Tk()
        self.window.title(APP_TITLE)
        self.window.geometry("460x180")
        self.window.resizable(False, False)
        self.window.protocol("WM_DELETE_WINDOW", self.stop)

        self.status_label = Label(
            self.window,
            text="正在启动本地服务...",
            justify=LEFT,
            anchor="w",
            padx=20,
            pady=18,
        )
        self.status_label.pack(fill=BOTH)

        self.tip_label = Label(
            self.window,
            text="这个窗口关闭后，圆桌智囊团也会一起退出。",
            justify=LEFT,
            anchor="w",
            padx=20,
        )
        self.tip_label.pack(fill=BOTH)

        button_bar = Frame(self.window, padx=20, pady=18)
        button_bar.pack(fill=BOTH)

        self.open_button = Button(button_bar, text="打开圆桌智囊团", command=self.open_browser, width=18)
        self.open_button.pack(side=LEFT)

        self.exit_button = Button(button_bar, text="退出", command=self.stop, width=10)
        self.exit_button.pack(side=RIGHT)

    def start(self) -> None:
        append_log(f"launch root={self.root_dir} url={self.url} frozen={getattr(sys, 'frozen', False)}")
        if not self.root_dir.exists():
            self.status_label.config(text=f"未找到静态资源目录：{self.root_dir}")
            append_log(f"missing root_dir={self.root_dir}")
            return

        try:
            self.server = ThreadingHTTPServer(
                ("127.0.0.1", self.port),
                partial(QuietHandler, directory=str(self.root_dir)),
            )
            self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.server_thread.start()
            append_log(f"server started port={self.port}")
        except Exception as error:
            self.status_label.config(text=f"启动失败：{error}\n日志：{LOG_PATH}")
            append_log("server start failed")
            append_log(traceback.format_exc())
            self.window.mainloop()
            return

        self.status_label.config(text=f"服务已启动\n地址：{self.url}\n资源目录：{self.root_dir}")
        self.window.after(800, self.open_browser)
        self.window.mainloop()

    def open_browser(self) -> None:
        webbrowser.open(self.url, new=1)

    def stop(self) -> None:
        try:
            if self.server is not None:
                self.server.shutdown()
                self.server.server_close()
                append_log("server stopped")
        finally:
            self.window.destroy()


if __name__ == "__main__":
    DesktopLauncher().start()