"""CORS lets the React dev server call the API (polish step)."""
ALLOWED = "http://localhost:5173"


def preflight(client, origin):
    return client.options(
        "/api/vehicles",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )


def test_configured_origin_is_allowed(client):
    res = preflight(client, ALLOWED)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == ALLOWED


def test_unknown_origin_is_not_allowed(client):
    res = preflight(client, "https://evil.example")
    assert "access-control-allow-origin" not in res.headers
