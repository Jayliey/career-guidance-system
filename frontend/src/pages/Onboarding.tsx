import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function Onboarding() {
  const [step, setStep] = useState(1);
  const [interest, setInterest] = useState("");
  const [skills, setSkills] = useState<{name: string; proficiency: number}[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentProficiency, setCurrentProficiency] = useState(3);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const nextStep = () => {
    if (step < 3) setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

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

  const finish = async () => {
    if (!interest || skills.length === 0) {
      alert("Please select interest and add at least one skill");
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

      const skillNames = skills.map(s => s.name);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          interest: interest,
          skills: skillNames,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        alert("Error saving profile: " + profileError.message);
        return;
      }

      await supabase.from("user_skills").delete().eq("user_id", user.id);

      const skillsData = skills.map(skill => ({
        user_id: user.id,
        skill_name: skill.name.toLowerCase().trim(),
        proficiency: skill.proficiency
      }));

      const { error: skillsError } = await supabase
        .from("user_skills")
        .insert(skillsData);

      if (skillsError) {
        alert("Error saving skills: " + skillsError.message);
        return;
      }

      alert("Profile saved successfully!");
      window.location.href = "/dashboard";

    } catch (err) {
      alert("Server error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const interestOptions = [
    { value: "technology", label: "Technology" },
    { value: "business", label: "Business" },
    { value: "science", label: "Science" }
  ];

  const quickSkills = ["Python", "JavaScript", "React", "SQL", "Excel", "Node.js", "Communication"];

  return (
    <div className="onboarding">
      <div className="progress">
        Step {step} of 3
      </div>

      {step === 1 && (
        <div className="card">
          <h2>What do you enjoy more?</h2>
          <div className="button-group">
            <button onClick={nextStep}>Solving problems</button>
            <button onClick={nextStep}>Working with people</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Select your interest area</h2>
          <div className="interest-buttons">
            {interestOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setInterest(opt.value)}
                className={interest === opt.value ? "active" : ""}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="nav-buttons">
            <button onClick={prevStep}>Back</button>
            <button onClick={nextStep} disabled={!interest}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
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
              <option value="1">1 - Beginner</option>
              <option value="2">2 - Basic</option>
              <option value="3">3 - Intermediate</option>
              <option value="4">4 - Advanced</option>
              <option value="5">5 - Expert</option>
            </select>
            <button onClick={addSkill}>+ Add</button>
          </div>

          {skills.length > 0 && (
            <div className="skills-list">
              <h4>Your Skills:</h4>
              {skills.map((skill, index) => (
                <div key={index} className="skill-item">
                  <span>
                    {skill.name} - 
                    {"★".repeat(skill.proficiency)}{"☆".repeat(5 - skill.proficiency)}
                  </span>
                  <button onClick={() => removeSkill(index)} className="remove-btn">Remove</button>
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