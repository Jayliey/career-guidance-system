import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function Interests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const interestOptions = [
    "Technology", "Business", "Science", "Design", "Healthcare",
    "Education", "Finance", "Marketing", "Engineering"
  ];

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchInterests = async () => {
      try {
        const { data: userInterestsData, error: userInterestsError } = await supabase
          .from("user_interests")
          .select("interests(name)")
          .eq("user_id", user.id);

        if (!userInterestsError && Array.isArray(userInterestsData) && userInterestsData.length > 0) {
          const interests = userInterestsData
            .map((row: any) => row.interests?.name)
            .filter((name: string | undefined): name is string => Boolean(name));
          setSelectedInterests(interests);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("interest")
          .eq("email", user.email)
          .single();

        if (error) {
          console.error(error);
        } else if (data && data.interest) {
          let interests: string[] = [];
          if (Array.isArray(data.interest)) {
            interests = data.interest;
          } else if (typeof data.interest === "string") {
            interests = data.interest.split(",").map(s => s.trim()).filter(Boolean);
          }
          setSelectedInterests(interests);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInterests();
  }, [user, navigate]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (selectedInterests.length === 0) {
      setMessage("Please select at least one interest.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ interest: selectedInterests })
        .eq("email", user!.email);
      if (error) {
        setMessage("Error: " + error.message);
      } else {
        setMessage("Interests saved successfully!");
      }
    } catch (err: any) {
      setMessage("Error: " + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) return <div className="loading">Loading interests...</div>;

  return (
    <div className="interests-page">
      <div className="interests-header">
        <h1>Your Interests</h1>
        <p>Select all that apply – these help us personalise your career recommendations.</p>
      </div>

      {message && <div className="interests-message">{message}</div>}

      <div className="interests-grid">
        {interestOptions.map(interest => {
          const isActive = selectedInterests.includes(interest);
          return (
            <div
              key={interest}
              className={`interest-card ${isActive ? "active" : ""}`}
              onClick={() => toggleInterest(interest)}
            >
              <div className="interest-label">{interest}</div>
              {isActive && <div className="interest-check">✓</div>}
            </div>
          );
        })}
      </div>

      <div className="interests-actions">
        <button onClick={handleSave} disabled={saving} className="save-interest-btn">
          {saving ? "Saving..." : "Save Interests"}
        </button>
      </div>
    </div>
  );
}

export default Interests;