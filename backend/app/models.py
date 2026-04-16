from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# Auth Models
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    invite_code: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    is_admin: bool


# Event Models
class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: str
    country: str = "colombia"
    date: str
    time: str
    image_url: Optional[str] = None
    stream_url: Optional[str] = None


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    stream_url: Optional[str] = None


# Player Models
class PlayerCreate(BaseModel):
    name: str
    nickname: Optional[str] = None
    team: Optional[str] = None
    photo_url: Optional[str] = None


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    team: Optional[str] = None
    photo_url: Optional[str] = None
    stats_wins: Optional[int] = None
    stats_losses: Optional[int] = None
    rating: Optional[float] = None


# Event-Player Association
class EventPlayerAdd(BaseModel):
    player_id: int
    position: Optional[int] = None
    odds: float = 2.0


# Bet Models
class BetCreate(BaseModel):
    event_id: int
    player_id: int
    amount: float


# Wallet Models
class DepositRequest(BaseModel):
    amount: float
    method: str  # nequi, daviplata, bancolombia
    reference: str


# Admin Models
class InviteCodeCreate(BaseModel):
    count: int = 1


class UserStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


# Withdrawal Models
class WithdrawalRequest(BaseModel):
    amount: float
    method: str  # nequi, daviplata, bancolombia
    account_number: str


class WithdrawalReview(BaseModel):
    status: str  # approved, rejected


# Deposit Review Models
class DepositReview(BaseModel):
    status: str  # approved, rejected


# Profile Models
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# Winner Declaration
class DeclareWinner(BaseModel):
    player_id: int


# Self Exclusion
class SelfExclusion(BaseModel):
    days: int  # number of days to self-exclude
