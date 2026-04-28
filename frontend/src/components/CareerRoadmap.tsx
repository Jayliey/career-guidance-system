import { useState, useEffect } from "react";

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

function CareerRoadmap({ careerName, onClose }: { careerName: string; onClose: () => void }) {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("shortTerm");

  useEffect(() => {
    const fetchRoadmap = async () => {
      console.log("📡 Fetching roadmap for:", careerName);
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("http://localhost:5000/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerName }),
        });
        const data = await res.json();
        console.log("Roadmap response:", data);
        if (!res.ok || data?.error) {
          setError(data?.error || "Roadmap not available");
          setRoadmap(null);
        } else {
          setRoadmap(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load roadmap");
        setRoadmap(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, [careerName]);

  const renderRoadmapItems = (items: RoadmapItem[] = []) => (
    <div className="roadmap-items">
      {items.map((item, idx) => (
        <div key={idx} className="roadmap-item">
          <div className="roadmap-item-header">
            <h4>{item.skill}</h4>
            <span className={`roadmap-type ${item.type?.toLowerCase() || ""}`}>{item.type}</span>
          </div>
          <p className="roadmap-duration">⏱️ {item.duration}</p>
          <a href={item.resource} target="_blank" rel="noopener noreferrer" className="roadmap-link">
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
    <div className="roadmap-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="roadmap-header">
          <h2>📚 Learning Roadmap for {careerName}</h2>
          <button className="roadmap-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="roadmap-loading">Loading roadmap...</div>}
        {error && (
          <div className="roadmap-error">
            <p>⚠️ {error}</p>
            <p style={{ fontSize: "14px", marginTop: "10px", opacity: 0.7 }}>
              Check back soon for learning resources!
            </p>
          </div>
        )}
        {!loading && !error && roadmap && (
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
              {activeTab === "shortTerm" && renderRoadmapItems(roadmap.shortTerm)}
              {activeTab === "mediumTerm" && renderRoadmapItems(roadmap.mediumTerm)}
              {activeTab === "longTerm" && renderRoadmapItems(roadmap.longTerm)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CareerRoadmap;