"""Unit tests for VehicleService.update/delete with a fake repository (TDD step 5a)."""
import pytest

from app.models.vehicle import Vehicle
from app.services.vehicle_service import VehicleNotFoundError, VehicleService


class FakeRepository:
    def __init__(self):
        self.items = {
            1: Vehicle(id=1, make="Toyota", model="Corolla", category="Sedan", price=100, quantity=2)
        }

    def get(self, vehicle_id):
        return self.items.get(vehicle_id)

    def save(self, vehicle):
        return vehicle

    def delete(self, vehicle):
        del self.items[vehicle.id]


@pytest.fixture
def repo():
    return FakeRepository()


def test_update_changes_only_given_fields(repo):
    v = VehicleService(repo).update(1, price=999)
    assert v.price == 999
    assert (v.make, v.quantity) == ("Toyota", 2)


def test_update_missing_vehicle_raises(repo):
    with pytest.raises(VehicleNotFoundError):
        VehicleService(repo).update(42, price=1)


def test_delete_removes_vehicle(repo):
    VehicleService(repo).delete(1)
    assert repo.get(1) is None


def test_delete_missing_vehicle_raises(repo):
    with pytest.raises(VehicleNotFoundError):
        VehicleService(repo).delete(42)
