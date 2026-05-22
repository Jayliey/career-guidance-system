import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import '@fortawesome/fontawesome-free/css/all.min.css';

interface RoadmapItem {
  id: number;
  skill: string;
  duration: string;
  resource_url: string;
  resource_type: string;
  career_key: string;
  period: string;
  display_order: number;
}

interface RoadmapData {
  shortTerm: RoadmapItem[];
  mediumTerm: RoadmapItem[];
  longTerm: RoadmapItem[];
}

function Roadmap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("shortTerm");
  const [careers, setCareers] = useState<{ name: string; score: number }[]>([]);
  const [selectedCareer, setSelectedCareer] = useState("");

  const fetchMatches = async () => {
    if (!user) return;
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

      const { data: userSkills } = await supabase
        .from("user_skills")
        .select("skill_name, proficiency")
        .eq("user_id", profile.id);

      let skills: { name: string; proficiency: number }[] = [];
      if (userSkills && userSkills.length > 0) {
        skills = userSkills.map(s => ({ name: s.skill_name, proficiency: s.proficiency }));
      } else if (profile.skills && typeof profile.skills === 'string') {
        const skillNames = profile.skills.split(',').map((s: string) => s.trim());
        skills = skillNames.map((name: string) => ({ name, proficiency: 3 }));
      } else if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        skills = profile.skills.map((s: string) => ({ name: s, proficiency: 3 }));
      }

      const res = await fetch("http://localhost:5000/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest: profile.interest, skills }),
      });
      const result = await res.json();
      const matches = result.matches || result;

      if (matches && matches.length > 0) {
        const top8 = matches.slice(0, 8);
        const careerList = top8.map((m: any) => ({ name: m.name, score: m.score }));
        setCareers(careerList);
        setSelectedCareer(careerList[0].name);
      } else {
        setError("No career matches found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load career matches.");
    }
  };

  const fetchRoadmap = async (careerName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerName }),
      });
      const data = await res.json();
      
      console.log("Roadmap data received:", data);
      
      if (!res.ok || data.error) {
        setError(data.error || "Roadmap not available");
        setRoadmap(null);
      } else {
        // The API returns data directly with shortTerm, mediumTerm, longTerm
        setRoadmap({
          shortTerm: data.shortTerm || [],
          mediumTerm: data.mediumTerm || [],
          longTerm: data.longTerm || []
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load roadmap");
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchMatches();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedCareer) {
      fetchRoadmap(selectedCareer);
    }
  }, [selectedCareer]);

  const openResourceLink = (url: string, skillName: string) => {
    if (url && url !== "#" && url !== "" && url !== "(example)") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Fallback to YouTube search
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(skillName + " tutorial")}`;
      window.open(searchUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case "free": return <i className="fas fa-gift" style={{ color: "#10b981" }}></i>;
      case "paid": return <i className="fas fa-dollar-sign" style={{ color: "#f59e0b" }}></i>;
      default: return <i className="fas fa-book"></i>;
    }
  };

  if (careers.length === 0 && !loading && !error)
    return <div className="loading">No career matches found.</div>;

  const renderItems = (items: RoadmapItem[] = []) => (
    <div className="roadmap-items-full">
      {!items || items.length === 0 ? (
        <div className="no-items">
          <i className="fas fa-info-circle"></i>
          <p>No learning resources available for this period yet.</p>
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="roadmap-item-full">
            <div className="roadmap-item-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div className="roadmap-item-content">
              <h4>{item.skill}</h4>
              <div className="roadmap-meta">
                <span className="roadmap-duration-full">
                  <i className="fas fa-clock"></i> {item.duration || "Self-paced"}
                </span>
                <span className="roadmap-type">
                  {getResourceTypeIcon(item.resource_type)}
                  {item.resource_type || "Resource"}
                </span>
              </div>
              <button 
                onClick={() => openResourceLink(item.resource_url, item.skill)} 
                className="roadmap-link-full"
              >
                <i className="fas fa-external-link-alt"></i> Start Learning →
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const tabs = [
    { id: "shortTerm", label: "Short Term (0-3 months)", icon: "fas fa-book-open" },
    { id: "mediumTerm", label: "Medium Term (3-6 months)", icon: "fas fa-chart-line" },
    { id: "longTerm", label: "Long Term (6-12 months)", icon: "fas fa-flag-checkered" },
  ];

  return (
    <div className="roadmap-page">
      <div className="roadmap-header">
        <h1><i className="fas fa-map-signs"></i> Learning Roadmap</h1>
        <div className="roadmap-controls">
          <label><i className="fas fa-briefcase"></i> Select Career:</label>
          <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)}>
            {careers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.score}% match)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <i className="fas fa-spinner fa-pulse"></i> Loading roadmap...
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      
      {!loading && !error && roadmap && (
        <>
          <div className="roadmap-tabs-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`roadmap-tab-full ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={tab.icon}></i> {tab.label}
              </button>
            ))}
          </div>
          <div className="roadmap-content-full">
            {activeTab === "shortTerm" && renderItems(roadmap.shortTerm)}
            {activeTab === "mediumTerm" && renderItems(roadmap.mediumTerm)}
            {activeTab === "longTerm" && renderItems(roadmap.longTerm)}
          </div>
        </>
      )}
    </div>
  );
}

export default Roadmap;