import pandas as pd
import random
import numpy as np

# ---- Define careers and their typical skills (with importance) ----
careers = {
    "Data Scientist": {
        "skills": {"Python": 5, "SQL": 4, "Statistics": 5, "Machine Learning": 5, "Data Visualization": 4},
        "interests": ["Technology", "Science"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Software Engineer": {
        "skills": {"Python": 4, "Java": 5, "JavaScript": 4, "React": 4, "SQL": 3},
        "interests": ["Technology", "Engineering"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Data Analyst": {
        "skills": {"Python": 3, "SQL": 5, "Excel": 5, "Statistics": 4, "Data Visualization": 4},
        "interests": ["Technology", "Business"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Business Analyst": {
        "skills": {"Excel": 5, "SQL": 4, "Communication": 4, "Business Analysis": 5, "Project Management": 3},
        "interests": ["Business", "Technology"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "UX Designer": {
        "skills": {"UI/UX": 5, "Figma": 5, "User Research": 4, "Typography": 3, "Communication": 4},
        "interests": ["Design", "Technology"],
        "education": ["Bachelor's Degree", "Diploma"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Cybersecurity Analyst": {
        "skills": {"Cybersecurity": 5, "Linux": 4, "Python": 3, "Network Security": 5, "Problem Solving": 4},
        "interests": ["Technology", "Security"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Project Manager": {
        "skills": {"Project Management": 5, "Communication": 5, "Leadership": 4, "Agile": 4, "Risk Management": 3},
        "interests": ["Business", "Management"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["professional", "career switcher"]
    },
    "Graphic Designer": {
        "skills": {"Graphic Design": 5, "Adobe Creative Suite": 5, "Typography": 4, "Creativity": 5, "Communication": 3},
        "interests": ["Design", "Arts"],
        "education": ["Diploma", "Bachelor's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Financial Analyst": {
        "skills": {"Excel": 5, "Accounting": 4, "Financial Analysis": 5, "Statistics": 4, "Communication": 3},
        "interests": ["Finance", "Business"],
        "education": ["Bachelor's Degree", "Master's Degree"],
        "stages": ["student", "recent graduate", "professional"]
    },
    "Marketing Specialist": {
        "skills": {"Digital Marketing": 5, "SEO": 4, "Social Media Strategy": 4, "Communication": 5, "Analytics": 3},
        "interests": ["Marketing", "Business"],
        "education": ["Bachelor's Degree", "Diploma"],
        "stages": ["student", "recent graduate", "professional"]
    }
}

# ---- All possible skills (for feature columns) ----
all_skills = set()
for career in careers.values():
    all_skills.update(career["skills"].keys())
all_skills = sorted(all_skills)

# ---- Generate rows ----
rows = []
for _ in range(1000):  # 1000 rows
    career_name = random.choice(list(careers.keys()))
    career = careers[career_name]
    
    # Build skills with proficiency
    skill_dict = {}
    for skill in all_skills:
        if skill in career["skills"]:
            # proficiency around the typical value ±1 (clamped 1-5)
            base = career["skills"][skill]
            proficiency = min(5, max(1, base + random.randint(-1, 1)))
            skill_dict[skill] = proficiency
        else:
            # 20% chance to have an unrelated skill at low proficiency
            if random.random() < 0.2:
                skill_dict[skill] = random.randint(1, 2)
            else:
                skill_dict[skill] = 0
    
    skills_str = ";".join([f"{s}:{v}" for s, v in skill_dict.items() if v > 0])
    
    # Interests – include the career's primary interests plus occasionally an extra
    interests = career["interests"].copy()
    if random.random() < 0.3:
        extra = random.choice(["Science", "Business", "Technology", "Design", "Healthcare", "Education", "Finance", "Marketing", "Engineering"])
        if extra not in interests:
            interests.append(extra)
    interests_str = ";".join(interests)
    
    education = random.choice(career["education"])
    career_stage = random.choice(career["stages"])
    
    rows.append({
        "skills": skills_str,
        "interests": interests_str,
        "education": education,
        "career_stage": career_stage,
        "target_career": career_name
    })

df = pd.DataFrame(rows)
df.to_csv("career_dataset_large.csv", index=False)
print(f"Generated {len(df)} rows and saved to career_dataset_large.csv")
print(f"Unique careers: {df['target_career'].nunique()}")