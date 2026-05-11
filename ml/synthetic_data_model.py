# synthetic_data_model.py
import pandas as pd
import numpy as np
import random
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

# =====================================================
# 1. Define the careers and their required skills
#    (same as in your actual system)
# =====================================================
careers = {
    "Data Analyst": {
        "required_skills": {"excel": (2,5), "sql": (2,5), "python": (3,5), "statistics": (2,5)},
        "interest_weights": {"technology": 0.7, "business": 0.2, "science": 0.1}
    },
    "Software Engineer": {
        "required_skills": {"javascript": (3,5), "react": (3,5), "node": (2,5), "problem solving": (3,5)},
        "interest_weights": {"technology": 0.8, "business": 0.1, "design": 0.1}
    },
    "Cybersecurity Analyst": {
        "required_skills": {"networking": (3,5), "security": (3,5), "linux": (2,5), "problem solving": (3,5)},
        "interest_weights": {"technology": 0.9, "science": 0.1}
    },
    "Business Analyst": {
        "required_skills": {"communication": (3,5), "excel": (3,5), "analysis": (3,5), "business": (3,5)},
        "interest_weights": {"business": 0.8, "technology": 0.2}
    },
    "UI/UX Designer": {
        "required_skills": {"design": (3,5), "creativity": (3,5), "figma": (2,5), "user research": (2,5)},
        "interest_weights": {"design": 0.7, "technology": 0.3}
    }
}

# Additional skills that may appear (for noise)
all_skills = [
    'excel', 'sql', 'python', 'statistics',
    'javascript', 'react', 'node', 'problem solving',
    'networking', 'security', 'linux',
    'communication', 'analysis', 'business',
    'design', 'creativity', 'figma', 'user research'
]

# Possible interests (from your DB)
interests_list = ["technology", "business", "science", "design", "healthcare", "education", "finance", "creative arts", "engineering"]

# Career stages
career_stages = ["student", "recent_graduate", "career_switcher"]

# =====================================================
# 2. Helper functions to generate a single synthetic user
# =====================================================
def generate_skill_proficiency(skill, career):
    """Generate proficiency 1-5 based on whether the skill is required."""
    if career in careers and skill in careers[career]["required_skills"]:
        low, high = careers[career]["required_skills"][skill]
        base = random.randint(low, high)
        if random.random() < 0.1:
            base = max(1, min(5, base + random.randint(-2, 2)))
        return base
    else:
        # non-required skills: low proficiency with small chance of being higher (noise)
        if random.random() < 0.2:
            return random.randint(1, 3)
        else:
            return random.randint(0, 2)   # 0 means no knowledge

def generate_interests(career):
    """Generate a set of 1-3 interests, weighted by the career's interest distribution."""
    interest_weights = careers[career]["interest_weights"]
    candidates = list(interest_weights.keys())
    weights = [interest_weights[i] for i in candidates]
    num_interests = random.choices([1,2,3], weights=[0.5,0.3,0.2])[0]
    chosen = set()
    first = random.choices(candidates, weights=weights)[0]
    chosen.add(first)
    while len(chosen) < num_interests:
        other = random.choice(interests_list)
        chosen.add(other)
    return list(chosen)

def generate_career_stage():
    return random.choices(career_stages, weights=[0.5, 0.3, 0.2])[0]

def generate_row():
    # pick a random career as the target label
    target_career = random.choice(list(careers.keys()))
    # generate skills (all skills as separate columns)
    row = {}
    for skill in all_skills:
        row[f"skill_{skill.replace(' ', '_')}"] = generate_skill_proficiency(skill, target_career)
    # generate multiple interests (binary columns)
    selected_interests = generate_interests(target_career)
    for interest in interests_list:
        row[f"interest_{interest}"] = 1 if interest in selected_interests else 0
    # career stage (we will one-hot encode later, but for now keep as categorical)
    row["career_stage"] = generate_career_stage()
    row["target_career"] = target_career
    return row

# =====================================================
# 3. Generate dataset (600 rows)
# =====================================================
np.random.seed(42)
random.seed(42)

rows = [generate_row() for _ in range(600)]
df = pd.DataFrame(rows)

# One-hot encode career_stage
df = pd.concat([df, pd.get_dummies(df['career_stage'], prefix='stage')], axis=1)
df.drop('career_stage', axis=1, inplace=True)

# Prepare features (X) and labels (y)
feature_cols = [col for col in df.columns if col != 'target_career']
X = df[feature_cols]
y = df['target_career']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Random Forest
rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

# Evaluate
y_pred = rf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy:.4f}")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# Save model and feature columns
joblib.dump(rf, "career_predictor.joblib")
joblib.dump(feature_cols, "feature_columns.joblib")
print("\nModel saved as 'career_predictor.joblib'")
print("Feature columns saved as 'feature_columns.joblib'")