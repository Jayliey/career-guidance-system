import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

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

interface ProgressItem {
  skill_name: string;
  status: "not_started" | "in_progress" | "completed";
}

function CareerRoadmap({ careerName, onClose, userSkills, userId }: { 
  careerName: string; 
  onClose: () => void; 
  userSkills?: any[]; 
  userId?: string;
}) {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("shortTerm");
  const [progressMap, setProgressMap] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  // Fetch roadmap and user progress
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch roadmap
        const res = await fetch("http://localhost:5000/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerName, userSkills }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load roadmap");
        setRoadmap(data);

        // Fetch progress if userId is provided
        if (userId) {
          const { data: progressData, error: progressError } = await supabase
            .from("learning_progress")
            .select("skill_name, status")
            .eq("user_id", userId)
            .eq("career_key", careerName.toLowerCase());
          if (!progressError && progressData) {
            const map = new Map();
            progressData.forEach((p: ProgressItem) => map.set(p.skill_name.toLowerCase(), p.status));
            setProgressMap(map);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [careerName, userSkills, userId]);

  const updateStatus = async (skillName: string, period: string, newStatus: string) => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("learning_progress")
        .upsert({
          user_id: userId,
          career_key: careerName.toLowerCase(),
          period: period,
          skill_name: skillName.toLowerCase(),
          status: newStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id, career_key, period, skill_name" });
      if (error) throw error;
      // Update local state
      setProgressMap(prev => new Map(prev).set(skillName.toLowerCase(), newStatus));
    } catch (err) {
      console.error(err);
      alert("Failed to update progress");
    } finally {
      setSaving(false);
    }
  };

  const getStatusCount = (items: RoadmapItem[]) => {
    let total = items.length;
    let completed = 0;
    let inProgress = 0;
    items.forEach(item => {
      const status = progressMap.get(item.skill.toLowerCase());
      if (status === "completed") completed++;
      else if (status === "in_progress") inProgress++;
    });
    return { total, completed, inProgress };
  };

  const renderRoadmapItems = (items: RoadmapItem[], period: string) => {
    const { total, completed, inProgress } = getStatusCount(items);
    const completionPercent = total ? Math.round((completed / total) * 100) : 0;
    const inProgressPercent = total ? Math.round((inProgress / total) * 100) : 0;

    return (
      <div>
        <div className="progress-section">
          <div className="progress-label">
            <span>Progress: {completed}/{total} skills completed</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill-completed" style={{ width: `${completionPercent}%` }} />
            <div className="progress-bar-fill-progress" style={{ width: `${inProgressPercent}%`, left: `${completionPercent}%` }} />
          </div>
        </div>
        <div className="roadmap-items">
          {items.map((item, idx) => {
            const status = progressMap.get(item.skill.toLowerCase()) || "not_started";
            return (
              <div key={idx} className="roadmap-item">
                <div className="roadmap-item-header">
                  <h4>{item.skill}</h4>
                  <span className={`roadmap-type ${item.type?.toLowerCase() || ""}`}>{item.type}</span>
                </div>
                <p className="roadmap-duration">⏱️ {item.duration}</p>
                <a href={item.resource} target="_blank" rel="noopener noreferrer" className="roadmap-link">
                  📚 Learning Resource →
                </a>
                <div className="status-dropdown">
                  <label>Status:</label>
                  <select
                    value={status}
                    onChange={(e) => updateStatus(item.skill, period, e.target.value)}
                    disabled={saving}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "shortTerm", label: "📘 Short Term (0-3 months)" },
    { id: "mediumTerm", label: "📗 Medium Term (3-6 months)" },
    { id: "longTerm", label: "📕 Long Term (6-12 months)" },
  ];

  if (loading) return <div className="loading">Loading roadmap...</div>;
  if (error) return <div className="error-message">⚠️ {error}</div>;

  return (
    <div className="roadmap-modal-overlay" onClick={onClose}>
      <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="roadmap-header">
          <h2>📚 Learning Roadmap for {careerName}</h2>
          <button className="roadmap-close" onClick={onClose}>✕</button>
        </div>

        {roadmap && (
          <>
            <div className="roadmap-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`roadmap-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="roadmap-content">
              {activeTab === "shortTerm" && renderRoadmapItems(roadmap.shortTerm, "shortTerm")}
              {activeTab === "mediumTerm" && renderRoadmapItems(roadmap.mediumTerm, "mediumTerm")}
              {activeTab === "longTerm" && renderRoadmapItems(roadmap.longTerm, "longTerm")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CareerRoadmap;