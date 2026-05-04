import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function Interests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [interest, setInterest] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchInterest = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("interest")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error(error);
      } else if (data) {
        setInterest(data.interest || "");
      }
      setLoading(false);
    };
    fetchInterest();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!interest) {
      setMessage("Please select an interest area.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ interest })
      .eq("id", user!.id);
    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Interest updated successfully!");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (loading) return <div className="loading">Loading interests...</div>;

  const interests = [
    { value: "technology", label: "Technology", emoji: "💻" },
    { value: "business", label: "Business", emoji: "📊" },
    { value: "science", label: "Science", emoji: "🔬" },
    { value: "design", label: "Design", emoji: "🎨" },
    { value: "healthcare", label: "Healthcare", emoji: "🏥" },
    { value: "education", label: "Education", emoji: "📚" },
  ];

  return (
    <div className="interests-page">
      <div className="interests-header">
        <h1>Your Interests</h1>
        <p>Select the area that best describes your career focus.</p>
      </div>

      {message && <div className="interests-message">{message}</div>}

      <div className="interests-grid">
        {interests.map((item) => (
          <div
            key={item.value}
            className={`interest-card ${interest === item.value ? "active" : ""}`}
            onClick={() => setInterest(item.value)}
          >
            <div className="interest-emoji">{item.emoji}</div>
            <div className="interest-label">{item.label}</div>
            {interest === item.value && <div className="interest-check">✓</div>}
          </div>
        ))}
      </div>

      <div className="interests-actions">
        <button onClick={handleSave} disabled={saving} className="save-interest-btn">
          {saving ? "Saving..." : "Save Interest"}
        </button>
      </div>
    </div>
  );
}

export default Interests;