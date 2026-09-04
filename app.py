from flask import Flask,request,jsonify
from flask_cors import CORS
import joblib

app=Flask(__name__)
CORS(app)

# Load the trained model from the models directory
model=joblib.load("models/park_model.pkl")

@app.route("/predict",methods=["POST"])
def predict():

    data=request.json

    values=[[
        data["Population"],
        data["PopulationDensity"],
        data["ExistingParks"],
        data["OpenLand"],
        data["RoadAccess"],
        data["Schools"],
        data["GreenCover"]
    ]]

    prediction=model.predict(values)

    return jsonify({"Prediction":int(prediction[0])})

if __name__=="__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
