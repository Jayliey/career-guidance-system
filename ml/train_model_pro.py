import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
import joblib

# Load dataset
df = pd.read_csv("career_dataset_large.csv")

# Parse skills with proficiency
def parse_skills_prof(skills_str):
    skill_dict = {}
    for item in skills_str.split(';'):
        if ':' in item:
            s, p = item.split(':')
            skill_dict[s] = int(p)
    return skill_dict

all_skills = set()
for s in df['skills']:
    all_skills.update(parse_skills_prof(s).keys())
all_skills = sorted(all_skills)

# Create feature matrix: each skill as a column with proficiency (0 if not present)
skill_features = []
for idx, row in df.iterrows():
    skill_dict = parse_skills_prof(row['skills'])
    vec = [skill_dict.get(s, 0) for s in all_skills]
    skill_features.append(vec)
skill_matrix = np.array(skill_features)

# Interests (binary)
mlb_interests = MultiLabelBinarizer()
interests_matrix = mlb_interests.fit_transform(df['interests'].str.split(';'))

# Education (one-hot)
ohe_edu = OneHotEncoder(sparse_output=False)
education_matrix = ohe_edu.fit_transform(df[['education']])

# Career stage (one-hot)
ohe_stage = OneHotEncoder(sparse_output=False)
stage_matrix = ohe_stage.fit_transform(df[['career_stage']])

# Combine all features
X = np.hstack([skill_matrix, interests_matrix, education_matrix, stage_matrix])
y = df['target_career']

print(f"Feature shape: {X.shape}")
print(f"Number of classes: {len(np.unique(y))}")

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Random Forest with tuned parameters
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)
rf.fit(X_train, y_train)

# Evaluate
train_acc = rf.score(X_train, y_train)
test_acc = rf.score(X_test, y_test)
cv_scores = cross_val_score(rf, X, y, cv=5)

print(f"Train accuracy: {train_acc:.3f}")
print(f"Test accuracy: {test_acc:.3f}")
print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

# Also compute average confidence (probability) on correct predictions
y_pred_proba = rf.predict_proba(X_test)
correct_indices = rf.predict(X_test) == y_test
conf_correct = np.max(y_pred_proba[correct_indices], axis=1)
print(f"Average confidence on correct predictions: {np.mean(conf_correct)*100:.1f}%")

# Save model and transformers
joblib.dump(rf, "career_model_pro.pkl")
joblib.dump(mlb_interests, "mlb_interests_pro.pkl")
joblib.dump(ohe_edu, "ohe_education_pro.pkl")
joblib.dump(ohe_stage, "ohe_stage_pro.pkl")
joblib.dump(all_skills, "all_skills_list.pkl")

print("Model and encoders saved successfully.")