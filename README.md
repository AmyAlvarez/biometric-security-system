# Biometric Security System

CSE 2410 team project: facial-recognition access control. A camera captures a face, the
recognition engine (Raspberry Pi) identifies the person, the access control system grants
or denies access, and a Java controller operates the physical lock. Administrators manage
users and review access logs through a web dashboard.

## Project structure

| Folder | What goes there | Related components |
|---|---|---|
| `backend/` | FastAPI app: API routes, access decisions, database | Backend API, Access Control, User Management, Logging & Lockout |
| `computer_vision/` | Camera capture, face detection, feature extraction, matching | Camera Component, Facial Recognition Engine |
| `frontend/` | HTML/CSS/JS for the authentication screen and admin dashboard | Authentication GUI, Web Application |
| `hardware/` | Java lock controller (GPIO) and wiring notes | Protected Resource Controller |
| `scripts/` | Helper scripts (seed the database, set up the Pi) | — |
| `tests/` | Automated tests | — |
| `docs/` | Milestone documents, diagrams, ADRs, demo video | — |

## Getting started

```bash
# from the repo root
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn backend.app.main:app --reload
```

Then open http://127.0.0.1:8000/docs to see the API.

## Team
- (add names and roles)
