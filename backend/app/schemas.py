from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class AirQuality(BaseModel):
    aqi: int
    category: str
    pm2_5: float
    pm10: float
    co: float
    no2: float
    o3: float


class ReportRequest(BaseModel):
    location_name: Optional[str] = None
    area_sqm: Optional[float] = None
    area_hectares: Optional[float] = None
    area_acres: Optional[float] = None
    population: Optional[float] = None
    aqi: Optional[int] = None
    air_quality_category: Optional[str] = None
    pm2_5: Optional[float] = None
    pm10: Optional[float] = None
    co: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None
    suitability_score: Optional[float] = None
    recommendation: Optional[str] = None
    stars: Optional[int] = None
    selected_area_description: Optional[str] = None
