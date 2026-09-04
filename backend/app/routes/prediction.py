from fastapi import APIRouter

router = APIRouter(prefix="/api/prediction", tags=["prediction"])


@router.post("")
def predict_location(data: dict):
    return {
        "prediction": "This endpoint will be implemented with real park suitability logic soon.",
        "input": data,
    }
