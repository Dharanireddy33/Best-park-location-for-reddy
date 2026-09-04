import joblib, os

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'park_model.pkl')

def load_model():
    return joblib.load(MODEL_PATH)
