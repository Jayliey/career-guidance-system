import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface CareerDetails {
  salary_min: number | null;
  salary_max: number | null;
  certifications: string[];
  tools: string[];
  name: string;
  description: string;
}

function CareerDetailsModal({ careerId, careerName, onClose }: { careerId: number; careerName: string; onClose: () => void }) {
  const [details, setDetails] = useState<CareerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("careers")
          .select("salary_min, salary_max, certifications, tools, name, description")
          .eq("id", careerId)
          .maybeSingle();   // ✅ use maybeSingle to avoid 406

        if (error) throw error;
        if (!data) throw new Error("Career not found");
        setDetails(data);
      } catch (err: any) {
        console.error("Error fetching career details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [careerId]);

  if (loading) return <div className="loading">Loading details...</div>;
  if (error) return <div className="error-message">⚠️ {error}</div>;
  if (!details) return <div className="error-message">Details not available</div>;

  const salaryText = details.salary_min && details.salary_max ? `$${details.salary_min} - $${details.salary_max}` : "Not specified";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>📖 {details.name}</h2>
        <p>{details.description}</p>
        <hr />
        <p><strong>💰 Estimated Salary:</strong> {salaryText}</p>
        {details.certifications?.length > 0 && (
          <div><strong>🎓 Recommended Certifications:</strong> {details.certifications.join(", ")}</div>
        )}
        {details.tools?.length > 0 && (
          <div><strong>🛠️ Common Tools:</strong> {details.tools.join(", ")}</div>
        )}
        <div className="modal-buttons">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default CareerDetailsModal;