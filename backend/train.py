import os
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier

root = os.path.join(os.path.dirname(__file__), '..')
df_path = os.path.join(root, 'dataset', 'parks.csv')
models_dir = os.path.join(root, 'models')

os.makedirs(models_dir, exist_ok=True)

try:
    df = pd.read_csv(df_path)
except Exception as e:
    print('Could not read dataset:', e)
    df = pd.DataFrame({
        'Population': [50000, 80000, 30000, 20000],
        'ExistingParks': [1, 2, 0, 3],
        'LandArea': [10000, 6000, 8000, 4000],
        'AQI': [55, 72, 40, 60],
        'GreenCover': [15, 22, 10, 18],
        'Schools': [4, 6, 3, 2],
        'Hospitals': [1, 2, 1, 1],
        'Roads': [7, 8, 5, 6],
        'Suitability': [1, 1, 0, 0],
    })

# Generate synthetic Phase 9 features from available legacy data
if 'Population' in df.columns and 'ExistingParks' in df.columns:
    if 'LandArea' not in df.columns and 'OpenLand' in df.columns:
        df['LandArea'] = df['OpenLand'].fillna(0) * 1000
    if 'AQI' not in df.columns:
        df['AQI'] = (80 - df['GreenCover'].fillna(0) * 1.5 + df['PopulationDensity'].fillna(10000) / 2000).clip(10, 200)
    if 'Hospitals' not in df.columns:
        df['Hospitals'] = ((df['ExistingParks'].fillna(0) < 2).astype(int) + 1)
    if 'Roads' not in df.columns and 'RoadAccess' in df.columns:
        df['Roads'] = df['RoadAccess'].fillna(5)

feature_cols = ['Population', 'ExistingParks', 'LandArea', 'AQI', 'GreenCover', 'Schools', 'Hospitals', 'Roads']
if not all(col in df.columns for col in feature_cols):
    raise RuntimeError(f"Dataset missing one of the required features: {feature_cols}")

X = df[feature_cols].fillna(0)
if 'Suitability' in df.columns:
    y = df['Suitability'].astype(int)
else:
    y = (df['Population'] > df['Population'].median()).astype(int)

try:
    from xgboost import XGBClassifier
    model = XGBClassifier(n_estimators=50, use_label_encoder=False, eval_metric='logloss', random_state=42)
    print('Training using XGBoost')
except ImportError:
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    print('Training using RandomForest')

model.fit(X, y)
joblib.dump(model, os.path.join(models_dir, 'park_model.pkl'))
print('Model trained and saved to models/park_model.pkl')
