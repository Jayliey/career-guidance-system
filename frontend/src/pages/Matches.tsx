import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import CareerRoadmap from "../components/CareerRoadmap";
import JobListings from "../components/JobListings";
import '@fortawesome/fontawesome-free/css/all.min.css';

function Matches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adaptabilityScores, setAdaptabilityScores] = useState<Record<number, number>>({});
  const [userSkills, setUserSkills] = useState<{ name: string; proficiency: number }[]>([]);

  const openRoadmap = (careerName: string) => {
    console.log("Opening roadmap for career:", careerName);
    setSelectedCareer(careerName);
    setShowRoadmap(true);
  };

  const openJobs = (careerName: string) => {
    console.log("Opening jobs for career:", careerName);
    setSelectedCareer(careerName);
    setShowJobs(true);
  };

  const closeRoadmap = () => {
    setShowRoadmap(false);
    setSelectedCareer("");
  };

  const closeJobs = () => {
    setShowJobs(false);
    setSelectedCareer("");
  };

  useEffect(() => {
    if (expanded !== null && matches[expanded]?.id && !adaptabilityScores[matches[expanded].id]) {
      const careerId = matches[expanded].id;
      fetch("http://localhost:5000/api/adaptability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerId }),
      })
        .then(res => res.json())
        .then(data => {
          setAdaptabilityScores(prev => ({ ...prev, [careerId]: data.adaptabilityScore }));
        })
        .catch(err => console.error(err));
    }
  }, [expanded, matches, adaptabilityScores]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) {
        navigate("/login");
        return;
      }
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();

        if (profileError || !profile) {
          setError("Profile not found. Please complete onboarding first.");
          setLoading(false);
          return;
        }

        const { data: userSkillsData } = await supabase
          .from("user_skills")
          .select("skill_name, proficiency")
          .eq("user_id", profile.id);

        let skills = [];
        if (userSkillsData && userSkillsData.length > 0) {
          skills = userSkillsData.map(s => ({ name: s.skill_name, proficiency: s.proficiency }));
        } else if (profile.skills && typeof profile.skills === 'string') {
          const skillNames = profile.skills.split(',').map((s: string) => s.trim());
          skills = skillNames.map((skillName: string) => ({ name: skillName, proficiency: 3 }));
        } else if (Array.isArray(profile.skills) && profile.skills.length > 0) {
          skills = profile.skills.map((s: string) => ({ name: s, proficiency: 3 }));
        }
        setUserSkills(skills);

        const interestValue = Array.isArray(profile.interest)
          ? profile.interest.join(",")
          : profile.interest || "";

        const res = await fetch("http://localhost:5000/ai/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interest: interestValue,
            skills: skills,
            userId: user.id,
          }),
        });
        const result = await res.json();
        const allMatches = result.matches || [];
        setMatches(allMatches.slice(0, 8));
      } catch (err) {
        console.error(err);
        setError("Failed to load career matches.");
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [user, navigate]);

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-pulse"></i> Loading career matches...</div>;
  if (error) return <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>;

  return (
    <div className="matches-page">
      <div className="matches-header">
        <h1><i className="fas fa-chart-line"></i> Career Matches</h1>
        <p>Based on your skills and interests</p>
      </div>

      <div className="matches-list">
        {matches.length === 0 ? (
          <div className="no-matches">
            <i className="fas fa-info-circle"></i>
            <p>No career matches found. Please update your skills and interests.</p>
          </div>
        ) : (
          matches.map((c, idx) => (
            <div key={idx} className="match-item">
              <div
                className="match-summary"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
              >
                <span className="match-rank">{idx + 1}.</span>
                <span className="match-name">{c.name}</span>
                <span className="match-percent">{c.score}% Match</span>
                <span className="match-completion">
                  <i className="fas fa-chart-simple"></i> {c.completion}%
                </span>
                <button className="match-toggle">
                  <i className={`fas fa-chevron-${expanded === idx ? "up" : "down"}`}></i>
                </button>
              </div>
              {expanded === idx && (
                <div className="match-details">
                  {c.description && (
                    <p className="match-description">
                      <i className="fas fa-info-circle"></i> {c.description}
                    </p>
                  )}
                  <div className="progress-section">
                    <div className="progress-label">
                      <span>Skills Completion</span>
                      <span>{c.completion}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${c.completion}%` }} />
                    </div>
                  </div>
                  {c.reasoning && (
                    <div className="reasoning">
                      <i className="fas fa-brain"></i>
                      <strong>AI Reasoning:</strong> {c.reasoning}
                    </div>
                  )}
                  <div className="skill-stats">
                    <div className="skill-stat">
                      <i className="fas fa-check-circle"></i>
                      <span>Matched Skills: <strong>{c.matchedSkills?.length || 0}</strong></span>
                    </div>
                    <div className="skill-stat">
                      <i className="fas fa-times-circle"></i>
                      <span>Missing Skills: <strong>{c.missingSkills?.length || 0}</strong></span>
                    </div>
                  </div>
                  
                  {/* Display Matched Skills Tags */}
                  {c.matchedSkills && c.matchedSkills.length > 0 && (
                    <div className="matched-skills-list">
                      <strong><i className="fas fa-check"></i> Your Matched Skills:</strong>
                      <div className="skills-tags">
                        {c.matchedSkills.slice(0, 8).map((skill: string, i: number) => (
                          <span key={i} className="skill-tag matched">{skill}</span>
                        ))}
                        {c.matchedSkills.length > 8 && (
                          <span className="skill-tag more">+{c.matchedSkills.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Display Missing Skills Tags */}
                  {c.missingSkills && c.missingSkills.length > 0 && (
                    <div className="missing-skills-list">
                      <strong><i className="fas fa-graduation-cap"></i> Skills to Learn:</strong>
                      <div className="skills-tags">
                        {c.missingSkills.slice(0, 8).map((skill: string, i: number) => (
                          <span key={i} className="skill-tag missing">{skill}</span>
                        ))}
                        {c.missingSkills.length > 8 && (
                          <span className="skill-tag more">+{c.missingSkills.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {adaptabilityScores[c.id] !== undefined && (
                    <div className="adaptability-score">
                      <i className="fas fa-exchange-alt"></i>
                      Transferable skills: {adaptabilityScores[c.id]}%
                      <span className="adaptability-hint"> (versatile career path)</span>
                    </div>
                  )}
                  
                  <div className="match-buttons">
                    <button className="roadmap-btn" onClick={() => openRoadmap(c.name)}>
                      <i className="fas fa-map"></i> View Learning Path
                    </button>
                    <button className="jobs-btn" onClick={() => openJobs(c.name)}>
                      <i className="fas fa-briefcase"></i> View Jobs
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CareerRoadmap Modal */}
      {showRoadmap && (
        <div className="modal-overlay" onClick={closeRoadmap}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeRoadmap}>
              <i className="fas fa-times"></i>
            </button>
            <CareerRoadmap
              careerName={selectedCareer}
              onClose={closeRoadmap}
              userSkills={userSkills}
              userId={user?.id}
            />
          </div>
        </div>
      )}

      {/* JobListings Modal */}
      {showJobs && (
        <div className="modal-overlay" onClick={closeJobs}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeJobs}>
              <i className="fas fa-times"></i>
            </button>
            <JobListings careerName={selectedCareer} onClose={closeJobs} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Matches;