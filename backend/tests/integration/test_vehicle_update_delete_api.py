"""Integration tests for PUT and DELETE /api/vehicles/{id} (TDD step 5b)."""
import pytest

from app.models.vehicle import Vehicle


@pytest.fixture
def vehicle(db_session):
    v = Vehicle(make="Toyota", model="Corolla", category="Sedan", price=20000, quantity=3)
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)
    return v


def url(vehicle_id):
    return f"/api/vehicles/{vehicle_id}"


class TestUpdate:
    def test_requires_authentication(self, client, vehicle):
        assert client.put(url(vehicle.id), json={"price": 1}).status_code == 401

    def test_updates_given_fields_and_persists(self, client, user_headers, vehicle):
        res = client.put(
            url(vehicle.id), json={"price": 18999.99, "quantity": 7}, headers=user_headers
        )
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == vehicle.id
        assert body["price"] == 18999.99
        assert body["quantity"] == 7
        listed = client.get("/api/vehicles", headers=user_headers).json()
        assert listed[0]["price"] == 18999.99

    def test_partial_update_leaves_other_fields_untouched(self, client, user_headers, vehicle):
        body = client.put(url(vehicle.id), json={"model": "Camry"}, headers=user_headers).json()
        assert body["model"] == "Camry"
        assert (body["make"], body["category"], body["quantity"]) == ("Toyota", "Sedan", 3)

    def test_id_in_body_is_ignored(self, client, user_headers, vehicle):
        body = client.put(
            url(vehicle.id), json={"id": 999, "price": 1}, headers=user_headers
        ).json()
        assert body["id"] == vehicle.id

    def test_missing_vehicle_returns_404(self, client, user_headers):
        assert client.put(url(9999), json={"price": 1}, headers=user_headers).status_code == 404

    @pytest.mark.parametrize(
        "payload",
        [
            {},  # nothing to update
            {"price": 0},
            {"price": -5},
            {"quantity": -1},
            {"make": None},
            {"make": ""},
            {"make": "   "},
        ],
    )
    def test_invalid_payload_returns_422(self, client, user_headers, vehicle, payload):
        assert client.put(url(vehicle.id), json=payload, headers=user_headers).status_code == 422

    def test_non_integer_id_returns_422(self, client, user_headers):
        assert client.put(url("abc"), json={"price": 1}, headers=user_headers).status_code == 422


class TestDelete:
    def test_requires_authentication(self, client, vehicle):
        assert client.delete(url(vehicle.id)).status_code == 401

    def test_regular_user_gets_403_and_vehicle_survives(self, client, user_headers, vehicle):
        assert client.delete(url(vehicle.id), headers=user_headers).status_code == 403
        assert len(client.get("/api/vehicles", headers=user_headers).json()) == 1

    def test_admin_can_delete(self, client, admin_headers, vehicle):
        res = client.delete(url(vehicle.id), headers=admin_headers)
        assert res.status_code == 204
        assert res.content == b""
        assert client.get("/api/vehicles", headers=admin_headers).json() == []

    def test_deleting_twice_returns_404(self, client, admin_headers, vehicle):
        client.delete(url(vehicle.id), headers=admin_headers)
        assert client.delete(url(vehicle.id), headers=admin_headers).status_code == 404

    def test_admin_deleting_missing_vehicle_returns_404(self, client, admin_headers):
        assert client.delete(url(9999), headers=admin_headers).status_code == 404

    def test_non_admin_is_refused_before_existence_is_revealed(self, client, user_headers):
        # 403, not 404: regular users learn nothing about which IDs exist
        assert client.delete(url(9999), headers=user_headers).status_code == 403
