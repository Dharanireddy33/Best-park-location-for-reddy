import joblib, os, sys, json
root = os.path.join(os.path.dirname(__file__), '..')
model_path = os.path.join(root, 'models', 'park_model.pkl')
model = joblib.load(model_path)

if len(sys.argv) < 2:
    print('Usage: python predict.py "[feature1, feature2, ...]"')
    sys.exit(1)

features = json.loads(sys.argv[1])
print(model.predict([features])[0])
