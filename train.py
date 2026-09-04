import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Paths
root = os.path.dirname(__file__)
data_path = os.path.join(root, 'dataset', 'parks.csv')
models_dir = os.path.join(root, 'models')
model_path = os.path.join(models_dir, 'park_model.pkl')

# Load dataset
data = pd.read_csv(data_path)

# Prepare features X and target y
X = data.drop('Suitability', axis=1)
if 'Area' in X.columns:
    X = X.drop('Area', axis=1)

y = data['Suitability']

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# Evaluate
if len(X_test) > 0:
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f'Accuracy on test set: {acc:.4f}')
    print('Classification report:\n', classification_report(y_test, preds))
else:
    print('No test samples to evaluate.')

# Save model
os.makedirs(models_dir, exist_ok=True)
joblib.dump(model, model_path)
print(f'Model saved to: {model_path}')
