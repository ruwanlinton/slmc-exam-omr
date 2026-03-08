from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from app.auth.jwt import get_current_user
from app.db.models import User
from app.asgardeo import scim

router = APIRouter()


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class AsgardeoUser(BaseModel):
    id: str
    userName: str
    givenName: str
    familyName: str
    email: str


class CreateUserBody(BaseModel):
    given_name: str
    family_name: str
    email: EmailStr


class UpdateUserBody(BaseModel):
    given_name: str
    family_name: str


def _parse_user(raw: dict) -> AsgardeoUser:
    name = raw.get("name", {})
    emails = raw.get("emails", [])
    email = emails[0].get("value", "") if emails else ""
    username = raw.get("userName", "").removeprefix("DEFAULT/")
    return AsgardeoUser(
        id=raw["id"],
        userName=username,
        givenName=name.get("givenName", ""),
        familyName=name.get("familyName", ""),
        email=email or username,
    )


@router.get("/admin/users", response_model=list[AsgardeoUser])
async def list_users(_: User = Depends(_require_admin)):
    data = await scim.list_users()
    resources = data.get("Resources", [])
    return [_parse_user(r) for r in resources]


@router.post("/admin/users", response_model=AsgardeoUser, status_code=201)
async def create_user(body: CreateUserBody, _: User = Depends(_require_admin)):
    raw = await scim.create_user(body.given_name, body.family_name, body.email)
    return _parse_user(raw)


@router.patch("/admin/users/{user_id}", response_model=AsgardeoUser)
async def update_user(user_id: str, body: UpdateUserBody, _: User = Depends(_require_admin)):
    await scim.update_user(user_id, body.given_name, body.family_name)
    raw = await scim.get_user(user_id)
    return _parse_user(raw)


@router.delete("/admin/users/{user_id}", status_code=204)
async def delete_user(user_id: str, _: User = Depends(_require_admin)):
    await scim.delete_user(user_id)
