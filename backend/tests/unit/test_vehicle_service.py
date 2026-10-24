"""Unit tests for VehicleService with a fake repository (TDD step 3a)."""
from app.services.vehicle_service import VehicleService


class FakeVehicleRepository:
    def __init__(self):
        self.items = []

    def add(self, vehicle):
        vehicle.id = len(self.items) + 1
        self.items.append(vehicle)
        return vehicle

    def list_all(self):
        return list(self.items)


def test_create_returns_vehicle_with_given_fields():
    service = VehicleService(FakeVehicleRepository())
    v = service.create(make="Toyota", model="Corolla", category="Sedan", price=20000, quantity=3)
    assert (v.id, v.make, v.model, v.quantity) == (1, "Toyota", "Corolla", 3)


def test_list_returns_all_vehicles_including_out_of_stock():
    service = VehicleService(FakeVehicleRepository())
    service.create(make="A", model="X", category="Sedan", price=1, quantity=0)
    service.create(make="B", model="Y", category="SUV", price=2, quantity=5)
    assert len(service.list_all()) == 2
