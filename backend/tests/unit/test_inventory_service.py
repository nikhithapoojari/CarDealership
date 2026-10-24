"""Unit tests for VehicleService.purchase/restock with a fake repository (TDD step 6a)."""
import pytest

from app.models.vehicle import Vehicle
from app.services.vehicle_service import (
    OutOfStockError,
    VehicleNotFoundError,
    VehicleService,
)


class FakeRepository:
    def __init__(self, quantity=2):
        self.items = {
            1: Vehicle(id=1, make="Toyota", model="Corolla", category="Sedan", price=1, quantity=quantity)
        }

    def get(self, vehicle_id):
        return self.items.get(vehicle_id)

    def decrement_stock(self, vehicle_id):
        v = self.items.get(vehicle_id)
        if v is None or v.quantity <= 0:
            return False
        v.quantity -= 1
        return True

    def increment_stock(self, vehicle_id, amount):
        v = self.items.get(vehicle_id)
        if v is None:
            return False
        v.quantity += amount
        return True


def test_purchase_decrements_quantity_by_one():
    assert VehicleService(FakeRepository(quantity=2)).purchase(1).quantity == 1


def test_purchase_when_out_of_stock_raises():
    with pytest.raises(OutOfStockError):
        VehicleService(FakeRepository(quantity=0)).purchase(1)


def test_purchase_missing_vehicle_raises_not_found():
    with pytest.raises(VehicleNotFoundError):
        VehicleService(FakeRepository()).purchase(42)


def test_restock_increases_quantity():
    assert VehicleService(FakeRepository(quantity=2)).restock(1, 5).quantity == 7


def test_restock_missing_vehicle_raises_not_found():
    with pytest.raises(VehicleNotFoundError):
        VehicleService(FakeRepository()).restock(42, 5)
