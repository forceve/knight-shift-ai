"""
Simple one-shot launcher for Knight Shift AI.
Starts backend once, then frontend once, opens browser, and waits.
No locks, no auto-restart, no port checks.

Usage:
    python launcher.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
import webbrowser


ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frtend")

BACKEND_CMD = [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "6789", "--no-reload"]
FRONTEND_CMD = ["npm", "run", "dev", "--", "--host", "--port", "6790"]


def start_process(cmd: list[str], cwd: str, name: str) -> subprocess.Popen:
    print(f"Starting {name}... ({' '.join(cmd)})")
    return subprocess.Popen(cmd, cwd=cwd, shell=os.name == "nt")


def main():
    if not os.path.isdir(BACKEND_DIR) or not os.path.isdir(FRONTEND_DIR):
        print("Error: backend/ or frtend/ directory not found next to launcher.")
        print(f"Resolved ROOT: {ROOT}")
        sys.exit(1)

    backend_proc = start_process(BACKEND_CMD, BACKEND_DIR, "backend")
    time.sleep(2)  # brief settle time
    if backend_proc.poll() is not None:
        print("Backend exited immediately. Check Python deps and port 6789.")
        sys.exit(1)

    frontend_proc = start_process(FRONTEND_CMD, FRONTEND_DIR, "frontend")
    time.sleep(3)  # brief settle time
    if frontend_proc.poll() is not None:
        print("Frontend exited immediately. Check Node/npm and port 6790.")
        backend_proc.terminate()
        sys.exit(1)

    print("Opening browser at http://localhost:6790 ...")
    webbrowser.open("http://localhost:6790")

    print("Running. Press Ctrl+C to stop both services.")
    try:
        while True:
            if backend_proc.poll() is not None:
                print("\nBackend process exited; stopping frontend.")
                break
            if frontend_proc.poll() is not None:
                print("\nFrontend process exited; stopping backend.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
    finally:
        if backend_proc.poll() is None:
            backend_proc.terminate()
        if frontend_proc.poll() is None:
            frontend_proc.terminate()
        print("Services stopped.")


if __name__ == "__main__":
    main()
