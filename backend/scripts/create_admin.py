#!/usr/bin/env python3
"""Creates the first administrator account. Run once, from the backend/
directory, with the virtualenv active:

    python3 scripts/create_admin.py

Per the spec, admin accounts are not publicly self-registrable - this script
(or the authenticated POST /api/admin/users endpoint, for admins creating
further admins) is the only way to create one.
"""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import User, UserRole  # noqa: E402


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        email = input("Admin email: ").strip()
        if db.query(User).filter(User.email == email).first():
            print(f"A user with email '{email}' already exists.")
            return
        full_name = input("Full name: ").strip()
        password = getpass.getpass("Password (min 8 chars): ")
        if len(password) < 8:
            print("Password must be at least 8 characters.")
            return

        user = User(email=email, hashed_password=hash_password(password), full_name=full_name, role=UserRole.ADMIN)
        db.add(user)
        db.commit()
        print(f"Admin account created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
