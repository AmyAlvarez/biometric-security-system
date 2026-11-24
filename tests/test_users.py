"""Simple user test made by AI, for code verification. Will most likely change."""

from contextlib import closing
from datetime import date
import sqlite3

from fastapi.testclient import TestClient

from backend.app.database import db
from backend.app.main import app

client = TestClient(app)


def test_users_directory_returns_six_sorted_demo_records(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DEMO_DB", tmp_path / "enrollment.sqlite3")
    response = client.get("/users")
    assert response.status_code == 200
    users = response.json()

    assert [user["name"] for user in users] == [
        "Alexis Young", "Amy Alvarez", "Equento Ruch",
        "Gustavo Chazan", "Ryan Cofer", "Tyler Hanks",
    ]
    assert len({user["employee_id"] for user in users}) == 6
    for user in users:
        assert set(user) == {
            "employee_id", "name", "enrollment_status", "enrolled_on", "access_level"
        }
        assert user["enrollment_status"] == "enrolled"
        assert date.fromisoformat(user["enrolled_on"]).isoformat() == user["enrolled_on"]

    assert sum(user["access_level"] == "level_1" for user in users) == 2
    assert users[1]["employee_id"] == "0001"
    assert users[1]["access_level"] == "level_1"


def create_legacy_directory(path, records=()):
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.execute("""
            CREATE TABLE directory_users (
                employee_key TEXT PRIMARY KEY NOT NULL,
                employee_id TEXT NOT NULL,
                name TEXT NOT NULL,
                enrollment_status TEXT NOT NULL DEFAULT 'pending_face',
                enrolled_on TEXT,
                has_lab_access INTEGER NOT NULL DEFAULT 0
            )
        """)
        connection.executemany("INSERT INTO directory_users VALUES (?, ?, ?, ?, ?, ?)", records)


def test_migration_keeps_empty_directory_empty(monkeypatch, tmp_path):
    path = tmp_path / "empty.sqlite3"
    create_legacy_directory(path)
    monkeypatch.setattr(db, "DEMO_DB", path)
    for _ in range(2):
        response = client.get("/users")
        assert response.status_code == 200
        assert response.json() == []


def test_migration_and_access_level_updates_preserve_enrollment(monkeypatch, tmp_path):
    path = tmp_path / "legacy.sqlite3"
    create_legacy_directory(path, [
        ("pending-1", "PENDING-1", "Pending Demo", "pending_face", None, 1),
        ("enrolled-1", "ENROLLED-1", "Enrolled Demo", "enrolled", "2026-11-12", 0),
    ])
    monkeypatch.setattr(db, "DEMO_DB", path)
    response = client.get("/users")
    assert response.status_code == 200
    users = {user["employee_id"]: user for user in response.json()}
    pending = users["PENDING-1"]
    enrolled = users["ENROLLED-1"]
    assert pending == {
        "employee_id": "PENDING-1", "name": "Pending Demo", "enrollment_status": "pending_face",
        "enrolled_on": None, "access_level": "level_1",
    }
    assert enrolled["access_level"] == "none"
    assert enrolled["enrolled_on"] == "2026-11-12"

    for level in ("none", "level_1", "level_2", "level_3", "top_secret"):
        response = client.patch("/users/pending-1", json={"access_level": level})
        assert response.status_code == 200
        assert response.json() == {**pending, "access_level": level}

    assert client.patch("/users/PENDING-1", json={"access_level": "level_4"}).status_code == 422
    assert next(
        user["access_level"] for user in client.get("/users").json()
        if user["employee_id"] == pending["employee_id"]
    ) == "top_secret"
    created = client.post("/users", json={"name": "New Demo", "employee_id": "NEW-1"})
    assert created.status_code == 201
    assert created.json()["access_level"] == "none"


def test_enrollment_conflict_preserves_original_employee(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DEMO_DB", tmp_path / "enrollment.sqlite3")
    created = client.post("/users", json={"name": "New Demo", "employee_id": " Staff-01 "})
    assert created.status_code == 201
    assert created.json()["employee_id"] == "Staff-01"

    duplicate = client.post("/users", json={"name": "Duplicate Demo", "employee_id": "staff-01"})
    assert duplicate.status_code == 409
    assert duplicate.json() == {"detail": "That employee ID already exists."}

    users = client.get("/users").json()
    assert [user for user in users if user["employee_id"].casefold() == "staff-01"] == [created.json()]
