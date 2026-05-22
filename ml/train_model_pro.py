import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, ConfusionMatrixDisplay
)
import matplotlib.pyplot as plt
import joblib

# ========== 1. LOAD DATASET ==========
df = pd.read_csv("career_dataset_large.csv")

# ========== 2. PARSE SKILLS WITH PROFICIENCY ==========
def parse_skills_prof(skills_str):
    skill_dict = {}
    for item in skills_str.split(';'):
        if ':' in item:
            s, p = item.split(':')
            skill_dict[s] = int(p)
    return skill_dict

# Collect all unique skills
all_skills = set()
for s in df['skills']:
    all_skills.update(parse_skills_prof(s).keys())
all_skills = sorted(all_skills)

# Create skill feature matrix (proficiency as value, 0 if skill absent)
skill_features = []
for _, row in df.iterrows():
    skill_dict = parse_skills_prof(row['skills'])
    vec = [skill_dict.get(s, 0) for s in all_skills]
    skill_features.append(vec)
skill_matrix = np.array(skill_features)

# ========== 3. INTERESTS (binary) ==========
mlb_interests = MultiLabelBinarizer()
interests_matrix = mlb_interests.fit_transform(df['interests'].str.split(';'))

# ========== 4. EDUCATION (one-hot) ==========
ohe_edu = OneHotEncoder(sparse_output=False)
education_matrix = ohe_edu.fit_transform(df[['education']])

# ========== 5. CAREER STAGE (one-hot) ==========
ohe_stage = OneHotEncoder(sparse_output=False)
stage_matrix = ohe_stage.fit_transform(df[['career_stage']])

# ========== 6. COMBINE FEATURES ==========
X = np.hstack([skill_matrix, interests_matrix, education_matrix, stage_matrix])
y = df['target_career']

print(f"Feature shape: {X.shape}")
print(f"Number of classes: {len(np.unique(y))}")

# ========== 7. TRAIN/TEST SPLIT ==========
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ========== 8. RANDOM FOREST MODEL ==========
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)
rf.fit(X_train, y_train)

# ========== 9. EVALUATION METRICS ==========
y_pred = rf.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, average='macro')
recall = recall_score(y_test, y_pred, average='macro')
f1 = f1_score(y_test, y_pred, average='macro')

train_acc = rf.score(X_train, y_train)
test_acc = rf.score(X_test, y_test)
cv_scores = cross_val_score(rf, X, y, cv=5)

print("\n" + "="*40)
print("MODEL PERFORMANCE")
print("="*40)
print(f"Train accuracy: {train_acc:.3f}")
print(f"Test accuracy: {test_acc:.3f}")
print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
print(f"Accuracy (macro): {accuracy:.3f}")
print(f"Precision (macro): {precision:.3f}")
print(f"Recall (macro): {recall:.3f}")
print(f"F1-Score (macro): {f1:.3f}")

# Average confidence on correct predictions
y_pred_proba = rf.predict_proba(X_test)
correct_indices = (y_pred == y_test)
conf_correct = np.max(y_pred_proba[correct_indices], axis=1)
print(f"Average confidence on correct predictions: {np.mean(conf_correct)*100:.1f}%")
print("="*40)

# ========== 10. CONFUSION MATRIX PLOT ==========
cm = confusion_matrix(y_test, y_pred)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=rf.classes_)
fig, ax = plt.subplots(figsize=(12, 10))
disp.plot(cmap='Blues', xticks_rotation=45, ax=ax)
plt.title('Confusion Matrix - Random Forest Career Prediction')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=300)
plt.show()

# ========== 11. METRICS BAR CHART ==========
metrics_names = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
metrics_values = [accuracy, precision, recall, f1]
plt.figure(figsize=(6, 5))
bars = plt.bar(metrics_names, metrics_values, color=['#4f8cff', '#a855f7', '#ff8c00', '#4caf50'])
plt.ylim(0, 1)
plt.ylabel('Score')
plt.title('Random Forest Performance Metrics')
for bar, val in zip(bars, metrics_values):
    plt.text(bar.get_x() + bar.get_width()/2, val + 0.02, f"{val:.3f}", ha='center')
plt.savefig('metrics_bar.png', dpi=300)
plt.show()

# ========== 12. SAVE MODEL AND ENCODERS ==========
joblib.dump(rf, "career_model_pro.pkl")
joblib.dump(mlb_interests, "mlb_interests_pro.pkl")
joblib.dump(ohe_edu, "ohe_education_pro.pkl")
joblib.dump(ohe_stage, "ohe_stage_pro.pkl")
joblib.dump(all_skills, "all_skills_list.pkl")

print("\nModel and encoders saved successfully.")