import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

interface RoadmapItem {
  skill: string;
  duration: string;
  resource: string;
  type: string;
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
        // Take only the top 8 matches
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
      if (!res.ok || data.error) {
        setError(data.error || "Roadmap not available");
        setRoadmap(null);
      } else {
        setRoadmap(data);
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

  if (careers.length === 0 && !loading && !error)
    return <div className="loading">No career matches found.</div>;

  const renderItems = (items: RoadmapItem[] = []) => (
    <div className="roadmap-items-full">
      {items.map((item, idx) => (
        <div key={idx} className="roadmap-item-full">
          <h4>{item.skill}</h4>
          <p className="roadmap-duration-full">⏱️ {item.duration}</p>
          <a href={item.resource} target="_blank" rel="noopener noreferrer" className="roadmap-link-full">
            📚 Learning Resource →
          </a>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: "shortTerm", label: "📘 Short Term (0-3 months)" },
    { id: "mediumTerm", label: "📗 Medium Term (3-6 months)" },
    { id: "longTerm", label: "📕 Long Term (6-12 months)" },
  ];

  return (
    <div className="roadmap-page">
      <div className="roadmap-header">
        <h1>Learning Roadmap</h1>
        <div className="roadmap-controls">
          <label>Select Career: </label>
          <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)}>
            {careers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.score}% match)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading roadmap...</div>}
      {error && <div className="error-message">⚠️ {error}</div>}
      {!loading && !error && roadmap && (
        <>
          <div className="roadmap-tabs-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`roadmap-tab-full ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
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