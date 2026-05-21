import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface UserProfile {
  id?: string;
  interest?: string | string[];
  skills?: { name: string; proficiency: number }[];
  email?: string;
}

interface EditProfileModalProps {
  currentProfile: UserProfile;
  onClose: () => void;
  onUpdate: () => void;
}

function normalizeInterest(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  if (typeof value === "string") return value.split(",").map((str) => str.trim()).filter(Boolean);
  return [];
}

export default function EditProfileModal({ currentProfile, onClose, onUpdate }: EditProfileModalProps) {
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<{ name: string; proficiency: number }[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentProficiency, setCurrentProficiency] = useState(3);
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [allSkillsList, setAllSkillsList] = useState<string[]>([]);

  // Predefined interest options (all 9)
  const interestOptions = [
    "Technology", "Business", "Science", "Design", "Healthcare",
    "Education", "Finance", "Marketing", "Engineering"
  ];

  // Fetch all skills for dropdown
  useEffect(() => {
    const fetchAllSkills = async () => {
      const { data, error } = await supabase.from("skills").select("name").order("name");
      if (!error && data) setAllSkillsList(data.map(s => s.name));
    };
    fetchAllSkills();
  }, []);

  // Load current interests and skills
  useEffect(() => {
    setInterests(normalizeInterest(currentProfile.interest));

    const fetchUserSkills = async () => {
      if (!currentProfile.id) return;
      const { data, error } = await supabase
        .from("user_skills")
        .select("skill_name, proficiency")
        .eq("user_id", currentProfile.id);
      if (!error && data) {
        setSkills(data.map(s => ({ name: s.skill_name, proficiency: s.proficiency })));
      } else if (currentProfile.skills && Array.isArray(currentProfile.skills)) {
        setSkills(currentProfile.skills);
      }
    };
    fetchUserSkills();
  }, [currentProfile]);

  const addSkill = () => {
    const trimmed = currentSkill.trim();
    if (trimmed && !skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([...skills, { name: trimmed, proficiency: currentProficiency }]);
      setCurrentSkill("");
      setCurrentProficiency(3);
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const updateProficiency = (index: number, newProficiency: number) => {
    const updated = [...skills];
    updated[index].proficiency = newProficiency;
    setSkills(updated);
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    const trimmed = customInterestInput.trim();
    if (!trimmed) return;
    if (!interests.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setInterests([...interests, trimmed]);
    }
    setCustomInterestInput("");
  };

  const handleSave = async () => {
    if (interests.length === 0 || skills.length === 0) {
      alert("Please select at least one interest and add at least one skill");
      return;
    }

    setLoading(true);
    try {
      const profileId = currentProfile.id;
      if (!profileId) throw new Error("Profile ID missing");

      // Update interests as array
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ interest: interests })
        .eq("id", profileId);
      if (profileError) throw profileError;

      // Replace user_skills
      await supabase.from("user_skills").delete().eq("user_id", profileId);
      if (skills.length > 0) {
        const skillsData = skills.map(s => ({
          user_id: profileId,
          skill_name: s.name.toLowerCase(),
          proficiency: s.proficiency,
        }));
        const { error: insertError } = await supabase.from("user_skills").insert(skillsData);
        if (insertError) throw insertError;
      }

      alert("Profile updated successfully!");
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Update failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Profile</h2>

        {/* Interests - button grid with active highlighting */}
        <div className="form-group">
          <label>Interest Areas (select multiple)</label>
          <div className="interests-grid">
            {interestOptions.map(interest => (
              <div
                key={interest}
                className={`interest-card ${interests.includes(interest) ? "active" : ""}`}
                onClick={() => toggleInterest(interest)}
              >
                <div className="interest-label">{interest}</div>
                {interests.includes(interest) && <div className="interest-check">✓</div>}
              </div>
            ))}
          </div>
          <div className="custom-interest-row" style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Add a custom interest"
              value={customInterestInput}
              onChange={(e) => setCustomInterestInput(e.target.value)}
            />
            <button type="button" onClick={addCustomInterest}>Add</button>
          </div>
          {/* Optional: show selected interests as chips (redundant but nice) */}
          <div className="selected-interest-list" style={{ marginTop: 8 }}>
            {interests.map((item, idx) => (
              <span key={idx} className="interest-chip" onClick={() => toggleInterest(item)}>
                {item} ×
              </span>
            ))}
          </div>
        </div>

        {/* Skills section (unchanged) */}
        <div className="form-group">
          <label>Skills</label>
          <div className="skill-input-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              list="skills-list"
              placeholder="Skill name"
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
              style={{ flex: 2 }}
            />
            <datalist id="skills-list">
              {allSkillsList.map(s => <option key={s} value={s} />)}
            </datalist>
            <select
              value={currentProficiency}
              onChange={(e) => setCurrentProficiency(Number(e.target.value))}
              style={{ width: 100 }}
            >
              {[1,2,3,4,5].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
            <button type="button" onClick={addSkill}>Add</button>
          </div>
          <div className="skills-list">
            {skills.map((skill, idx) => (
              <div key={idx} className="skill-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>{skill.name} – {"★".repeat(skill.proficiency)}{"☆".repeat(5 - skill.proficiency)}</span>
                <div>
                  <select
                    value={skill.proficiency}
                    onChange={(e) => updateProficiency(idx, Number(e.target.value))}
                    style={{ marginRight: 8 }}
                  >
                    {[1,2,3,4,5].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                  <button onClick={() => removeSkill(idx)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-buttons">
          <button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}