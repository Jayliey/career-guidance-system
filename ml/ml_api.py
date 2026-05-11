from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd

app = FastAPI()

# Load model and feature columns
model = joblib.load("career_predictor.joblib")
feature_columns = joblib.load("feature_columns.joblib")

class UserFeatures(BaseModel):
    # Expect a dictionary with all feature names (skills, interests, career stage)
    features: dict

@app.post("/predict")
def predict(user: UserFeatures):
    # Convert input to DataFrame with correct columns
    input_data = {k: [v] for k, v in user.features.items()}
    df_input = pd.DataFrame(input_data)
    # Ensure all feature columns are present, fill missing with 0
    for col in feature_columns:
        if col not in df_input.columns:
            df_input[col] = 0
    df_input = df_input[feature_columns]
    pred = model.predict(df_input)[0]
    proba = model.predict_proba(df_input)[0].max()
    return {"predicted_career": pred, "confidence": float(proba)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)