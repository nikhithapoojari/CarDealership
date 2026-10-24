"""Guards against overselling: the protection must live in SQL, not in Python (TDD step 6c)."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.vehicle import Vehicle
from app.repositories.vehicle_repository import VehicleRepository


def _make_vehicle(db_session, quantity):
    v = Vehicle(make="Honda", model="Civic", category="Sedan", price=22000, quantity=quantity)
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)
    return v


def test_stale_read_cannot_oversell_the_last_unit(db_session, session_factory):
    """Two buyers both saw quantity == 1. Only the first purchase may succeed."""
    vehicle = _make_vehicle(db_session, quantity=1)
    repo_a = VehicleRepository(session_factory())
    repo_b = VehicleRepository(session_factory())

    assert repo_a.get(vehicle.id).quantity == 1  # buyer A's (soon stale) view
    assert repo_b.decrement_stock(vehicle.id) is True  # buyer B takes the last unit
    assert repo_a.decrement_stock(vehicle.id) is False  # buyer A must be refused

    db_session.expire_all()
    assert db_session.get(Vehicle, vehicle.id).quantity == 0


def test_decrement_on_empty_stock_changes_nothing(db_session):
    vehicle = _make_vehicle(db_session, quantity=0)
    assert VehicleRepository(db_session).decrement_stock(vehicle.id) is False
    db_session.expire_all()
    assert db_session.get(Vehicle, vehicle.id).quantity == 0


def test_database_rejects_negative_quantity(db_session):
    db_session.add(
        Vehicle(make="X", model="Y", category="Z", price=1, quantity=-1)
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
