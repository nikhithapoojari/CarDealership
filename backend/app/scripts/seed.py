"""Seed an admin account and optional demo inventory.

    python -m app.scripts.seed --admin-email boss@example.com --admin-password '...' --demo

The password can also come from the ADMIN_PASSWORD env var (keeps it out of shell history).
"""
import argparse
import os
import sys

from sqlalchemy.orm import Session

import app.models.user  # noqa: F401
import app.models.vehicle  # noqa: F401
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.vehicle import Vehicle

DEMO_VEHICLES = [
    ("Toyota", "Corolla", "Sedan", 21500, 6),
    ("Toyota", "RAV4", "SUV", 31200, 3),
    ("Honda", "Civic", "Sedan", 23400, 5),
    ("Honda", "CR-V", "SUV", 33100, 0),
    ("Ford", "F-150", "Truck", 44900, 2),
    ("Ford", "Mustang", "Coupe", 41800, 1),
    ("Tesla", "Model 3", "Electric", 39990, 4),
    ("Subaru", "Outback", "Wagon", 32700, 7),
    ("Mazda", "MX-5 Miata", "Convertible", 29900, 0),
    ("Volkswagen", "Golf GTI", "Hatchback", 32500, 3),
]


def create_admin(db: Session, email: str, password: str) -> User:
    """Create an admin, or promote an existing user (their password is left alone)."""
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is not None:
        user.role = "admin"
    else:
        if len(password) < 8:
            raise ValueError("Admin password must be at least 8 characters")
        user = User(email=email, password_hash=hash_password(password), role="admin")
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_demo_vehicles(db: Session) -> int:
    """Insert sample vehicles into an empty inventory. Returns how many were added."""
    if db.query(Vehicle).count() > 0:
        return 0
    db.add_all(
        Vehicle(make=m, model=mo, category=c, price=p, quantity=q)
        for m, mo, c, p, q in DEMO_VEHICLES
    )
    db.commit()
    return len(DEMO_VEHICLES)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--admin-email", default=os.getenv("ADMIN_EMAIL"))
    parser.add_argument("--admin-password", default=os.getenv("ADMIN_PASSWORD"))
    parser.add_argument("--demo", action="store_true", help="also add sample vehicles")
    args = parser.parse_args(argv)

    if not args.admin_email and not args.demo:
        parser.error("nothing to do: pass --admin-email and/or --demo")

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if args.admin_email:
            if not args.admin_password:
                parser.error("--admin-password (or ADMIN_PASSWORD) is required")
            user = create_admin(db, args.admin_email, args.admin_password)
            print(f"Admin ready: {user.email}")
        if args.demo:
            print(f"Demo vehicles added: {seed_demo_vehicles(db)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
