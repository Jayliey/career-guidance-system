from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
from typing import List

app = FastAPI()

# Load the PRO model and encoders (trained on the 1000-row dataset)
model = joblib.load("career_model_pro.pkl")
mlb_interests = joblib.load("mlb_interests_pro.pkl")
ohe_edu = joblib.load("ohe_education_pro.pkl")
ohe_stage = joblib.load("ohe_stage_pro.pkl")
all_skills = joblib.load("all_skills_list.pkl")  # list of all skills in training

# Convert all skills to lowercase for consistent matching
all_skills_lower = [s.lower().strip() for s in all_skills]

class Profile(BaseModel):
    skills: List[str]
    interests: List[str]
    education: str
    career_stage: str = "student"   # default if not provided

@app.post("/predict")
def predict(profile: Profile):
    try:
        # 1. Normalise inputs to lowercase
        skills_lower = [s.lower().strip() for s in profile.skills]
        interests_lower = [i.lower().strip() for i in profile.interests]
        
        # 2. Build skill vector: proficiency 3 if skill present, else 0
        skill_vec = [3 if skill in skills_lower else 0 for skill in all_skills_lower]
        skill_matrix = np.array([skill_vec])
        
        # 3. Transform interests, education, career_stage
        interests_matrix = mlb_interests.transform([interests_lower])
        edu_matrix = ohe_edu.transform([[profile.education]])
        stage_matrix = ohe_stage.transform([[profile.career_stage]])
        
        # 4. Combine features
        X_input = np.hstack([skill_matrix, interests_matrix, edu_matrix, stage_matrix])
        
        # 5. Predict
        pred_class = model.predict(X_input)[0]
        probs = model.predict_proba(X_input)[0]
        confidence = float(np.max(probs) * 100)
        
        # 6. Top 3 predictions
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