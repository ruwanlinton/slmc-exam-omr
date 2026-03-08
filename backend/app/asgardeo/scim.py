"""
Asgardeo SCIM 2.0 client.

Uses a machine-to-machine (client_credentials) app with scopes:
  internal_user_mgt_view
  internal_user_mgt_create
  internal_user_mgt_update
  internal_user_mgt_delete

Configure in .env:
  ASGARDEO_SCIM_CLIENT_ID=...
  ASGARDEO_SCIM_CLIENT_SECRET=...
"""

import time
import httpx
from fastapi import HTTPException
from app.config import get_settings

settings = get_settings()

_token_cache: dict = {}  # {"access_token": str, "expires_at": float}


async def _get_m2m_token() -> str:
    now = time.time()
    if _token_cache.get("access_token") and _token_cache.get("expires_at", 0) > now + 30:
        return _token_cache["access_token"]

    token_url = f"{settings.ASGARDEO_BASE_URL}/oauth2/token"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "scope": (
                    "internal_user_mgt_view internal_user_mgt_create "
                    "internal_user_mgt_update internal_user_mgt_delete"
                ),
            },
            auth=(settings.ASGARDEO_SCIM_CLIENT_ID, settings.ASGARDEO_SCIM_CLIENT_SECRET),
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Asgardeo token error: {resp.text}")

    data = resp.json()
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = now + data.get("expires_in", 3600)
    return _token_cache["access_token"]


def _scim_url(path: str) -> str:
    return f"{settings.ASGARDEO_BASE_URL}/scim2{path}"


async def list_users(start_index: int = 1, count: int = 100) -> dict:
    token = await _get_m2m_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            _scim_url("/Users"),
            params={"startIndex": start_index, "count": count},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


async def get_user(user_id: str) -> dict:
    token = await _get_m2m_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            _scim_url(f"/Users/{user_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


async def create_user(given_name: str, family_name: str, email: str) -> dict:
    token = await _get_m2m_token()
    payload = {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "name": {"givenName": given_name, "familyName": family_name},
        "userName": f"DEFAULT/{email}",
        "emails": [{"value": email, "primary": True}],
        "urn:scim:wso2:schema": {"askPassword": "true"},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _scim_url("/Users"),
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/scim+json",
            },
            timeout=10,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


async def update_user(user_id: str, given_name: str, family_name: str) -> dict:
    token = await _get_m2m_token()
    payload = {
        "schemas": ["urn:ietf:params:scim:api.messages.2.0:PatchOp"],
        "Operations": [
            {
                "op": "replace",
                "value": {
                    "name": {"givenName": given_name, "familyName": family_name},
                },
            }
        ],
    }
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            _scim_url(f"/Users/{user_id}"),
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/scim+json",
            },
            timeout=10,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json() if resp.content else {}


async def delete_user(user_id: str) -> None:
    token = await _get_m2m_token()
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            _scim_url(f"/Users/{user_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
