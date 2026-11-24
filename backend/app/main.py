"""FastAPI entry point. Run from the repo root with:
    uvicorn backend.app.main:app --reload
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routes import users

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(title="Biometric Security System API")
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}

# Routers get added here as they are built, e.g.:
# from backend.app.routes import auth, users, logs
# app.include_router(auth.router)

@app.get("/", include_in_schema=False)
def home():
    return FileResponse(FRONTEND / "index.html")


@app.get("/auth/", include_in_schema=False)
def authentication_page():
    return FileResponse(FRONTEND / "auth" / "index.html")


@app.get("/dashboard/", include_in_schema=False)
def dashboard():
    return FileResponse(FRONTEND / "dashboard" / "index.html")


# Expose shared assets here. Serve each HTML page through its explicit route
for directory in ("assets", "css", "js"):
    app.mount(f"/static/{directory}", StaticFiles(directory=FRONTEND / directory))
