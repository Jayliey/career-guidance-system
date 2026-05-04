import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import EditProfileModal from "../components/EditProfileModal";

function MyProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<{ name: string; proficiency: number }[]>([]);
  const [aboutMe, setAboutMe] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [topCareerMissing, setTopCareerMissing] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const renderStars = (proficiency: number) => {
    return "★".repeat(proficiency) + "☆".repeat(5 - proficiency);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          navigate("/login");
          return;
        }

        // Get profile using email
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();
        if (profileError || !profileData) {
          navigate("/onboarding");
          return;
        }
        setProfile(profileData);
        setAboutMe(profileData.about_me || "");
        setAvatarUrl(profileData.avatar_url || null);

        // Get skills
        const { data: userSkills } = await supabase
          .from("user_skills")
          .select("skill_name, proficiency")
          .eq("user_id", profileData.id);
        if (userSkills && userSkills.length > 0) {
          setSkills(userSkills.map(s => ({ name: s.skill_name, proficiency: s.proficiency })));
        } else if (profileData.skills && typeof profileData.skills === 'string') {
          const skillNames = profileData.skills.split(',').map((s: string) => s.trim());
          // ✅ FIXED: added explicit type for name
          setSkills(skillNames.map((name: string) => ({ name, proficiency: 3 })));
        } else if (Array.isArray(profileData.skills) && profileData.skills.length > 0) {
          setSkills(profileData.skills.map((s: string) => ({ name: s, proficiency: 3 })));
        } else {
          setSkills([]);
        }

        // Fetch AI matches for recommended focus
        const res = await fetch("http://localhost:5000/ai/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interest: profileData.interest,
            skills: skills.map(s => ({ name: s.name, proficiency: s.proficiency })),
          }),
        });
        const result = await res.json();
        setMatches(result);
        if (result && result.length > 0) {
          setTopCareerMissing(result[0].missingSkills || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const handleSaveAbout = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ about_me: aboutMe })
      .eq("id", profile.id);
    if (error) {
      alert("Failed to save about me: " + error.message);
    } else {
      setEditingAbout(false);
      alert("About me saved!");
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!profile) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert("Avatar updated successfully!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile || !avatarUrl) return;
    setUploadingAvatar(true);
    try {
      const urlParts = avatarUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('avatars') + 1).join('/');
      if (filePath) {
        await supabase.storage.from('avatars').remove([filePath]);
      }
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(null);
      alert("Avatar removed.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  // Compute stats
  const totalSkills = skills.length;
  const strongSkills = skills.filter(s => s.proficiency >= 4).length;
  const averageSkills = skills.filter(s => s.proficiency >= 2 && s.proficiency <= 3).length;
  const beginnerSkills = skills.filter(s => s.proficiency === 1).length;

  let completion = 0;
  if (profile?.interest) completion += 25;
  if (skills.length > 0) completion += 25;
  if (profile?.email) completion += 25;
  if (profile?.about_me && profile.about_me.length > 10) completion += 25;
  completion = Math.min(completion, 100);

  return (
    <div className="myprofile-container">
      <div className="myprofile-header">
        <h1>My Profile</h1>
        <div className="myprofile-actions">
          <button onClick={() => setShowEditModal(true)} className="edit-goals-btn">
            ✏️ Edit Goals
          </button>
          <button onClick={() => navigate("/dashboard")} className="download-report-btn">
            📄 Download Report (PDF)
          </button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="myprofile-grid">
        {/* Left column */}
        <div className="myprofile-left">
          <div className="profile-card">
            <div className="avatar-section">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">📷</div>
              )}
              <div className="avatar-buttons">
                <label className="avatar-upload-btn">
                  📸 Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    style={{ display: "none" }}
                  />
                </label>
                {avatarUrl && (
                  <button onClick={handleDeleteAvatar} className="avatar-delete-btn" disabled={uploadingAvatar}>
                    🗑️ Remove
                  </button>
                )}
              </div>
            </div>
            <h2>{profile?.email?.split('@')[0] || "User"}</h2>
            <p className="profile-email">{profile?.email}</p>
            <p className="profile-joined">Joined on {new Date(profile?.created_at || Date.now()).toLocaleDateString()}</p>
            <div className="profile-completion">
              <span>Profile Complete</span>
              <div className="completion-bar">
                <div className="completion-fill" style={{ width: `${completion}%` }} />
              </div>
              <span>{completion}%</span>
            </div>
          </div>

          <div className="skills-card">
            <h3>Your Skills</h3>
            <div className="skills-list">
              {skills.map((skill, idx) => (
                <div key={idx} className="skill-row">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-stars">{renderStars(skill.proficiency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="myprofile-right">
          <div className="about-card">
            <h3>About Me</h3>
            {editingAbout ? (
              <div className="about-edit">
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  rows={4}
                />
                <div className="about-buttons">
                  <button onClick={handleSaveAbout}>Save</button>
                  <button onClick={() => setEditingAbout(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="about-text">
                <p>{aboutMe || "No description yet. Click edit to add."}</p>
                <button onClick={() => setEditingAbout(true)} className="edit-about-btn">
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="profile-completion-details">
            <h3>My Profile Completion</h3>
            <ul>
              <li>✅ Basic Information</li>
              <li>{skills.length > 0 ? "✅" : "❌"} Skills Added ({skills.length} skills)</li>
              <li>{profile?.interest ? "✅" : "❌"} Interest Selected</li>
              <li>⏳ Experience Level (coming soon)</li>
              <li>{avatarUrl ? "✅" : "❌"} Profile Picture</li>
              <li>{aboutMe?.length > 10 ? "✅" : "❌"} Career Goals</li>
            </ul>
          </div>

          <div className="skill-summary">
            <h3>Skill Summary</h3>
            <div className="summary-stats">
              <div>Total Skills: <strong>{totalSkills}</strong></div>
              <div>Strong Skills (4-5): <strong>{strongSkills}</strong></div>
              <div>Average Skills (2-3): <strong>{averageSkills}</strong></div>
              <div>Beginner Skills (1): <strong>{beginnerSkills}</strong></div>
            </div>
          </div>

          <div className="recommended-focus">
            <h3>Recommended Focus</h3>
            {topCareerMissing.length > 0 ? (
              <p>
                Focus on improving {topCareerMissing.slice(0, 3).join(", ")} to increase your match with your top career.
              </p>
            ) : (
              <p>Keep building your skills – you're on track!</p>
            )}
          </div>
        </div>
      </div>

      {showEditModal && profile && (
        <EditProfileModal
          user={authUser}
          currentProfile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => window.location.reload()}
        />
      )}
    </div>
  );
}

export default MyProfile;