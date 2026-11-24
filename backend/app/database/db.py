"""Database connection and session setup. (Issue: Set Up Database Schema)"""

"""This current code is for a demo SQLite database. This code needs to change (probably all of it) for the complete database."""

from contextlib import contextmanager
from pathlib import Path
import sqlite3

DEMO_DB = Path(__file__).resolve().parents[3] / "demo-enrollment.sqlite3"
ACCESS_LEVEL_COLUMN = """
    access_level TEXT NOT NULL DEFAULT 'none'
    CHECK (access_level IN ('none', 'level_1', 'level_2', 'level_3', 'top_secret'))
"""


@contextmanager
def connect(demo_users):
    """Open a transaction and finish any schema upgrade before using the directory"""
    connection = sqlite3.connect(DEMO_DB)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            # Get write lock before inspecting the schema to serialize migrations
            connection.execute("BEGIN IMMEDIATE")
            migrate_directory(connection, demo_users)
            yield connection
    finally:
        connection.close()


def migrate_directory(connection, demo_users):
    columns = {column["name"] for column in connection.execute("PRAGMA table_info(directory_users)")}
    if columns:
        if "has_lab_access" in columns:
            connection.execute(f"ALTER TABLE directory_users ADD COLUMN {ACCESS_LEVEL_COLUMN}")
            connection.execute("""
                UPDATE directory_users
                SET access_level = CASE WHEN has_lab_access = 1 THEN 'level_1' ELSE 'none' END
            """)
            connection.execute("ALTER TABLE directory_users DROP COLUMN has_lab_access")
        return

    connection.execute(f"""
        CREATE TABLE directory_users (
            employee_key TEXT PRIMARY KEY NOT NULL,
            employee_id TEXT NOT NULL,
            name TEXT NOT NULL,
            enrollment_status TEXT NOT NULL DEFAULT 'pending_face',
            enrolled_on TEXT,
            {ACCESS_LEVEL_COLUMN}
        )
    """)
    if connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pending_users'"
    ).fetchone():
        connection.execute("""
            INSERT INTO directory_users (employee_key, employee_id, name)
            SELECT employee_key, employee_id, name FROM pending_users
        """)
        connection.execute("DROP TABLE pending_users")

    connection.executemany("""
        INSERT INTO directory_users
            (employee_key, employee_id, name, enrollment_status, enrolled_on, access_level)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(employee_key) DO NOTHING
    """, [
        (user.employee_id.casefold(), user.employee_id, user.name, user.enrollment_status,
         user.enrolled_on.isoformat(), user.access_level)
        for user in demo_users
    ])
