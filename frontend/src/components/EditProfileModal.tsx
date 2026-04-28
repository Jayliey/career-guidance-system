import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface EditProfileModalProps {
  user: any;
  currentProfile: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditProfileModal({ user, currentProfile, onClose, onUpdate }: EditProfileModalProps) {
  const [interest, setInterest] = useState(currentProfile.interest || '');
  const [skills, setSkills] = useState<{ name: string; proficiency: number }[]>(
    currentProfile.skills || []
  );
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentProficiency, setCurrentProficiency] = useState(3);
  const [loading, setLoading] = useState(false);

  const addSkill = () => {
    if (currentSkill.trim()) {
      setSkills([...skills, { name: currentSkill.trim(), proficiency: currentProficiency }]);
      setCurrentSkill('');
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

  const handleSave = async () => {
    if (!interest || skills.length === 0) {
      alert('Please select interest and at least one skill');
      return;
    }

    setLoading(true);
    try {
      // ✅ Use the profile's own ID (currentProfile.id), not user.id
      const profileId = currentProfile.id;
      if (!profileId) {
        throw new Error('Profile ID is missing');
      }

      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          interest,
          skills: skills.map(s => s.name)
        })
        .eq('id', profileId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        alert(`Profile update failed: ${profileError.message}`);
        return;
      }

      // 2. Delete old user_skills
      const { error: deleteError } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', profileId);

      if (deleteError) {
        console.error('Delete skills error:', deleteError);
        alert(`Failed to update skills: ${deleteError.message}`);
        return;
      }

      // 3. Insert new skills with proficiency
      if (skills.length > 0) {
        const skillsData = skills.map(s => ({
          user_id: profileId,
          skill_name: s.name.toLowerCase(),
          proficiency: s.proficiency,
        }));

        const { error: insertError } = await supabase
          .from('user_skills')
          .insert(skillsData);

        if (insertError) {
          console.error('Insert skills error:', insertError);
          alert(`Failed to save skills: ${insertError.message}`);
          return;
        }
      }

      alert('Profile updated successfully!');
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Profile</h2>
        <div className="form-group">
          <label>Interest Area</label>
          <div className="interest-buttons">
            {['technology', 'business', 'science'].map((opt) => (
              <button
                key={opt}
                className={interest === opt ? 'active' : ''}
                onClick={() => setInterest(opt)}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Skills</label>
          <div className="skill-input-row">
            <input
              type="text"
              placeholder="Skill name"
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
            />
            <select
              value={currentProficiency}
              onChange={(e) => setCurrentProficiency(Number(e.target.value))}
            >
              {[1,2,3,4,5].map(lvl => (
                <option key={lvl} value={lvl}>{lvl} - {lvl===1?'Beginner':lvl===5?'Expert':'Intermediate'}</option>
              ))}
            </select>
            <button onClick={addSkill}>Add</button>
          </div>
          <div className="skills-list">
            {skills.map((skill, idx) => (
              <div key={idx} className="skill-item">
                <span>{skill.name} - {'★'.repeat(skill.proficiency)}{'☆'.repeat(5-skill.proficiency)}</span>
                <div>
                  <select
                    value={skill.proficiency}
                    onChange={(e) => updateProficiency(idx, Number(e.target.value))}
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}