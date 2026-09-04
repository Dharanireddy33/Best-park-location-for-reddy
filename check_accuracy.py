import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

root = os.path.dirname(__file__)
data_path = os.path.join(root, 'dataset', 'parks.csv')
model_path = os.path.join(root, 'models', 'park_model.pkl')

# Load data and model
data = pd.read_csv(data_path)
X = data.drop('Suitability', axis=1)
if 'Area' in X.columns:
    X = X.drop('Area', axis=1)
y = data['Suitability']

# Same split as training
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = joblib.load(model_path)

prediction = model.predict(X_test)

print('y_test:', list(y_test))
print('prediction:', list(prediction))
print('Accuracy:', accuracy_score(y_test, prediction))
