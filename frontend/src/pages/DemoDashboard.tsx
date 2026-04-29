import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function DemoDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const exitDemoMode = () => {
    localStorage.removeItem("demoMode");
    localStorage.removeItem("demoProfile");
    navigate("/");
  };

  const renderStars = (proficiency: number) => {
    return "★".repeat(proficiency) + "☆".repeat(5 - proficiency);
  };

  useEffect(() => {
    const loadDemoProfile = async () => {
      const isDemo = localStorage.getItem("demoMode");
      if (!isDemo) {
        navigate("/");
        return;
      }

      const demoProfile = JSON.parse(localStorage.getItem("demoProfile") || "{}");
      if (!demoProfile || !demoProfile.skills) {
        navigate("/");
        return;
      }

      setData(demoProfile);

      try {
        const res = await fetch("http://localhost:5000/ai/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interest: demoProfile.interest,
            skills: demoProfile.skills
          }),
        });
        const result = await res.json();
        setMatches(result);
      } catch (err) {
        console.error("Error calling AI:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDemoProfile();
  }, [navigate]);

  if (loading) return <div className="loading">Loading demo dashboard...</div>;
  if (!data) return <div className="loading">Demo profile not found</div>;

  const topMatch = matches[0];
  const readinessScore = topMatch?.score || 0;

  return (
    <div className="dashboard" style={{ position: "relative" }}>
      {/* Exit Demo button - top‑right corner */}
      <button onClick={exitDemoMode} className="exit-demo-btn">
         Exit Demo
      </button>

      <h1>Career Dashboard <span className="demo-tag">(Demo)</span></h1>

      {/* PROFILE SECTION */}
      <div className="section">
        <h2>Demo Profile</h2>
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

      {/* CAREER READINESS SCORE */}
      <div className="section">
        <h2>Career Readiness Score</h2>
        <div className="bar">
          <div className="fill" style={{ width: `${readinessScore}%` }} />
        </div>
        <p className="score-text">{readinessScore}% match with your top career</p>
      </div>

      {/* SKILL GAP ANALYSIS */}
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

      {/* TOP CAREER MATCHES */}
      <div className="section">
        <h2>🎯 Top Career Matches</h2>
        {matches.slice(0, 5).map((c: any, i: number) => (
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
              <strong>🧠 Reasoning:</strong> {c.reasoning}
            </div>
            <div className="skill-badges">
              {c.matchedSkills?.map((skill: string, idx: number) => (
                <span key={idx} className="matched-skill">✓ {skill}</span>
              ))}
              {c.missingSkills?.map((skill: string, idx: number) => (
                <span key={idx} className="missing-skill-badge">✗ {skill}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* DEMO FOOTER */}
      <div className="demo-footer">
        <p>🎮 <strong>You're in Demo Mode</strong> — using a sample profile with pre‑loaded skills.</p>
        <p>Create a free account to get personalized results based on your actual skills!</p>
      </div>
    </div>
  );
}

export default DemoDashboard;