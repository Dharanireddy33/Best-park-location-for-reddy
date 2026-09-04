import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.locations import router as locations_router
from app.routes.prediction import router as prediction_router

app = FastAPI(
    title="Best Park Location Prediction API",
    version="1.0.0"
)

configured_origins = os.getenv("FRONTEND_URL", "")
origins = [
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
]
origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(locations_router)
app.include_router(prediction_router)

@app.get("/")
def home():
    return {
        "message": "Best Park Location Prediction API is running"
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }
