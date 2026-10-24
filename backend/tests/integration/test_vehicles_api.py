"""Integration tests for POST/GET /api/vehicles and route protection (TDD step 3b)."""
URL = "/api/vehicles"
VEHICLE = {
    "make": "Toyota",
    "model": "Corolla",
    "category": "Sedan",
    "price": 20000.50,
    "quantity": 3,
}


class TestAuthentication:
    def test_post_without_token_returns_401(self, client):
        assert client.post(URL, json=VEHICLE).status_code == 401

    def test_get_without_token_returns_401(self, client):
        assert client.get(URL).status_code == 401

    def test_garbage_token_returns_401(self, client):
        res = client.get(URL, headers={"Authorization": "Bearer not-a-jwt"})
        assert res.status_code == 401

    def test_token_for_deleted_user_returns_401(self, client):
        from app.core.security import create_access_token

        token = create_access_token(subject="9999", role="admin")
        res = client.get(URL, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401


class TestCreateVehicle:
    def test_authenticated_user_can_create(self, client, user_headers):
        res = client.post(URL, json=VEHICLE, headers=user_headers)
        assert res.status_code == 201
        body = res.json()
        assert isinstance(body["id"], int)
        assert body["make"] == "Toyota"
        assert body["price"] == 20000.50
        assert body["quantity"] == 3

    def test_each_vehicle_gets_a_unique_id(self, client, user_headers):
        a = client.post(URL, json=VEHICLE, headers=user_headers).json()["id"]
        b = client.post(URL, json=VEHICLE, headers=user_headers).json()["id"]
        assert a != b

    def test_quantity_defaults_to_zero(self, client, user_headers):
        payload = {k: v for k, v in VEHICLE.items() if k != "quantity"}
        res = client.post(URL, json=payload, headers=user_headers)
        assert res.status_code == 201
        assert res.json()["quantity"] == 0

    def test_missing_required_field_returns_422(self, client, user_headers):
        payload = {k: v for k, v in VEHICLE.items() if k != "make"}
        assert client.post(URL, json=payload, headers=user_headers).status_code == 422

    def test_non_positive_price_returns_422(self, client, user_headers):
        res = client.post(URL, json={**VEHICLE, "price": 0}, headers=user_headers)
        assert res.status_code == 422

    def test_negative_quantity_returns_422(self, client, user_headers):
        res = client.post(URL, json={**VEHICLE, "quantity": -1}, headers=user_headers)
        assert res.status_code == 422


class TestListVehicles:
    def test_empty_inventory_returns_empty_list(self, client, user_headers):
        res = client.get(URL, headers=user_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_created_vehicles_including_out_of_stock(self, client, user_headers):
        client.post(URL, json=VEHICLE, headers=user_headers)
        client.post(URL, json={**VEHICLE, "model": "Camry", "quantity": 0}, headers=user_headers)
        res = client.get(URL, headers=user_headers)
        assert [v["model"] for v in res.json()] == ["Corolla", "Camry"]
