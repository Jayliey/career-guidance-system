import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import '@fortawesome/fontawesome-free/css/all.min.css';
import "../App.css";

function Skills() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userSkills, setUserSkills] = useState<{ name: string; proficiency: number }[]>([]);
  const [allSkills, setAllSkills] = useState<{ id: number; name: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [customSkill, setCustomSkill] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [selectedProficiency, setSelectedProficiency] = useState(3);
  const [message, setMessage] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch user's profile and skills
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchData = async () => {
      try {
        // Get profile using email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", user.email)
          .single();
        
        if (profileError || !profile) {
          setMessage("Profile not found. Please complete onboarding.");
          setLoading(false);
          return;
        }
        setProfileId(profile.id);

        // Fetch user skills
        const { data: userSkillsData, error: userSkillsError } = await supabase
          .from("user_skills")
          .select("skill_name, proficiency")
          .eq("user_id", profile.id);
        
        if (userSkillsError) throw userSkillsError;
        if (userSkillsData) {
          setUserSkills(userSkillsData.map(s => ({ name: s.skill_name, proficiency: s.proficiency })));
        }

        // Fetch ALL available skills from skills table
        const { data: allSkillsData, error: allSkillsError } = await supabase
          .from("skills")
          .select("*")
          .order("name");
        
        if (allSkillsError) {
          console.error("Error fetching skills:", allSkillsError);
          setMessage("Error loading skills: " + allSkillsError.message);
        }
        
        if (allSkillsData && allSkillsData.length > 0) {
          console.log(`Loaded ${allSkillsData.length} skills from database`);
          setAllSkills(allSkillsData);
        } else {
          console.log("No skills found in database");
          setAllSkills([]);
        }
      } catch (err) {
        console.error(err);
        setMessage("Error loading skills");
      } finally {
        setLoading(false);
        setSkillsLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  const addSkill = async () => {
    const skillToAdd = useCustom ? customSkill.trim() : selectedSkill;
    
    if (!skillToAdd) {
      setMessage(useCustom ? "Please enter a skill name" : "Please select a skill");
      return;
    }
    if (!profileId) {
      setMessage("User profile not loaded");
      return;
    }
    if (userSkills.some(s => s.name.toLowerCase() === skillToAdd.toLowerCase())) {
      setMessage("Skill already in your list");
      return;
    }
    try {
      const { error } = await supabase
        .from("user_skills")
        .insert([{ user_id: profileId, skill_name: skillToAdd.toLowerCase(), proficiency: selectedProficiency }]);
      
      if (error) throw error;
      
      setMessage("✅ Skill added!");
      
      // Refresh user skills
      const { data: userSkillsData, error: refreshError } = await supabase
        .from("user_skills")
        .select("skill_name, proficiency")
        .eq("user_id", profileId);
      
      if (refreshError) throw refreshError;
      if (userSkillsData) {
        setUserSkills(userSkillsData.map(s => ({ name: s.skill_name, proficiency: s.proficiency })));
      }
      
      setSelectedSkill("");
      setCustomSkill("");
      setUseCustom(false);
      setSelectedProficiency(3);
      setSearchTerm("");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const removeSkill = async (skillName: string) => {
    if (!profileId) return;
    try {
      const { error } = await supabase
        .from("user_skills")
        .delete()
        .eq("user_id", profileId)
        .eq("skill_name", skillName.toLowerCase());
      
      if (error) throw error;
      
      setMessage("✅ Skill removed");
      setUserSkills(userSkills.filter(s => s.name !== skillName));
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const updateProficiency = async (skillName: string, newProficiency: number) => {
    if (!profileId) return;
    try {
      const { error } = await supabase
        .from("user_skills")
        .update({ proficiency: newProficiency })
        .eq("user_id", profileId)
        .eq("skill_name", skillName.toLowerCase());
      
      if (error) throw error;
      
      setMessage("✅ Proficiency updated");
      setUserSkills(userSkills.map(s => s.name === skillName ? { ...s, proficiency: newProficiency } : s));
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const renderStars = (proficiency: number) => {
    return "★".repeat(proficiency) + "☆".repeat(5 - proficiency);
  };

  const getProficiencyText = (level: number) => {
    switch(level) {
      case 1: return "Beginner";
      case 2: return "Novice";
      case 3: return "Intermediate";
      case 4: return "Advanced";
      case 5: return "Expert";
      default: return "Intermediate";
    }
  };

  // Filter skills based on search term and exclude already added skills
  const filteredSkills = allSkills.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !userSkills.some(us => us.name.toLowerCase() === skill.name.toLowerCase())
  );

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-pulse"></i> Loading skills...</div>;

  return (
    <div className="skills-page">
      <div className="skills-header">
        <h1><i className="fas fa-code"></i> Manage Your Skills</h1>
        <button onClick={() => setEditMode(!editMode)} className="edit-skills-btn">
          {editMode ? <><i className="fas fa-times"></i> Cancel</> : <><i className="fas fa-edit"></i> Edit Skills</>}
        </button>
      </div>

      {message && (
        <div className={`skills-message ${message.includes("Error") ? "error" : "success"}`}>
          <i className={message.includes("Error") ? "fas fa-exclamation-circle" : "fas fa-check-circle"}></i>
          {message}
        </div>
      )}

      <div className="skills-grid">
        {/* Left: Your current skills */}
        <div className="current-skills">
          <h2><i className="fas fa-list-check"></i> Your Skills ({userSkills.length})</h2>
          {userSkills.length === 0 ? (
            <div className="no-skills">
              <i className="fas fa-info-circle"></i>
              <p>No skills added yet. Select a skill from the dropdown on the right.</p>
            </div>
          ) : (
            <div className="skills-list">
              {userSkills.map((skill, idx) => (
                <div key={idx} className="skill-item">
                  <div className="skill-info">
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-stars">{renderStars(skill.proficiency)}</span>
                  </div>
                  {editMode && (
                    <div className="skill-actions">
                      <select
                        value={skill.proficiency}
                        onChange={(e) => updateProficiency(skill.name, parseInt(e.target.value))}
                      >
                        {[1,2,3,4,5].map(lvl => (
                          <option key={lvl} value={lvl}>{lvl} - {getProficiencyText(lvl)}</option>
                        ))}
                      </select>
                      <button onClick={() => removeSkill(skill.name)} className="remove-skill-btn">
                        <i className="fas fa-trash-alt"></i> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Add new skill */}
        <div className="add-skill-panel">
          <h2><i className="fas fa-plus-circle"></i> Add New Skill</h2>
          <div className="add-skill-form">
            {skillsLoading ? (
              <p><i className="fas fa-spinner fa-pulse"></i> Loading skills...</p>
            ) : (
              <>
                <div className="skill-input-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={useCustom}
                      onChange={(e) => setUseCustom(e.target.checked)}
                    />
                    <i className="fas fa-pen"></i> Add Custom Skill
                  </label>
                </div>

                {useCustom ? (
                  <div className="custom-skill-input">
                    <input
                      type="text"
                      placeholder="Enter custom skill name"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="skill-select-container">
                    <div className="search-box">
                      <i className="fas fa-search"></i>
                      <input
                        type="text"
                        placeholder="Search skills..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="skills-dropdown">
                      {filteredSkills.length === 0 ? (
                        <div className="no-matching-skills">
                          {searchTerm ? "No matching skills found" : "All skills already added"}
                        </div>
                      ) : (
                        <div className="skills-options">
                          {filteredSkills.map(skill => (
                            <div
                              key={skill.id}
                              className={`skill-option ${selectedSkill === skill.name ? "selected" : ""}`}
                              onClick={() => setSelectedSkill(skill.name)}
                            >
                              <span className="skill-option-name">{skill.name}</span>
                              <span className="skill-category">{skill.category}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedSkill && (
                      <div className="selected-skill-display">
                        <i className="fas fa-check-circle"></i> Selected: <strong>{selectedSkill}</strong>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="proficiency-select">
                  <label><i className="fas fa-chart-line"></i> Proficiency Level:</label>
                  <select value={selectedProficiency} onChange={(e) => setSelectedProficiency(parseInt(e.target.value))}>
                    <option value="1">1 - Beginner (Basic understanding)</option>
                    <option value="2">2 - Novice (Some experience)</option>
                    <option value="3">3 - Intermediate (Working knowledge)</option>
                    <option value="4">4 - Advanced (Deep understanding)</option>
                    <option value="5">5 - Expert (Mastery level)</option>
                  </select>
                </div>
                
                <button onClick={addSkill} className="add-skill-submit">
                  <i className="fas fa-plus"></i> Add Skill
                </button>
              </>
            )}
          </div>
          <p className="add-hint">
            <i className="fas fa-info-circle"></i> Proficiency: 1 (Beginner) to 5 (Expert)
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="skills-navigation">
        <button onClick={() => navigate("/dashboard")} className="nav-btn">
          <i className="fas fa-chart-line"></i> Go to Dashboard
        </button>
        <button onClick={() => navigate("/my-profile")} className="nav-btn">
          <i className="fas fa-user"></i> View Profile
        </button>
      </div>
    </div>
  );
}

export default Skills;