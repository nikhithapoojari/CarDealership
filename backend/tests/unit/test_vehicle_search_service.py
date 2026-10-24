"""Unit tests for VehicleService.search (TDD step 4a)."""
from decimal import Decimal

import pytest

from app.services.vehicle_service import InvalidPriceRangeError, VehicleService


class RecordingRepository:
    def __init__(self):
        self.calls = []

    def search(self, **filters):
        self.calls.append(filters)
        return []


def test_search_passes_filters_to_repository():
    repo = RecordingRepository()
    VehicleService(repo).search(make="toyota", min_price=Decimal(1), max_price=Decimal(9))
    assert repo.calls == [
        {
            "make": "toyota",
            "model": None,
            "category": None,
            "min_price": Decimal(1),
            "max_price": Decimal(9),
        }
    ]


def test_blank_text_filters_are_treated_as_absent():
    repo = RecordingRepository()
    VehicleService(repo).search(make="  ", model="")
    assert repo.calls[0]["make"] is None
    assert repo.calls[0]["model"] is None


def test_min_price_greater_than_max_price_raises():
    with pytest.raises(InvalidPriceRangeError):
        VehicleService(RecordingRepository()).search(
            min_price=Decimal(10), max_price=Decimal(5)
        )
