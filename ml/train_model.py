import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
import joblib

# Load dataset
df = pd.read_csv("custom_career_dataset.csv")

# Parse skills: format "skill:proficiency;skill:proficiency"
def parse_skills(skills_str):
    skills_list = []
    for item in skills_str.split(';'):
        if ':' in item:
            skill, prof = item.split(':')
            skills_list.append(skill.strip())
    return skills_list

# Parse interests: semicolon-separated
def parse_interests(interests_str):
    return [i.strip() for i in interests_str.split(';')]

df['skills_list'] = df['skills'].apply(parse_skills)
df['interests_list'] = df['interests'].apply(parse_interests)

# MultiLabelBinarizer for skills (binary presence – proficiency is not used here for simplicity)
mlb_skills = MultiLabelBinarizer()
skills_encoded = mlb_skills.fit_transform(df['skills_list'])

# MultiLabelBinarizer for interests
mlb_interests = MultiLabelBinarizer()
interests_encoded = mlb_interests.fit_transform(df['interests_list'])

# One-hot encode education
ohe_edu = OneHotEncoder(sparse_output=False)
education_encoded = ohe_edu.fit_transform(df[['education']])

# Combine features
X = np.hstack([skills_encoded, interests_encoded, education_encoded])
y = df['target_career']

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Random Forest (limit depth to avoid overfitting on small dataset)
rf = RandomForestClassifier(n_estimators=100, max_depth=8, min_samples_split=5, random_state=42)
rf.fit(X_train, y_train)

# Evaluate
train_acc = rf.score(X_train, y_train)
test_acc = rf.score(X_test, y_test)
cv_scores = cross_val_score(rf, X, y, cv=5)

print(f"Train accuracy: {train_acc:.3f}")
print(f"Test accuracy: {test_acc:.3f}")
print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

# Save model and encoders
joblib.dump(rf, "career_model.pkl")
joblib.dump(mlb_skills, "mlb_skills.pkl")
joblib.dump(mlb_interests, "mlb_interests.pkl")
joblib.dump(ohe_edu, "ohe_education.pkl")

print("Model and encoders saved successfully.")