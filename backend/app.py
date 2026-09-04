import io
import json
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models, schemas, security
from .database import SessionLocal, engine
from .model import load_model

models.Base.metadata.create_all(bind=engine)

configured_origins = os.getenv("FRONTEND_URL", "")
origins = [
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
]
origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])

app = FastAPI(title="Park Location Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

model = None
try:
    model = load_model()
except Exception:
    model = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def build_report_pdf(report: schemas.ReportRequest) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font('Arial', 'B', 16)
    pdf.cell(0, 10, 'Park Suitability Report', ln=True, align='C')
    pdf.set_font('Arial', '', 11)
    pdf.ln(6)

    def add_line(label: str, value: str):
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(50, 8, f'{label}:', ln=False)
        pdf.set_font('Arial', '', 11)
        pdf.multi_cell(0, 8, str(value))

    add_line('Generated', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))
    add_line('Location', report.location_name or 'Unknown')
    add_line('Selected Area', report.selected_area_description or 'Detailed area summary below')
    add_line('Area (m²)', f'{report.area_sqm:.2f}' if report.area_sqm is not None else 'N/A')
    add_line('Area (ha)', f'{report.area_hectares:.4f}' if report.area_hectares is not None else 'N/A')
    add_line('Area (acres)', f'{report.area_acres:.4f}' if report.area_acres is not None else 'N/A')
    add_line('Population', f'{int(report.population)}' if report.population is not None else 'N/A')
    add_line('Suitability Score', f'{report.suitability_score:.2f}' if report.suitability_score is not None else 'N/A')
    add_line('Recommendation', report.recommendation or 'N/A')
    add_line('Air Quality Index', f'{report.aqi}' if report.aqi is not None else 'N/A')
    add_line('Air Quality Category', report.air_quality_category or 'N/A')
    add_line('PM2.5', f'{report.pm2_5:.2f}' if report.pm2_5 is not None else 'N/A')
    add_line('PM10', f'{report.pm10:.2f}' if report.pm10 is not None else 'N/A')
    add_line('CO', f'{report.co:.2f}' if report.co is not None else 'N/A')
    add_line('NO2', f'{report.no2:.2f}' if report.no2 is not None else 'N/A')
    add_line('O3', f'{report.o3:.2f}' if report.o3 is not None else 'N/A')

    pdf_content = pdf.output(dest='S').encode('latin-1')
    return pdf_content


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = security.decode_access_token(token)
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise credentials_exception
    return user


@app.get("/")
def health_check():
    return {"message": "Park Location Prediction API is running"}


@app.post("/register", response_model=schemas.Token)
def register(user_create: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_create.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_password = security.get_password_hash(user_create.password)
    new_user = models.User(
        full_name=user_create.full_name,
        email=user_create.email.lower(),
        hashed_password=hashed_password,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = security.create_access_token({"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/login", response_model=schemas.Token)
def login(user_login: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_login.email.lower()).first()
    if not user or not security.verify_password(user_login.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = security.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/forgot-password")
def forgot_password(request_data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request_data.email.lower()).first()
    if not user:
        return {
            "message": "If this email is registered, a password reset token has been generated.",
            "reset_token": None,
        }

    reset_token = str(uuid4())
    user.reset_token = reset_token
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.add(user)
    db.commit()

    return {
        "message": "Password reset token generated. Use it to reset the password.",
        "reset_token": reset_token,
    }


@app.post("/reset-password")
def reset_password(request_data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request_data.email.lower()).first()
    if not user or user.reset_token != request_data.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    if not user.reset_token_expires_at or user.reset_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")

    user.hashed_password = security.get_password_hash(request_data.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully"}


@app.get("/dashboard", response_model=schemas.UserProfile)
def dashboard(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.get("/air-quality", response_model=schemas.AirQuality)
def air_quality(lat: float, lon: float):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenWeather API key not configured",
        )

    params = urlencode({"lat": lat, "lon": lon, "appid": api_key})
    url = f"https://api.openweathermap.org/data/2.5/air_pollution?{params}"

    try:
        request = Request(url, headers={"Accept": "application/json"})
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Air quality service error: {exc}",
        )

    if not payload.get("list"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No air quality data available",
        )

    element = payload["list"][0]
    aqi = element.get("main", {}).get("aqi", 0)
    categories = {
        1: "Good",
        2: "Fair",
        3: "Moderate",
        4: "Poor",
        5: "Very Poor",
    }

    components = element.get("components", {})
    return {
        "aqi": aqi,
        "category": categories.get(aqi, "Unknown"),
        "pm2_5": float(components.get("pm2_5", 0.0)),
        "pm10": float(components.get("pm10", 0.0)),
        "co": float(components.get("co", 0.0)),
        "no2": float(components.get("no2", 0.0)),
        "o3": float(components.get("o3", 0.0)),
    }


@app.post("/report")
def generate_report(report_data: schemas.ReportRequest):
    try:
        pdf_bytes = build_report_pdf(report_data)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report generation failed: {exc}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=park-report.pdf"},
    )


@app.post("/predict")
def predict(data: dict):
    if model is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Prediction model not available")

    features = data.get("features")
    new_keys = [
        "Population",
        "ExistingParks",
        "LandArea",
        "AQI",
        "GreenCover",
        "Schools",
        "Hospitals",
        "Roads",
    ]
    legacy_keys = [
        "Population",
        "PopulationDensity",
        "ExistingParks",
        "OpenLand",
        "RoadAccess",
        "Schools",
        "GreenCover",
    ]

    if features is None:
        if all(key in data for key in new_keys):
            try:
                features = [float(data[key]) for key in new_keys]
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid numeric input for prediction features")
        elif all(key in data for key in legacy_keys):
            try:
                population = float(data["Population"])
                existing_parks = float(data["ExistingParks"])
                land_area = float(data["OpenLand"]) * 1000.0
                aqi = float(data.get("AQI", 75.0))
                green_cover = float(data["GreenCover"])
                schools = float(data["Schools"])
                hospitals = float(data.get("Hospitals", 1.0))
                roads = float(data["RoadAccess"])
                features = [population, existing_parks, land_area, aqi, green_cover, schools, hospitals, roads]
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid numeric input for prediction features")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing features in request body")

    try:
        prediction = model.predict([features])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Prediction failed: {exc}")

    positive_prob = None
    if hasattr(model, "predict_proba"):
        try:
            probs = model.predict_proba([features])[0]
            if len(probs) > 1:
                positive_prob = float(probs[1])
            else:
                positive_prob = float(probs[0])
        except Exception:
            positive_prob = None

    if positive_prob is None:
        positive_prob = 1.0 if int(prediction[0]) == 1 else 0.0

    score = int(round(positive_prob * 100))
    recommended = "Recommended" if score >= 60 else "Not Recommended"
    stars = max(1, min(5, int(round(score / 20)) or 1))

    return {
        "prediction": int(prediction[0]),
        "score": score,
        "recommended": recommended,
        "stars": stars,
    }
