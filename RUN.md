# How to Run

## Backend (FastAPI on port 6789)
1. Install Python 3.11+.
2. Setup venv and install deps:
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # or source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Start API:
   ```bash
   uvicorn app.main:app --reload --port 6789
   ```
4. Health check: http://localhost:6789/health

## Frontend (Vite React on port 6790)
1. Install Node 18+ and npm/pnpm/yarn.
2. Install deps:
   ```bash
   cd frtend
   npm install
   ```
3. Set API base if needed (default http://localhost:6789):
   ```
   echo VITE_API_BASE=http://localhost:6789 > .env
   ```
4. Start dev server:
   ```bash
   npm run dev -- --host --port 6790
   ```
5. Open http://localhost:6790

## Notes
- Ports changed to 6789 (backend) and 6790 (frontend) to avoid conflicts.
- For production, build frontend (`npm run build`) and serve via your preferred static host; keep API base updated.

## One-click launcher (pseudo EXE)
- Ensure deps are installed once:
  ```
  pip install -r backend/requirements.txt
  npm install --prefix frtend
  ```
- Run `python launcher.py` from project root; it will start backend (6789), frontend (6790), and open the browser.
- Optional single-file build: `pip install pyinstaller` then `pyinstaller --onefile launcher.py` (dist/launcher.exe). You still need Node + npm and Python deps available on the machine. Close the console to stop services.
- When using the PyInstaller build, keep `backend/` and `frtend/` folders beside the exe (or include them in the bundle) so paths resolve correctly.
