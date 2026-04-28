type Profile = {
  interest: string;
  skills: string[];
};

type Career = {
  name: string;
  requiredSkills: string[];
  interest: string;
  description: string;
};

const careers: Career[] = [
  {
    name: "Data Analyst",
    requiredSkills: ["excel", "sql", "python", "statistics"],
    interest: "technology",
    description: "Works with data to find insights and patterns."
  },
  {
    name: "Software Engineer",
    requiredSkills: ["javascript", "react", "node", "problem solving"],
    interest: "technology",
    description: "Builds software systems and applications."
  },
  {
    name: "Cybersecurity Analyst",
    requiredSkills: ["networking", "security", "linux", "problem solving"],
    interest: "technology",
    description: "Protects systems from cyber threats."
  },
  {
    name: "Business Analyst",
    requiredSkills: ["communication", "excel", "analysis", "business"],
    interest: "business",
    description: "Analyzes business needs and improves processes."
  },
  {
    name: "UI/UX Designer",
    requiredSkills: ["design", "creativity", "figma", "user research"],
    interest: "technology",
    description: "Designs user-friendly digital experiences."
  }
];

function normalize(text: string) {
  return text.toLowerCase().trim();
}

export function getCareerMatches(profile: Profile) {
  const userSkills = profile.skills.map(normalize);
  const userInterest = normalize(profile.interest);

  const results = careers.map((career) => {
    const required = career.requiredSkills.map(normalize);

    const matchedSkills = required.filter((skill) =>
      userSkills.includes(skill)
    );

    const missingSkills = required.filter(
      (skill) => !userSkills.includes(skill)
    );

    // ✅ FIX 1: prevent division by zero
    const skillScore =
      required.length === 0
        ? 0
        : (matchedSkills.length / required.length) * 70;

    // ✅ FIX 2: stricter interest matching
    const interestScore =
      normalize(career.interest) === userInterest ? 30 : 0;

    const score = Math.round(skillScore + interestScore);

    const completion = Math.round(
      required.length === 0
        ? 0
        : (matchedSkills.length / required.length) * 100
    );

    // 🧠 AI REASONING (unchanged logic, safe)
    let reasoning = "";
    if (matchedSkills.length === required.length && required.length > 0) {
      reasoning = "Excellent match — you already have all required skills.";
    } else if (matchedSkills.length >= 2) {
      reasoning = `Good match — you have ${matchedSkills.length}/${required.length} key skills.`;
    } else {
      reasoning = `Low match — only ${matchedSkills.length}/${required.length} skills found.`;
    }

    return {
      name: career.name,
      score,
      description: career.description,
      matchedSkills,
      missingSkills,
      completion,
      reasoning
    };
  });

  return results.sort((a, b) => b.score - a.score);
}