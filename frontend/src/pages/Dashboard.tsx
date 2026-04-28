import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import CareerRoadmap from "../components/CareerRoadmap";
import ReportGenerator from "../components/ReportGenerator";
import JobListings from "../components/JobListings";
import Chatbot from "../components/Chatbot";
import EditProfileModal from "../components/EditProfileModal";

function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false); // ✅ NEW: AI loading state
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [selectedJobCareer, setSelectedJobCareer] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const renderStars = (proficiency: number) => {
    return "★".repeat(proficiency) + "☆".repeat(5 - proficiency);
  };

  const openRoadmap = (careerName: string) => {
    setSelectedCareer(careerName);
    setShowRoadmap(true);
  };

  const openJobs = (careerName: string) => {
    setSelectedJobCareer(careerName);
    setShowJobs(true);
  };

  const downloadReport = async () => {
    setDownloading(true);
    try {
      await ReportGenerator.generateReport(data, matches);
      alert("Report downloaded successfully!");
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const refreshDashboard = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          navigate("/login");
          return;
        }
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();
        if (error || !profile) {
          navigate("/onboarding");
          return;
        }
        const { data: userSkills } = await supabase
          .from("user_skills")
          .select("skill_name, proficiency")
          .eq("user_id", user.id);
        if (userSkills && userSkills.length > 0) {
          profile.skills = userSkills.map(s => ({
            name: s.skill_name,
            proficiency: s.proficiency
          }));
        } else if (profile.skills && typeof profile.skills[0] === 'string') {
          profile.skills = profile.skills.map((s: string) => ({
            name: s,
            proficiency: 3
          }));
        }
        setData(profile);

        // ✅ Start AI loading
        setAiLoading(true);
        const res = await fetch("http://localhost:5000/ai/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interest: profile.interest,
            skills: profile.skills
          }),
        });
        const result = await res.json();
        setMatches(result);
        setAiLoading(false);
      } catch (err) {
        console.error(err);
        setAiLoading(false);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate, refreshTrigger]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="loading">No profile data found</div>;

  const topMatch = matches[0];
  const readinessScore = topMatch?.score || 0;

  // Helper to compute matched/missing skills from required list and user's actual skills
  const getUserSkillNames = () => data.skills.map((s: any) => s.name.toLowerCase());
  const computeMatchedSkills = (required: string[]) => {
    const userSkills = getUserSkillNames();
    return required.filter(skill => userSkills.includes(skill.toLowerCase()));
  };
  const computeMissingSkills = (required: string[]) => {
    const userSkills = getUserSkillNames();
    return required.filter(skill => !userSkills.includes(skill.toLowerCase()));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>AI Career Dashboard</h1>
        <div className="header-buttons">
          <button onClick={() => setShowEditModal(true)} className="edit-btn">
            ✏️ Edit Profile
          </button>
          <button onClick={downloadReport} className="download-btn" disabled={downloading}>
            {downloading ? "Generating..." : "📄 Download Report (PDF)"}
          </button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="section">
        <h2>Your Profile</h2>
        <p><strong>Interest Area:</strong> {data.interest}</p>
        <h3>Your Skills</h3>
        <div className="tags">
          {data.skills?.map((s: any, i: number) => (
            <span key={i} className="skill-tag">
              <strong>{s.name}</strong>
              <small>{renderStars(s.proficiency)}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>AI Career Readiness Score</h2>
        <div className="bar">
          <div className="fill" style={{ width: `${readinessScore}%` }} />
        </div>
        <p className="score-text">{readinessScore}% match with your top career</p>
      </div>

      {topMatch?.missingSkills?.length > 0 && (
        <div className="section">
          <h2>📊 Skill Gap Analysis</h2>
          <p>To become a <strong>{topMatch.name}</strong>, you need to improve:</p>
          <div className="tags">
            {topMatch.missingSkills.map((skill: string, i: number) => (
              <span key={i} className="missing-skill">{skill}</span>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h2>🎯 Top Career Matches</h2>
        {aiLoading ? (
          <div className="loading">AI is analyzing your skills...</div>
        ) : (
          matches.slice(0, 5).map((c: any, i: number) => {
            // Use frontend calculation for matched & missing (as a fallback)
            const computedMatched = computeMatchedSkills(c.requiredSkills || []);
            const computedMissing = computeMissingSkills(c.requiredSkills || []);

            return (
              <div key={i} className={`match-card ${i === 0 ? "top-match" : ""}`}>
                <div className="match-header">
                  <h3>{c.name}</h3>
                  <span className={`score-badge ${c.score >= 70 ? "high" : c.score >= 40 ? "medium" : "low"}`}>
                    {c.score}% Match
                  </span>
                </div>
                <p>{c.description}</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${c.completion}%` }} />
                </div>
                <small>Skills completion: {c.completion}%</small>
                <div className="reasoning">
                  <strong>🧠 AI Reasoning:</strong> {c.reasoning}
                </div>

                {/* Required Skills */}
                <div className="skill-section">
                  <div className="skill-section-title">📋 Required Skills</div>
                  <div className="skill-badges">
                    {c.requiredSkills?.map((skill: string, idx: number) => (
                      <span key={idx} className="required-skill">{skill}</span>
                    ))}
                  </div>
                </div>

                {/* Matched Skills (frontend computed) */}
                <div className="skill-section">
                  <div className="skill-section-title">✅ Matched Skills</div>
                  <div className="skill-badges">
                    {computedMatched.length > 0 ? (
                      computedMatched.map((skill: string, idx: number) => (
                        <span key={idx} className="matched-skill">✓ {skill}</span>
                      ))
                    ) : (
                      <span className="no-skills">None</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills (frontend computed) */}
                <div className="skill-section">
                  <div className="skill-section-title">❌ Missing Skills</div>
                  <div className="skill-badges">
                    {computedMissing.length > 0 ? (
                      computedMissing.map((skill: string, idx: number) => (
                        <span key={idx} className="missing-skill-badge">✗ {skill}</span>
                      ))
                    ) : (
                      <span className="no-skills">None – Perfect match!</span>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button className="roadmap-btn" onClick={() => openRoadmap(c.name)}>
                    🗺️ View Learning Path
                  </button>
                  <button className="jobs-btn" onClick={() => openJobs(c.name)}>
                    💼 View Jobs
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showRoadmap && (
        <CareerRoadmap careerName={selectedCareer} onClose={() => setShowRoadmap(false)} />
      )}
      {showJobs && (
        <JobListings careerName={selectedJobCareer} onClose={() => setShowJobs(false)} />
      )}

      <Chatbot />

      {showEditModal && (
        <EditProfileModal
          user={authUser}
          currentProfile={data}
          onClose={() => setShowEditModal(false)}
          onUpdate={refreshDashboard}
        />
      )}
    </div>
  );
}

export default Dashboard;