from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
from typing import List

app = FastAPI()

# Load model and encoders
model = joblib.load("career_model.pkl")
mlb_skills = joblib.load("mlb_skills.pkl")
mlb_interests = joblib.load("mlb_interests.pkl")
ohe_edu = joblib.load("ohe_education.pkl")

class Profile(BaseModel):
    skills: List[str]
    interests: List[str]
    education: str

@app.post("/predict")
def predict(profile: Profile):
    try:
        # Transform input
        skills_vec = mlb_skills.transform([profile.skills])
        interests_vec = mlb_interests.transform([profile.interests])
        edu_vec = ohe_edu.transform([[profile.education]])
        X_input = np.hstack([skills_vec, interests_vec, edu_vec])

        # Predict
        pred_class = model.predict(X_input)[0]
        probs = model.predict_proba(X_input)[0]
        confidence = float(np.max(probs) * 100)

        # Top 3 predictions
        top_indices = np.argsort(probs)[-3:][::-1]
        top_predictions = [
            {"career": model.classes_[i], "confidence": round(probs[i] * 100, 2)}
            for i in top_indices
        ]

        return {
            "predicted_career": pred_class,
            "confidence": round(confidence, 2),
            "top_predictions": top_predictions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)