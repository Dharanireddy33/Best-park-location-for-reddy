# Park Location Prediction

This repository implements a park location prediction application with user authentication.

Structure:
- dataset/: sample CSV data
- backend/: FastAPI backend with JWT authentication and PostgreSQL/SQLite support
- frontend/: React app with login, registration, forgot password, and dashboard pages
- models/: trained model file (pickle)

## Features
- Register
- Login
- Forgot password
- User dashboard
- Park location prediction
- Search cities and neighborhoods using OpenStreetMap / Nominatim
- Interactive OpenStreetMap map with zoom, click, and boundary drawing
- Select land with polygon, rectangle, and circle tools
- Real-time air pollution data for AQI, PM2.5, PM10, CO, NO2 and O3
- Automatic area calculations in square meters, hectares, and acres
- PDF report generation for selected land, pollution, population, and suitability recommendation

## Technologies
- React
- FastAPI
- JWT authentication
- SQLAlchemy
- PostgreSQL-compatible database (SQLite fallback)
- Leaflet and Leaflet Draw
- Turf.js for area calculation

## Running locally
1. Install backend dependencies:

    python -m pip install -r requirements.txt

2. Start the backend API:

    uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

   Optionally set:

    export DATABASE_URL="postgresql://user:password@localhost:5432/parkdb"
    export OPENWEATHER_API_KEY="your-openweather-api-key"
    export SECRET_KEY="your-secret-key"

   If no `DATABASE_URL` is set, the backend falls back to `sqlite:///./app.db`.

3. Install frontend dependencies and start the React app:

    cd frontend
    npm install
    npm run dev

4. Open the app in your browser at the Vite URL printed in the terminal (usually `http://localhost:5173`).

## API
- `POST /register`
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `GET /dashboard`
- `POST /predict`
- `GET /air-quality?lat={lat}&lon={lon}`
- `POST /report` (returns PDF report)

## Deployment with Docker

A `docker-compose.yml` file is included for local deployment of both the backend and frontend.

1. Create a `.env` file in the project root or export environment variables:

       OPENWEATHER_API_KEY=your-openweather-api-key
       SECRET_KEY=your-secret-key

2. Build and start the app:

       docker compose up --build

3. Open the frontend in your browser at `http://localhost:5173`.

The backend API will be available at `http://localhost:8000`.

Optional environment variables:

- `DATABASE_URL` (default: `sqlite:///./app.db`)
- `OPENWEATHER_API_KEY`
- `SECRET_KEY`
- `FRONTEND_URL` (used by backend CORS)

## Features
- Search locations using OpenStreetMap Nominatim
- Display city, district, coordinates, and map results
- AI-based park suitability prediction with population, land area, air quality, green cover, schools, hospitals, and roads
