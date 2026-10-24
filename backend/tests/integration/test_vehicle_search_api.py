"""Integration tests for GET /api/vehicles/search (TDD step 4b)."""
import pytest

from app.models.vehicle import Vehicle

URL = "/api/vehicles/search"


@pytest.fixture
def seeded(db_session):
    rows = [
        ("Toyota", "Corolla", "Sedan", 20000, 3),
        ("Toyota", "RAV4", "SUV", 30000, 2),
        ("Honda", "Civic", "Sedan", 22000, 5),
        ("Honda", "CR-V", "SUV", 32000, 0),  # out of stock but still searchable
        ("Ford", "F-150", "Truck", 45000, 1),
    ]
    db_session.add_all(
        Vehicle(make=m, model=mo, category=c, price=p, quantity=q) for m, mo, c, p, q in rows
    )
    db_session.commit()


def models(res):
    return [v["model"] for v in res.json()]


class TestSearchAccess:
    def test_requires_authentication(self, client):
        assert client.get(URL).status_code == 401


@pytest.mark.usefixtures("seeded")
class TestSearchFilters:
    def test_no_filters_returns_everything_in_id_order(self, client, user_headers):
        res = client.get(URL, headers=user_headers)
        assert res.status_code == 200
        assert models(res) == ["Corolla", "RAV4", "Civic", "CR-V", "F-150"]

    def test_blank_filter_is_ignored(self, client, user_headers):
        res = client.get(URL, params={"make": ""}, headers=user_headers)
        assert len(res.json()) == 5

    def test_filter_by_make(self, client, user_headers):
        res = client.get(URL, params={"make": "Toyota"}, headers=user_headers)
        assert models(res) == ["Corolla", "RAV4"]

    def test_make_is_case_insensitive_and_partial(self, client, user_headers):
        assert models(client.get(URL, params={"make": "toyota"}, headers=user_headers)) == [
            "Corolla",
            "RAV4",
        ]
        assert models(client.get(URL, params={"make": "yot"}, headers=user_headers)) == [
            "Corolla",
            "RAV4",
        ]

    def test_filter_by_model(self, client, user_headers):
        res = client.get(URL, params={"model": "civic"}, headers=user_headers)
        assert models(res) == ["Civic"]

    def test_filter_by_category_includes_out_of_stock(self, client, user_headers):
        res = client.get(URL, params={"category": "suv"}, headers=user_headers)
        assert models(res) == ["RAV4", "CR-V"]

    def test_min_price_is_inclusive(self, client, user_headers):
        res = client.get(URL, params={"min_price": 30000}, headers=user_headers)
        assert models(res) == ["RAV4", "CR-V", "F-150"]

    def test_max_price_is_inclusive(self, client, user_headers):
        res = client.get(URL, params={"max_price": 22000}, headers=user_headers)
        assert models(res) == ["Corolla", "Civic"]

    def test_price_range(self, client, user_headers):
        res = client.get(
            URL, params={"min_price": 21000, "max_price": 31000}, headers=user_headers
        )
        assert models(res) == ["RAV4", "Civic"]

    def test_filters_combine_with_and(self, client, user_headers):
        res = client.get(
            URL, params={"make": "honda", "category": "sedan"}, headers=user_headers
        )
        assert models(res) == ["Civic"]

    def test_no_match_returns_empty_list(self, client, user_headers):
        res = client.get(URL, params={"make": "Tesla"}, headers=user_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_like_wildcards_are_treated_literally(self, client, user_headers):
        assert client.get(URL, params={"make": "%"}, headers=user_headers).json() == []
        assert client.get(URL, params={"model": "_"}, headers=user_headers).json() == []


@pytest.mark.usefixtures("seeded")
class TestSearchValidation:
    def test_min_greater_than_max_returns_422(self, client, user_headers):
        res = client.get(
            URL, params={"min_price": 50000, "max_price": 10000}, headers=user_headers
        )
        assert res.status_code == 422

    def test_negative_price_returns_422(self, client, user_headers):
        res = client.get(URL, params={"min_price": -1}, headers=user_headers)
        assert res.status_code == 422

    def test_non_numeric_price_returns_422(self, client, user_headers):
        res = client.get(URL, params={"max_price": "cheap"}, headers=user_headers)
        assert res.status_code == 422
