import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import CareerRoadmap from "../components/CareerRoadmap";
import JobListings from "../components/JobListings";

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
    setSelectedCareer(careerName);
    setShowRoadmap(true);
  };

  const openJobs = (careerName: string) => {
    setSelectedCareer(careerName);
    setShowJobs(true);
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
        // ✅ Keep only top 8 matches
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

  if (loading) return <div className="loading">Loading career matches...</div>;
  if (error) return <div className="error-message">⚠️ {error}</div>;

  return (
    <div className="matches-page">
      <div className="matches-header">
        <h1>Career Matches</h1>
        <p>Based on your skills and interests</p>
      </div>

      <div className="matches-list">
        {matches.length === 0 ? (
          <p>No career matches found. Please update your skills and interests.</p>
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
                <span className="match-completion">Skills Completion: {c.completion}%</span>
                <button className="match-toggle">{expanded === idx ? "−" : "+"}</button>
              </div>
              {expanded === idx && (
                <div className="match-details">
                  <p className="match-description">{c.description}</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${c.completion}%` }} />
                  </div>
                  <div className="reasoning">
                    <strong>🧠 AI Reasoning:</strong> {c.reasoning}
                  </div>
                  <div className="skill-stats">
                    <p><strong>Matched Skills:</strong> {c.matchedSkills?.length || 0}</p>
                    <p><strong>Missing Skills:</strong> {c.missingSkills?.length || 0}</p>
                  </div>
                  {adaptabilityScores[c.id] !== undefined && (
                    <div className="adaptability-score">
                      🔄 Transferable skills: {adaptabilityScores[c.id]}%
                      <span className="adaptability-hint"> (versatile career)</span>
                    </div>
                  )}
                  <div className="match-buttons">
                    <button className="roadmap-btn" onClick={() => openRoadmap(c.name)}>
                      🗺️ View Learning Path
                    </button>
                    <button className="jobs-btn" onClick={() => openJobs(c.name)}>
                      💼 View Jobs
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showRoadmap && (
        <CareerRoadmap
          careerName={selectedCareer}
          onClose={() => setShowRoadmap(false)}
          userSkills={userSkills}
        />
      )}
      {showJobs && <JobListings careerName={selectedCareer} onClose={() => setShowJobs(false)} />}
    </div>
  );
}

export default Matches;