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
  const [aiLoading, setAiLoading] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [selectedJobCareer, setSelectedJobCareer] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedCareer, setExpandedCareer] = useState<number | null>(null);
  const [adaptabilityMap, setAdaptabilityMap] = useState<{ [key: number]: number }>({});
  const [userInterests, setUserInterests] = useState<string[]>([]);

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

  // Fetch adaptability score when a career card is expanded
  useEffect(() => {
    if (expandedCareer !== null) {
      const career = matches[expandedCareer];
      if (career && career.id && !adaptabilityMap[career.id]) {
        fetch("http://localhost:5000/api/adaptability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerId: career.id }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.adaptabilityScore !== undefined) {
              setAdaptabilityMap(prev => ({ ...prev, [career.id]: data.adaptabilityScore }));
            }
          })
          .catch(err => console.error(err));
      }
    }
  }, [expandedCareer, matches, adaptabilityMap]);

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
        } else if (profile.skills && typeof profile.skills === 'string') {
          const skillNames = profile.skills.split(',').map((s: string) => s.trim());
          profile.skills = skillNames.map((name: string) => ({ name, proficiency: 3 }));
        } else if (Array.isArray(profile.skills) && profile.skills.length > 0) {
          profile.skills = profile.skills.map((s: string) => ({ name: s, proficiency: 3 }));
        } else {
          profile.skills = [];
        }
        setData(profile);

       // Fetch user's multiple interests
const { data: interestsData, error: interestsError } = await supabase
  .from("user_interests")
  .select("interests(name)")  // assuming the relation is named 'interests'
  .eq("user_id", user.id);
if (!interestsError && interestsData) {
  // Use type assertion to avoid TypeScript error
  const interestNames = (interestsData as any[]).map(row => row.interests?.name).filter(Boolean);
  setUserInterests(interestNames);
} else if (profile.interest) {
  setUserInterests(profile.interest.split(',').map((s: string) => s.trim()));
}

        setAiLoading(true);
        const res = await fetch("http://localhost:5000/ai/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
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
  const topMatchScore = topMatch?.score || 0;
  const totalRequiredSkills = matches.reduce((sum, c) => sum + (c.requiredSkills?.length || 0), 0);
  const totalMatchedSkills = matches.reduce((sum, c) => sum + (c.matchedSkills?.length || 0), 0);
  const overallCompletion = totalRequiredSkills > 0 ? Math.round((totalMatchedSkills / totalRequiredSkills) * 100) : 0;
  const allUserSkillNames = data.skills.map((s: any) => s.name.toLowerCase().trim());
  const allRequiredSkillNames = matches.flatMap((c: any) => c.requiredSkills || []).map((s: string) => s.toLowerCase().trim());
  const uniqueRequired = [...new Set(allRequiredSkillNames)];
  const matchedCount = uniqueRequired.filter(skill => allUserSkillNames.includes(skill)).length;
  const missingCount = uniqueRequired.length - matchedCount;
  const recommendedSkills = matches.flatMap((c: any) => c.missingSkills || []).slice(0, 3);

  return (
    <div>
      <div className="main-header">
        <h1>Career Dashboard</h1>
        <div className="header-actions">
          <button onClick={() => setShowEditModal(true)} className="edit-profile-btn">✏️ Edit Profile</button>
          <button onClick={downloadReport} className="download-report-btn" disabled={downloading}>📄 Download Report</button>
        </div>
      </div>

      <div className="welcome-section">
        <h2>Welcome back, {authUser?.email?.split('@')[0] || 'User'}! 🎉</h2>
        <p>Here’s your personalized career overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>Overall Match Score</h3><div className="stat-value">{topMatchScore}%</div><div className="stat-label">Good Match</div></div>
        <div className="stat-card"><h3>Skill Completion</h3><div className="stat-value">{overallCompletion}%</div><div className="stat-label">Keep improving!</div></div>
        <div className="stat-card"><h3>Roadmaps Progress</h3><div className="stat-value">35%</div><div className="stat-label">2/6 Roadmaps</div></div>
        <div className="stat-card"><h3>Jobs Recommended</h3><div className="stat-value">{matches.length}</div><div className="stat-label">New opportunities</div></div>
      </div>

      {/* Display user interests */}
      {userInterests.length > 0 && (
        <div className="interests-section">
          <h3>Your Interests</h3>
          <div className="tags">
            {userInterests.map((interest, idx) => (
              <span key={idx} className="interest-tag">{interest}</span>
            ))}
          </div>
        </div>
      )}

      <div className="matches-section">
        <h2>Top Career Matches</h2>
        <div className="matches-list">
          {matches.slice(0, 5).map((c: any, idx: number) => (
            <div key={idx} className="match-item">
              <div
                className="match-summary"
                onClick={() => setExpandedCareer(expandedCareer === idx ? null : idx)}
              >
                <span className="match-rank">{idx + 1}.</span>
                <span className="match-name">{c.name}</span>
                <span className="match-percent">{c.score}% Match</span>
                <span className="match-completion">Skills Completion: {c.completion}%</span>
                <button className="match-toggle">{expandedCareer === idx ? '−' : '+'}</button>
              </div>
              {expandedCareer === idx && (
                <div className="match-details">
                  <p><strong>Matched Skills:</strong> {c.matchedSkills?.length || 0}</p>
                  <p><strong>Missing Skills:</strong> {c.missingSkills?.length || 0}</p>
                  {c.id && adaptabilityMap[c.id] !== undefined && (
                    <div className="adaptability-score">
                      🔄 Transferable skills: {adaptabilityMap[c.id]}%
                      <span className="adaptability-hint"> (versatile career)</span>
                    </div>
                  )}
                  <div className="match-buttons">
                    <button className="roadmap-btn" onClick={() => openRoadmap(c.name)}>🗺️ View Learning Path</button>
                    <button className="jobs-btn" onClick={() => openJobs(c.name)}>💼 View Jobs</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="skills-breakdown">
        <h2>Skills Breakdown</h2>
        <div className="breakdown-stats">
          <div className="breakdown-card"><div className="breakdown-value">{matchedCount}</div><div className="breakdown-label">Matched Skills</div></div>
          <div className="breakdown-card"><div className="breakdown-value">{missingCount}</div><div className="breakdown-label">Missing Skills</div></div>
          <div className="breakdown-card"><div className="breakdown-value">{recommendedSkills.length}</div><div className="breakdown-label">Recommended</div></div>
        </div>
      </div>

      <div className="next-steps">
        <h2>Recommended Next Steps</h2>
        <ul>
          {recommendedSkills.map((skill, i) => <li key={i}><strong>Learn {skill}</strong> – High demand skill for your top career</li>)}
          <li><strong>Build Projects</strong> – Create 2–3 projects to strengthen your profile</li>
          <li><strong>Complete Roadmap</strong> – Follow the roadmap and gain expertise</li>
        </ul>
      </div>

      <div className="user-skills-section">
        <h2>Your Skills</h2>
        <div className="user-skills-list">
          {data.skills.map((skill: any, i: number) => (
            <div key={i} className="user-skill-item">
              <span className="skill-name">{skill.name}</span>
              <span className="skill-stars">{renderStars(skill.proficiency)}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setShowEditModal(true)} className="add-skill-btn">+ Add Skill</button>
      </div>

      {showRoadmap && (
        <CareerRoadmap
          careerName={selectedCareer}
          onClose={() => setShowRoadmap(false)}
          userSkills={data.skills}
        />
      )}
      {showJobs && (
        <JobListings careerName={selectedJobCareer} onClose={() => setShowJobs(false)} />
      )}
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