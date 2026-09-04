import os
import joblib

root = os.path.dirname(__file__)
model_path = os.path.join(root, 'models', 'park_model.pkl')

# Load existing model (this assumes a model was previously saved)
model = joblib.load(model_path)
# Re-save the model to ensure it's persisted
joblib.dump(model, model_path)
print(f'Model saved to: {model_path}')
