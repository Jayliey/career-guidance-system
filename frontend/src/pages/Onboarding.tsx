import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Skill {
  name: string;
  proficiency: number;
}

function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1 – Motivation
  const [motivation, setMotivation] = useState("");
  const [customMotivation, setCustomMotivation] = useState("");

  // Step 2 – Career Stage
  const [careerStage, setCareerStage] = useState("");

  // Step 3 – Interests (multiple)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const interestOptions = [
    "Technology", "Business", "Science", "Design", "Healthcare",
    "Education", "Finance", "Marketing", "Engineering"
  ];

  // Step 4 – Education
  const [education, setEducation] = useState("");
  const educationOptions = [
    "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"
  ];

  // Step 5 – Skills
  const [skills, setSkills] = useState<Skill[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentProficiency, setCurrentProficiency] = useState(3);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  // Fetch all skills from database for dropdown
  useEffect(() => {
    const fetchSkills = async () => {
      setSkillsLoading(true);
      try {
        const { data, error } = await supabase
          .from("skills")
          .select("name")
          .order("name");
        if (!error && data && data.length > 0) {
          setAllSkills(data.map(s => s.name));
        } else {
          // Fallback: comprehensive list covering all interest areas
          setAllSkills([
            // Technology
            "Python", "JavaScript", "React", "Node.js", "SQL", "TypeScript", "AWS", "Docker", "Kubernetes", "Cybersecurity",
            // Business
            "Project Management", "Business Analysis", "Financial Modeling", "Supply Chain", "CRM", "Data Visualization",
            // Science
            "Research Methods", "Statistics", "Lab Techniques", "Scientific Writing", "R", "MATLAB", "Biostatistics",
            // Design
            "Graphic Design", "UI/UX", "Figma", "Adobe Creative Suite", "Typography", "Wireframing", "Prototyping",
            // Healthcare
            "Patient Care", "Medical Terminology", "Anatomy", "Public Health", "Healthcare Administration", "EMR Systems",
            // Education
            "Curriculum Development", "Classroom Management", "Educational Psychology", "E-Learning", "Instructional Design",
            // Finance
            "Accounting", "Financial Analysis", "Risk Management", "Investment Analysis", "QuickBooks", "SAP",
            // Marketing
            "Digital Marketing", "SEO", "Content Strategy", "Social Media Management", "Google Analytics", "Email Marketing",
            // Engineering
            "AutoCAD", "SolidWorks", "Structural Analysis", "Thermodynamics", "Quality Control", "MATLAB",
            // Soft Skills
            "Communication", "Problem Solving", "Leadership", "Teamwork", "Time Management", "Critical Thinking", "Adaptability"
          ]);
        }
      } catch (err) {
        console.error("Error fetching skills:", err);
        // Ultimate fallback
        setAllSkills(["Python", "JavaScript", "SQL", "Communication", "Project Management", "Data Analysis"]);
      } finally {
        setSkillsLoading(false);
      }
    };
    fetchSkills();
  }, []);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  // Interest handlers
  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) {
      setSelectedInterests([...selectedInterests, trimmed]);
      setCustomInterest("");
    }
  };

  // Skill handlers
  const addSkill = () => {
    const trimmed = currentSkill.trim();
    if (trimmed && !skills.some(s => s.name === trimmed)) {
      setSkills([...skills, { name: trimmed, proficiency: currentProficiency }]);
      setCurrentSkill("");
      setCurrentProficiency(3);
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const finish = async () => {
    if (!careerStage || selectedInterests.length === 0 || !education || skills.length === 0) {
      alert("Please complete all steps: Career Stage, Interests, Education, and at least one Skill.");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        navigate("/login");
        return;
      }

      const finalMotivation = motivation === "other" ? customMotivation : motivation;

      // Save profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          career_stage: careerStage,
          interest: selectedInterests,
          education: education,
          motivation: finalMotivation || null,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Save user_skills
      await supabase.from("user_skills").delete().eq("user_id", user.id);
      const skillsData = skills.map(skill => ({
        user_id: user.id,
        skill_name: skill.name.toLowerCase(),
        proficiency: skill.proficiency,
      }));
      const { error: skillsError } = await supabase.from("user_skills").insert(skillsData);
      if (skillsError) throw skillsError;

      alert("Profile saved successfully!");
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const motivationOptions = [
    { value: "problem solving", label: "💡 Problem solving" },
    { value: "helping people", label: "🤝 Helping people" },
    { value: "working with data", label: "📊 Working with data" },
    { value: "creativity", label: "🎨 Creativity" },
  ];

  const careerStageOptions = [
    "Student", "Recent Graduate", "Career Switcher", "Professional"
  ];

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="progress-steps">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`step-indicator ${step === n ? "active" : ""}`}>{n}</div>
          ))}
        </div>

        <div className="step-content">
          {/* Step 1 – Motivation */}
          {step === 1 && (
            <div>
              <h2>What motivates you most?</h2>
              <p className="subtitle">Choose the motivation that best describes why you want your next career move.</p>
              <div className="motivation-buttons">
                {motivationOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`motivation-option ${motivation === opt.value ? "active" : ""}`}
                    onClick={() => { setMotivation(opt.value); setCustomMotivation(""); }}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`motivation-option ${motivation === "other" ? "active" : ""}`}
                  onClick={() => setMotivation("other")}
                >
                  ✏️ Other
                </button>
              </div>
              {motivation === "other" && (
                <input
                  type="text"
                  placeholder="e.g., Building things, teaching others..."
                  value={customMotivation}
                  onChange={e => setCustomMotivation(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Step 2 – Career Stage */}
          {step === 2 && (
            <div>
              <h2>Tell us who you are</h2>
              <p className="subtitle">Select your current career stage.</p>
              <div className="career-stage-buttons">
                {careerStageOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`career-stage-option ${careerStage === opt ? "active" : ""}`}
                    onClick={() => setCareerStage(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 – Interests */}
          {step === 3 && (
            <div>
              <h2>Select your interest areas</h2>
              <p className="subtitle">Choose all that apply – this helps us find relevant careers.</p>
              <div className="interests-chips-grid">
                {interestOptions.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    className={`interest-chip ${selectedInterests.includes(interest) ? "active" : ""}`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="custom-interest-section" style={{ marginTop: 16 }}>
                <input
                  type="text"
                  placeholder="Or add a custom interest..."
                  value={customInterest}
                  onChange={e => setCustomInterest(e.target.value)}
                />
                <button type="button" onClick={addCustomInterest}>Add</button>
              </div>
              {selectedInterests.length > 0 && (
                <div className="selected-interests">
                  <strong>Selected:</strong> {selectedInterests.join(", ")}
                </div>
              )}
            </div>
          )}

          {/* Step 4 – Education */}
          {step === 4 && (
            <div>
              <h2>What is your highest level of education?</h2>
              <p className="subtitle">This helps us tailor recommendations to your academic background.</p>
              <div className="education-buttons">
                {educationOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`education-option ${education === opt ? "active" : ""}`}
                    onClick={() => setEducation(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 – Skills */}
          {step === 5 && (
            <div>
              <h2>Add your skills</h2>
              <p className="subtitle">Select a skill, set your proficiency, and add it.</p>
              {skillsLoading ? (
                <div className="loading">Loading skills...</div>
              ) : (
                <>
                  <div className="skill-input-group">
                    <select
                      value={currentSkill}
                      onChange={e => setCurrentSkill(e.target.value)}
                      className="skill-select"
                    >
                      <option value="">Select a skill...</option>
                      {allSkills
                        .filter(s => !skills.some(added => added.name === s))
                        .map(skill => (
                          <option key={skill} value={skill}>{skill}</option>
                        ))}
                    </select>
                    <select
                      value={currentProficiency}
                      onChange={e => setCurrentProficiency(Number(e.target.value))}
                      className="proficiency-select"
                    >
                      <option value="1">1 – Beginner</option>
                      <option value="2">2 – Basic</option>
                      <option value="3">3 – Intermediate</option>
                      <option value="4">4 – Advanced</option>
                      <option value="5">5 – Expert</option>
                    </select>
                    <button type="button" onClick={addSkill}>+ Add</button>
                  </div>
                  {skills.length > 0 && (
                    <div className="skills-chips-container">
                      <h4>Your skills</h4>
                      <div className="skills-chips-list">
                        {skills.map((skill, idx) => (
                          <div key={idx} className="skill-chip">
                            <span>{skill.name} — {"★".repeat(skill.proficiency)}{"☆".repeat(5 - skill.proficiency)}</span>
                            <button type="button" onClick={() => removeSkill(idx)}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="nav-buttons">
          {step > 1 && <button type="button" className="secondary-btn" onClick={prevStep}>Back</button>}
          <button
            type="button"
            className="primary-btn"
            onClick={step === 5 ? finish : nextStep}
            disabled={
              (step === 1 && (!motivation || (motivation === "other" && !customMotivation.trim()))) ||
              (step === 2 && !careerStage) ||
              (step === 3 && selectedInterests.length === 0) ||
              (step === 4 && !education) ||
              (step === 5 && (skillsLoading || skills.length === 0)) ||
              loading
            }
          >
            {step < 5 ? "Next" : loading ? "Saving..." : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;