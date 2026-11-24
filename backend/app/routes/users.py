"""User enrollment and management endpoints. (Issues: Enroll New Users, Admin Dashboard)"""

from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field

from ..database import db

router = APIRouter()
AccessLevel = Literal["none", "level_1", "level_2", "level_3", "top_secret"]


class DirectoryUser(BaseModel):
    employee_id: str
    name: str
    enrollment_status: Literal["enrolled", "pending_face"]
    enrolled_on: date | None
    # Employee access levels are independent of dashboard roles.
    access_level: AccessLevel


class NewUser(BaseModel):
    """Accept employee details and let SQLite supply the enrollment and access defaults"""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    employee_id: str = Field(min_length=1, max_length=64)


class PermissionChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_level: AccessLevel


DEMO_USERS = [
    DirectoryUser(
        employee_id=employee_id,
        name=name,
        enrollment_status="enrolled",
        enrolled_on=date(2026, 11, 12),
        access_level=access_level,
    )
    for employee_id, name, access_level in [
        ("0005", "Alexis Young", "top_secret"),
        ("0001", "Amy Alvarez", "level_1"),
        ("0004", "Equento Ruch", "level_3"),
        ("0003", "Gustavo Chazan", "level_2"),
        ("0002", "Ryan Cofer", "level_1"),
        ("0006", "Tyler Hanks", "none"),
    ]
]


def directory_user(row):
    return DirectoryUser.model_validate(dict(row))


@router.get("/users", response_model=list[DirectoryUser])
def list_users():
    with db.connect(DEMO_USERS) as connection:
        rows = connection.execute("SELECT * FROM directory_users").fetchall()
    return sorted((directory_user(row) for row in rows), key=lambda user: user.name.casefold())


@router.post("/users", response_model=DirectoryUser, status_code=status.HTTP_201_CREATED)
def enroll_user(user: NewUser):
    # Store entered ID for display and use its case-folded key for uniqueness
    with db.connect(DEMO_USERS) as connection:
        row = connection.execute("""
            INSERT INTO directory_users (employee_key, employee_id, name)
            VALUES (?, ?, ?)
            ON CONFLICT(employee_key) DO NOTHING
            RETURNING *
        """, (user.employee_id.casefold(), user.employee_id, user.name)).fetchone()
    if row is None:
        raise HTTPException(status_code=409, detail="That employee ID already exists.")
    return directory_user(row)


@router.patch("/users/{employee_id:path}", response_model=DirectoryUser)
def change_permission(employee_id: str, change: PermissionChange):
    with db.connect(DEMO_USERS) as connection:
        row = connection.execute("""
            UPDATE directory_users SET access_level = ?
            WHERE employee_key = ? RETURNING *
        """, (change.access_level, employee_id.strip().casefold())).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return directory_user(row)


@router.delete("/users/{employee_id:path}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(employee_id: str):
    with db.connect(DEMO_USERS) as connection:
        deleted = connection.execute(
            "DELETE FROM directory_users WHERE employee_key = ?", (employee_id.strip().casefold(),)
        ).rowcount
    if not deleted:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
