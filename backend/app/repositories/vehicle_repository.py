from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle


def _contains(column, value: str):
    """Case-insensitive substring match with LIKE wildcards escaped."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return column.ilike(f"%{escaped}%", escape="\\")


class VehicleRepository:
    def __init__(self, db: Session):
        self._db = db

    def get(self, vehicle_id: int) -> Vehicle | None:
        return self._db.get(Vehicle, vehicle_id)

    def add(self, vehicle: Vehicle) -> Vehicle:
        self._db.add(vehicle)
        return self.save(vehicle)

    def save(self, vehicle: Vehicle) -> Vehicle:
        self._db.commit()
        self._db.refresh(vehicle)
        return vehicle

    def delete(self, vehicle: Vehicle) -> None:
        self._db.delete(vehicle)
        self._db.commit()

    def decrement_stock(self, vehicle_id: int) -> bool:
        """Atomically take one unit. Returns False if the vehicle is missing or out of stock.

        A single guarded UPDATE (not read-then-write) so concurrent buyers can't oversell.
        """
        result = self._db.execute(
            update(Vehicle)
            .where(Vehicle.id == vehicle_id, Vehicle.quantity > 0)
            .values(quantity=Vehicle.quantity - 1)
        )
        self._db.commit()
        return result.rowcount == 1

    def increment_stock(self, vehicle_id: int, amount: int) -> bool:
        """Atomically add stock. Returns False if the vehicle does not exist."""
        result = self._db.execute(
            update(Vehicle)
            .where(Vehicle.id == vehicle_id)
            .values(quantity=Vehicle.quantity + amount)
        )
        self._db.commit()
        return result.rowcount == 1

    def list_all(self) -> list[Vehicle]:
        return list(self._db.scalars(select(Vehicle).order_by(Vehicle.id)))

    def search(
        self,
        *,
        make: str | None = None,
        model: str | None = None,
        category: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
    ) -> list[Vehicle]:
        stmt = select(Vehicle).order_by(Vehicle.id)
        if make:
            stmt = stmt.where(_contains(Vehicle.make, make))
        if model:
            stmt = stmt.where(_contains(Vehicle.model, model))
        if category:
            stmt = stmt.where(_contains(Vehicle.category, category))
        if min_price is not None:
            stmt = stmt.where(Vehicle.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(Vehicle.price <= max_price)
        return list(self._db.scalars(stmt))
