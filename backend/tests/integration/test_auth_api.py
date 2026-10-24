"""Integration tests for POST /api/auth/register and /api/auth/login (TDD step 2b)."""
from app.core.security import decode_access_token

REGISTER = "/api/auth/register"
LOGIN = "/api/auth/login"
CREDS = {"email": "jane@example.com", "password": "password123"}


class TestRegister:
    def test_creates_user_and_returns_public_fields_only(self, client):
        res = client.post(REGISTER, json=CREDS)
        assert res.status_code == 201
        body = res.json()
        assert body["email"] == CREDS["email"]
        assert body["role"] == "user"
        assert "id" in body
        assert "password" not in body and "password_hash" not in body

    def test_duplicate_email_returns_409(self, client):
        client.post(REGISTER, json=CREDS)
        assert client.post(REGISTER, json=CREDS).status_code == 409

    def test_duplicate_email_is_case_insensitive(self, client):
        client.post(REGISTER, json=CREDS)
        res = client.post(REGISTER, json={**CREDS, "email": "JANE@example.com"})
        assert res.status_code == 409

    def test_invalid_email_returns_422(self, client):
        res = client.post(REGISTER, json={**CREDS, "email": "not-an-email"})
        assert res.status_code == 422

    def test_short_password_returns_422(self, client):
        res = client.post(REGISTER, json={**CREDS, "password": "short"})
        assert res.status_code == 422

    def test_cannot_self_assign_admin_role(self, client):
        res = client.post(REGISTER, json={**CREDS, "role": "admin"})
        assert res.status_code == 201
        assert res.json()["role"] == "user"


class TestLogin:
    def test_valid_credentials_return_bearer_token(self, client):
        user_id = client.post(REGISTER, json=CREDS).json()["id"]
        res = client.post(LOGIN, json=CREDS)
        assert res.status_code == 200
        body = res.json()
        assert body["token_type"] == "bearer"
        claims = decode_access_token(body["access_token"])
        assert claims["sub"] == str(user_id)
        assert claims["role"] == "user"

    def test_wrong_password_returns_401(self, client):
        client.post(REGISTER, json=CREDS)
        res = client.post(LOGIN, json={**CREDS, "password": "wrong-password"})
        assert res.status_code == 401

    def test_unknown_user_returns_same_401_as_wrong_password(self, client):
        client.post(REGISTER, json=CREDS)
        wrong_pw = client.post(LOGIN, json={**CREDS, "password": "wrong-password"})
        unknown = client.post(LOGIN, json={"email": "x@y.com", "password": "password123"})
        assert unknown.status_code == 401
        # No user enumeration: identical error body
        assert unknown.json() == wrong_pw.json()
