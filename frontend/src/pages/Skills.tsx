import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function Skills() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userSkills, setUserSkills] = useState<{ name: string; proficiency: number }[]>([]);
  const [allSkills, setAllSkills] = useState<{ id: number; name: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedProficiency, setSelectedProficiency] = useState(3);
  const [message, setMessage] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  // Fetch user's profile to get the correct ID, then fetch skills
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchData = async () => {
      try {
        // Get profile using email (same as Dashboard)
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

        // Fetch user skills using profile.id
        const { data: userSkillsData, error: userSkillsError } = await supabase
          .from("user_skills")
          .select("skill_name, proficiency")
          .eq("user_id", profile.id);
        if (userSkillsError) throw userSkillsError;
        if (userSkillsData) {
          setUserSkills(userSkillsData.map(s => ({ name: s.skill_name, proficiency: s.proficiency })));
        }

        // Fetch all available skills from skills table
        const { data: allSkillsData, error: allSkillsError } = await supabase
          .from("skills")
          .select("id, name, category");
        if (allSkillsError) throw allSkillsError;
        if (allSkillsData) {
          setAllSkills(allSkillsData);
        }
      } catch (err) {
        console.error(err);
        setMessage("Error loading skills");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  const addSkill = async () => {
    if (!selectedSkill) {
      setMessage("Please select a skill");
      return;
    }
    if (!profileId) {
      setMessage("User profile not loaded");
      return;
    }
    // Check if already exists
    if (userSkills.some(s => s.name.toLowerCase() === selectedSkill.toLowerCase())) {
      setMessage("Skill already in your list");
      return;
    }
    try {
      const { error } = await supabase
        .from("user_skills")
        .insert([{ user_id: profileId, skill_name: selectedSkill.toLowerCase(), proficiency: selectedProficiency }]);
      if (error) throw error;
      setMessage("Skill added!");
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
      setSelectedProficiency(3);
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
      setMessage("Skill removed");
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
      setMessage("Proficiency updated");
      setUserSkills(userSkills.map(s => s.name === skillName ? { ...s, proficiency: newProficiency } : s));
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const renderStars = (proficiency: number) => {
    return "★".repeat(proficiency) + "☆".repeat(5 - proficiency);
  };

  if (loading) return <div className="loading">Loading skills...</div>;

  return (
    <div className="skills-page">
      <div className="skills-header">
        <h1>Manage Your Skills</h1>
        <button onClick={() => setEditMode(!editMode)} className="edit-skills-btn">
          {editMode ? "Cancel" : "Edit Skills"}
        </button>
      </div>

      {message && <div className="skills-message">{message}</div>}

      <div className="skills-grid">
        {/* Left: Your current skills */}
        <div className="current-skills">
          <h2>Your Skills</h2>
          {userSkills.length === 0 ? (
            <p>No skills added yet. Use the panel on the right to add skills.</p>
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
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                      <button onClick={() => removeSkill(skill.name)} className="remove-skill-btn">
                        Remove
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
          <h2>Add New Skill</h2>
          <div className="add-skill-form">
            <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
              <option value="">-- Select a skill --</option>
              {allSkills
                .filter(skill => !userSkills.some(us => us.name.toLowerCase() === skill.name.toLowerCase()))
                .map(skill => (
                  <option key={skill.id} value={skill.name}>{skill.name} ({skill.category})</option>
                ))}
            </select>
            <select value={selectedProficiency} onChange={(e) => setSelectedProficiency(parseInt(e.target.value))}>
              {[1,2,3,4,5].map(lvl => (
                <option key={lvl} value={lvl}>{lvl} – {lvl===1?"Beginner":lvl===5?"Expert":"Intermediate"}</option>
              ))}
            </select>
            <button onClick={addSkill}>Add Skill</button>
          </div>
          <p className="add-hint">Proficiency: 1 (low) to 5 (high)</p>
        </div>
      </div>
    </div>
  );
}

export default Skills;