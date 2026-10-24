"""Tests for the admin / demo-data seeding helpers."""
import pytest

from app.core.security import verify_password
from app.models.user import User
from app.models.vehicle import Vehicle
from app.scripts.seed import create_admin, seed_demo_vehicles


def test_create_admin_makes_a_new_admin(db_session):
    user = create_admin(db_session, "Boss@Example.com", "password123")
    assert user.role == "admin"
    assert user.email == "boss@example.com"
    assert verify_password("password123", user.password_hash)


def test_create_admin_promotes_existing_user_without_touching_password(db_session):
    first = create_admin(db_session, "boss@example.com", "password123")
    first.role = "user"
    db_session.commit()
    again = create_admin(db_session, "boss@example.com", "different-password")
    assert again.id == first.id
    assert again.role == "admin"
    assert verify_password("password123", again.password_hash)
    assert db_session.query(User).count() == 1


def test_create_admin_rejects_short_password(db_session):
    with pytest.raises(ValueError):
        create_admin(db_session, "boss@example.com", "short")


def test_demo_vehicles_are_seeded_once(db_session):
    added = seed_demo_vehicles(db_session)
    assert added >= 8
    assert db_session.query(Vehicle).filter(Vehicle.quantity == 0).count() >= 1
    assert seed_demo_vehicles(db_session) == 0  # idempotent
