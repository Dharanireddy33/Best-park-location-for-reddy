import joblib

# Load trained model
model = joblib.load('models/park_model.pkl')

# New sample: [Population, PopulationDensity, ExistingParks, OpenLand, RoadAccess, Schools, GreenCover]
new_data = [[70000, 16000, 1, 12, 9, 5, 16]]

result = model.predict(new_data)

# Map numeric prediction to readable label
label = 'Suitable' if int(result[0]) == 1 else 'Not Suitable'
print(label)
