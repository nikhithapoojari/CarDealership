"""Integration tests for POST /api/vehicles/{id}/purchase and /restock (TDD step 6b)."""
import pytest

from app.models.vehicle import Vehicle


@pytest.fixture
def vehicle(db_session):
    v = Vehicle(make="Toyota", model="Corolla", category="Sedan", price=20000, quantity=2)
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)
    return v


def purchase_url(vid):
    return f"/api/vehicles/{vid}/purchase"


def restock_url(vid):
    return f"/api/vehicles/{vid}/restock"


def stock(client, headers):
    return client.get("/api/vehicles", headers=headers).json()[0]["quantity"]


class TestPurchase:
    def test_requires_authentication(self, client, vehicle):
        assert client.post(purchase_url(vehicle.id)).status_code == 401

    def test_regular_user_can_purchase_and_quantity_drops_by_one(
        self, client, user_headers, vehicle
    ):
        res = client.post(purchase_url(vehicle.id), headers=user_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == vehicle.id
        assert body["quantity"] == 1
        assert (body["make"], body["price"]) == ("Toyota", 20000)
        assert stock(client, user_headers) == 1  # persisted

    def test_admin_can_purchase_too(self, client, admin_headers, vehicle):
        assert client.post(purchase_url(vehicle.id), headers=admin_headers).status_code == 200

    def test_buying_the_last_unit_leaves_zero(self, client, user_headers, vehicle):
        client.post(purchase_url(vehicle.id), headers=user_headers)
        res = client.post(purchase_url(vehicle.id), headers=user_headers)
        assert res.status_code == 200
        assert res.json()["quantity"] == 0

    def test_out_of_stock_returns_409_and_quantity_never_goes_negative(
        self, client, user_headers, vehicle
    ):
        for _ in range(2):
            client.post(purchase_url(vehicle.id), headers=user_headers)
        res = client.post(purchase_url(vehicle.id), headers=user_headers)
        assert res.status_code == 409
        assert stock(client, user_headers) == 0

    def test_missing_vehicle_returns_404(self, client, user_headers):
        assert client.post(purchase_url(9999), headers=user_headers).status_code == 404

    def test_non_integer_id_returns_422(self, client, user_headers):
        assert client.post(purchase_url("abc"), headers=user_headers).status_code == 422


class TestRestock:
    def test_requires_authentication(self, client, vehicle):
        assert client.post(restock_url(vehicle.id), json={"quantity": 5}).status_code == 401

    def test_regular_user_gets_403_and_stock_is_unchanged(self, client, user_headers, vehicle):
        res = client.post(restock_url(vehicle.id), json={"quantity": 5}, headers=user_headers)
        assert res.status_code == 403
        assert stock(client, user_headers) == 2

    def test_admin_restock_adds_to_quantity(self, client, admin_headers, vehicle):
        res = client.post(restock_url(vehicle.id), json={"quantity": 5}, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["quantity"] == 7
        assert stock(client, admin_headers) == 7

    def test_restocking_an_empty_vehicle_makes_it_purchasable_again(
        self, client, admin_headers, user_headers, vehicle
    ):
        for _ in range(2):
            client.post(purchase_url(vehicle.id), headers=user_headers)
        assert client.post(purchase_url(vehicle.id), headers=user_headers).status_code == 409
        client.post(restock_url(vehicle.id), json={"quantity": 3}, headers=admin_headers)
        res = client.post(purchase_url(vehicle.id), headers=user_headers)
        assert res.status_code == 200
        assert res.json()["quantity"] == 2

    def test_missing_vehicle_returns_404_for_admin(self, client, admin_headers):
        res = client.post(restock_url(9999), json={"quantity": 5}, headers=admin_headers)
        assert res.status_code == 404

    def test_non_admin_is_refused_before_existence_is_revealed(self, client, user_headers):
        res = client.post(restock_url(9999), json={"quantity": 5}, headers=user_headers)
        assert res.status_code == 403

    @pytest.mark.parametrize(
        "payload",
        [{}, {"quantity": 0}, {"quantity": -3}, {"quantity": "abc"}, {"quantity": 1.5},
         {"quantity": 100001}],
    )
    def test_invalid_quantity_returns_422(self, client, admin_headers, vehicle, payload):
        res = client.post(restock_url(vehicle.id), json=payload, headers=admin_headers)
        assert res.status_code == 422
