from decimal import Decimal

from app.models.vehicle import Vehicle


class InvalidPriceRangeError(Exception):
    """min_price is greater than max_price."""


class OutOfStockError(Exception):
    """The vehicle has no units left to sell."""


class VehicleNotFoundError(Exception):
    """No vehicle exists with the requested id."""


def _clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


class VehicleService:
    def __init__(self, vehicles):
        self._vehicles = vehicles

    def create(self, *, make, model, category, price, quantity=0) -> Vehicle:
        vehicle = Vehicle(
            make=make, model=model, category=category, price=price, quantity=quantity
        )
        return self._vehicles.add(vehicle)

    def list_all(self) -> list[Vehicle]:
        return self._vehicles.list_all()

    def search(
        self,
        *,
        make: str | None = None,
        model: str | None = None,
        category: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
    ) -> list[Vehicle]:
        if min_price is not None and max_price is not None and min_price > max_price:
            raise InvalidPriceRangeError()
        return self._vehicles.search(
            make=_clean(make),
            model=_clean(model),
            category=_clean(category),
            min_price=min_price,
            max_price=max_price,
        )

    def _get_or_raise(self, vehicle_id: int) -> Vehicle:
        vehicle = self._vehicles.get(vehicle_id)
        if vehicle is None:
            raise VehicleNotFoundError(vehicle_id)
        return vehicle

    def update(self, vehicle_id: int, **fields) -> Vehicle:
        vehicle = self._get_or_raise(vehicle_id)
        for name, value in fields.items():
            setattr(vehicle, name, value)
        return self._vehicles.save(vehicle)

    def delete(self, vehicle_id: int) -> None:
        self._vehicles.delete(self._get_or_raise(vehicle_id))

    def purchase(self, vehicle_id: int) -> Vehicle:
        if not self._vehicles.decrement_stock(vehicle_id):
            # The guarded UPDATE touched no row: either no such vehicle, or none in stock.
            self._get_or_raise(vehicle_id)
            raise OutOfStockError(vehicle_id)
        return self._get_or_raise(vehicle_id)

    def restock(self, vehicle_id: int, amount: int) -> Vehicle:
        if not self._vehicles.increment_stock(vehicle_id, amount):
            raise VehicleNotFoundError(vehicle_id)
        return self._get_or_raise(vehicle_id)
