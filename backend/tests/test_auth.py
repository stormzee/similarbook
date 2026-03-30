import pytest
import pytest_asyncio
from httpx import AsyncClient


async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_register(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "SecurePass1",
            "display_name": "Alice",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "alice"
    assert "id" in data


async def test_register_duplicate(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "bob", "email": "bob@example.com", "password": "SecurePass1"},
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "bob", "email": "bob@example.com", "password": "SecurePass1"},
    )
    assert resp.status_code == 400


async def test_login_and_refresh(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "carol", "email": "carol@example.com", "password": "SecurePass1"},
    )
    resp = await client.post(
        "/api/v1/auth/token",
        data={"username": "carol", "password": "SecurePass1"},
    )
    assert resp.status_code == 200
    tokens = resp.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # Refresh
    resp2 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert resp2.status_code == 200
    new_tokens = resp2.json()
    assert "access_token" in new_tokens


async def test_get_me(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "dave", "email": "dave@example.com", "password": "SecurePass1"},
    )
    token_resp = await client.post(
        "/api/v1/auth/token",
        data={"username": "dave", "password": "SecurePass1"},
    )
    token = token_resp.json()["access_token"]
    resp = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "dave"
