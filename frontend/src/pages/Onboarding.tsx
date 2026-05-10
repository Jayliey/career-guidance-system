import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Interest {
  id: number;
  name: string;
  category: string;
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [motivation, setMotivation] = useState("");
  const [customMotivation, setCustomMotivation] = useState("");
  const [careerStage, setCareerStage] = useState("");
  const [degreeProgram, setDegreeProgram] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [institution, setInstitution] = useState("");
  const [workExperience, setWorkExperience] = useState("");
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);
  const [skills, setSkills] = useState<{ name: string; proficiency: number }[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentProficiency, setCurrentProficiency] = useState(3);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  // Fetch interests from DB
  useEffect(() => {
    const fetchInterests = async () => {
      setInterestsLoading(true);
      const { data, error } = await supabase.from("interests").select("*");
      if (error) {
        console.error("Error fetching interests:", error);
      } else if (data) {
        setAllInterests(data);
      }
      setInterestsLoading(false);
    };
    fetchInterests();
  }, []);

  const addSkill = () => {
    if (currentSkill.trim()) {
      setSkills([...skills, { name: currentSkill.trim(), proficiency: currentProficiency }]);
      setCurrentSkill("");
      setCurrentProficiency(3);
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const toggleInterest = (interestId: number) => {
    setSelectedInterestIds(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const finish = async () => {
    if (!careerStage || selectedInterestIds.length === 0 || skills.length === 0) {
      alert("Please complete all steps (career stage, interests, and at least one skill)");
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

      // Upsert profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          interest: selectedInterestIds.map(id => allInterests.find(i => i.id === id)?.name).join(","),
          skills: skills.map(s => s.name),
          motivation: finalMotivation,
          career_stage: careerStage,
          degree_program: degreeProgram,
          year_of_study: yearOfStudy,
          institution: institution,
          work_experience: workExperience || null,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Save user interests (many-to-many)
      await supabase.from("user_interests").delete().eq("user_id", user.id);
      const interestsData = selectedInterestIds.map(id => ({
        user_id: user.id,
        interest_id: id
      }));
      if (interestsData.length) {
        const { error: interestError } = await supabase.from("user_interests").insert(interestsData);
        if (interestError) console.error("Interest error:", interestError);
      }

      // Save skills
      await supabase.from("user_skills").delete().eq("user_id", user.id);
      const skillsData = skills.map(skill => ({
        user_id: user.id,
        skill_name: skill.name.toLowerCase().trim(),
        proficiency: skill.proficiency
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

  const quickSkills = ["Python", "JavaScript", "React", "SQL", "Excel", "Node.js", "Communication"];

  return (
    <div className="onboarding">
      <div className="progress">Step {step} of 4</div>

      {/* STEP 1 – Motivation */}
      {step === 1 && (
        <div className="card">
          <h2>What motivates you most?</h2>
          <div className="motivation-options">
            {motivationOptions.map(opt => (
              <button
                key={opt.value}
                className={`motivation-btn ${motivation === opt.value ? "active" : ""}`}
                onClick={() => {
                  setMotivation(opt.value);
                  setCustomMotivation("");
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              className={`motivation-btn ${motivation === "other" ? "active" : ""}`}
              onClick={() => setMotivation("other")}
            >
              ✏️ Other (write your own)
            </button>
          </div>
          {motivation === "other" && (
            <input
              type="text"
              placeholder="e.g., Building things, teaching others, financial independence..."
              value={customMotivation}
              onChange={(e) => setCustomMotivation(e.target.value)}
              className="motivation-input"
            />
          )}
          <div className="nav-buttons">
            <button onClick={nextStep} disabled={!motivation || (motivation === "other" && !customMotivation.trim())}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 – Career Stage & Academic Background */}
      {step === 2 && (
        <div className="card">
          <h2>Tell us about yourself</h2>
          <div className="form-group">
            <label>Career Stage *</label>
            <div className="interest-buttons">
              <button className={careerStage === "student" ? "active" : ""} onClick={() => setCareerStage("student")}>
                🎓 Student
              </button>
              <button className={careerStage === "recent_graduate" ? "active" : ""} onClick={() => setCareerStage("recent_graduate")}>
                📜 Recent Graduate (&lt;2 years)
              </button>
              <button className={careerStage === "career_switcher" ? "active" : ""} onClick={() => setCareerStage("career_switcher")}>
                🔄 Career Switcher
              </button>
            </div>
          </div>

          {(careerStage === "student" || careerStage === "recent_graduate") && (
            <>
              <div className="form-group">
                <label>Degree Program</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science, Business Administration"
                  value={degreeProgram}
                  onChange={(e) => setDegreeProgram(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Year of Study (or year graduated)</label>
                <input
                  type="text"
                  placeholder="e.g., 3rd Year, 2024"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Institution</label>
                <input
                  type="text"
                  placeholder="e.g., University of Zimbabwe"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
            </>
          )}

          {careerStage === "career_switcher" && (
            <div className="form-group">
              <label>Previous Work Experience (Optional)</label>
              <textarea
                placeholder="Describe your previous roles, industry, and transferable skills"
                value={workExperience}
                onChange={(e) => setWorkExperience(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="nav-buttons">
            <button onClick={prevStep}>Back</button>
            <button onClick={nextStep} disabled={!careerStage}>Next</button>
          </div>
        </div>
      )}

      {/* STEP 3 – Multiple Interests */}
      {step === 3 && (
        <div className="card">
          <h2>Select your interests (you can choose multiple)</h2>
          {interestsLoading ? (
            <div className="loading">Loading interests...</div>
          ) : allInterests.length === 0 ? (
            <div className="error-message">No interests available. Please contact admin.</div>
          ) : (
            <div className="interests-grid">
              {allInterests.map(interest => (
                <button
                  key={interest.id}
                  className={`interest-checkbox ${selectedInterestIds.includes(interest.id) ? "active" : ""}`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  {interest.name}
                </button>
              ))}
            </div>
          )}
          <div className="nav-buttons">
            <button onClick={prevStep}>Back</button>
            <button onClick={nextStep} disabled={selectedInterestIds.length === 0}>Next</button>
          </div>
        </div>
      )}

      {/* STEP 4 – Skills */}
      {step === 4 && (
        <div className="card">
          <h2>Add your skills</h2>
          <p>Rate your proficiency (1-5):</p>
          <div className="quick-add">
            <p>Quick add:</p>
            <div className="quick-buttons">
              {quickSkills.map(skill => (
                <button
                  key={skill}
                  onClick={() => {
                    if (!skills.find(s => s.name.toLowerCase() === skill.toLowerCase())) {
                      setSkills([...skills, { name: skill, proficiency: 3 }]);
                    }
                  }}
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="skill-input">
            <input
              type="text"
              placeholder="Skill name (e.g., Python, JS, React.js)"
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
            />
            <select
              value={currentProficiency}
              onChange={(e) => setCurrentProficiency(Number(e.target.value))}
            >
              <option value="1">1 – Beginner</option>
              <option value="2">2 – Basic</option>
              <option value="3">3 – Intermediate</option>
              <option value="4">4 – Advanced</option>
              <option value="5">5 – Expert</option>
            </select>
            <button onClick={addSkill}>+ Add</button>
          </div>
          {skills.length > 0 && (
            <div className="skills-list">
              <h4>Your Skills:</h4>
              {skills.map((skill, index) => (
                <div key={index} className="skill-item">
                  <span>
                    {skill.name} – {"★".repeat(skill.proficiency)}{"☆".repeat(5 - skill.proficiency)}
                  </span>
                  <button onClick={() => removeSkill(index)} className="remove-btn">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="nav-buttons">
            <button onClick={prevStep}>Back</button>
            <button onClick={finish} disabled={skills.length === 0 || loading}>
              {loading ? "Saving..." : "Finish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Onboarding;