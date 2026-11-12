"""Settings in one place so values can change without editing code."""

DATABASE_URL = "sqlite:///./biometric.db"  # switch to a MySQL URL if the team keeps that choice
MATCH_THRESHOLD = 0.36                      # minimum similarity to count as a match
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 5
