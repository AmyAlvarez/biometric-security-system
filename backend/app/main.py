"""FastAPI entry point. Run from the repo root with:
    uvicorn backend.app.main:app --reload
"""
from fastapi import FastAPI

app = FastAPI(title="Biometric Security System API")


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers get added here as they are built, e.g.:
# from backend.app.routes import auth, users, logs
# app.include_router(auth.router)
