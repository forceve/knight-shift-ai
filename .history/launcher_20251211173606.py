"""
Simple one-shot launcher for Knight Shift AI.
Starts backend once, then frontend once, opens browser, and waits.
No locks, no auto-restart, no port checks.

Usage:
    python launcher.py
"""
from __future__ import annotations

import atexit
import os
import socket
import subprocess
import sys
import tempfile
import time
import webbrowser


def project_root() -> str:
    """
    Resolve project root for both normal run and PyInstaller bundle.
    If bundled, use the directory where the EXE resides (not the temp _MEIPASS).
    """
    if hasattr(sys, "_MEIPASS"):  # type: ignore[attr-defined]
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


ROOT = project_root()
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frtend")

BACKEND_CMD = [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "6789", "--no-reload"]
FRONTEND_CMD = ["npm", "run", "dev", "--", "--host", "--port", "6790"]

# Lock file to avoid multiple simultaneous launcher runs
LOCK_FILE = os.path.join(tempfile.gettempdir(), "knight_shift_ai_launcher.lock")


def is_port_in_use(port: int) -> bool:
    """Check if a port is already in use (service already running)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def check_single_instance():
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE, "r") as f:
                pid = int(f.read().strip())
            try:
                os.kill(pid, 0)
                print(f"Launcher already running (PID: {pid}). Exit.")
                sys.exit(0)
            except OSError:
                os.remove(LOCK_FILE)
        except Exception:
            try:
                os.remove(LOCK_FILE)
            except Exception:
                pass
    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(os.getpid()))
    except Exception:
        pass
    atexit.register(lambda: os.path.exists(LOCK_FILE) and os.remove(LOCK_FILE))


def start_process(cmd: list[str], cwd: str, name: str) -> subprocess.Popen:
    print(f"Starting {name}... ({' '.join(cmd)})")
    return subprocess.Popen(cmd, cwd=cwd, shell=os.name == "nt")


def main():
    check_single_instance()

    if not os.path.isdir(BACKEND_DIR) or not os.path.isdir(FRONTEND_DIR):
        print("Error: backend/ or frtend/ directory not found next to launcher.")
        print(f"Resolved ROOT: {ROOT}")
        sys.exit(1)

    backend_proc = None
    frontend_proc = None

    # Start backend only if port is free
    if is_port_in_use(6789):
        print("Backend already running on port 6789. Skipping backend start.")
    else:
        backend_proc = start_process(BACKEND_CMD, BACKEND_DIR, "backend")
        time.sleep(2)
        if backend_proc.poll() is not None:
            print("Backend exited immediately. Check Python deps and port 6789.")
            sys.exit(1)

    # Start frontend only if port is free
    frontend_started = False
    if is_port_in_use(6790):
        print("Frontend already running on port 6790. Skipping frontend start and browser open.")
    else:
        frontend_proc = start_process(FRONTEND_CMD, FRONTEND_DIR, "frontend")
        time.sleep(3)
        if frontend_proc.poll() is not None:
            print("Frontend exited immediately. Check Node/npm and port 6790.")
            if backend_proc and backend_proc.poll() is None:
                backend_proc.terminate()
            sys.exit(1)
        frontend_started = True

    if frontend_started:
        print("Opening browser at http://localhost:6790 ...")
        webbrowser.open("http://localhost:6790")
    else:
        print("Frontend already running; not reopening browser.")

    # If nothing was started (both already running), just exit after opening browser.
    if backend_proc is None and frontend_proc is None:
        print("Backend and frontend already running. Exiting launcher.")
        return

    print("Running. Press Ctrl+C to stop services started by this launcher.")
    try:
        while True:
            if backend_proc and backend_proc.poll() is not None:
                print("\nBackend process exited; stopping frontend.")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print("\nFrontend process exited; stopping backend.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
    finally:
        if backend_proc and backend_proc.poll() is None:
            backend_proc.terminate()
        if frontend_proc and frontend_proc.poll() is None:
            frontend_proc.terminate()
        print("Services stopped.")


if __name__ == "__main__":
    main()
