import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface Career {
  id: number;
  name: string;
  description: string;
  interest: string;
  requiredSkills: string[];
}

// Extended form type to include temporary skillInput
interface CareerForm extends Partial<Career> {
  skillInput?: string;
}

function AdminCareers() {
  const { user } = useAuth();
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Career | null>(null);
  const [form, setForm] = useState<CareerForm>({ requiredSkills: [], skillInput: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCareers = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:5000/api/admin/careers", {
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Failed to fetch careers");
      const data = await res.json();
      setCareers(data);
    } catch (err: any) {
      console.error(err);
      setMessage("Error loading careers");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.interest) {
      setMessage("Name and interest are required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `http://localhost:5000/api/admin/careers/${editing.id}`
        : "http://localhost:5000/api/admin/careers";
      const method = editing ? "PUT" : "POST";
      const payload = {
        name: form.name,
        description: form.description || "",
        interest: form.interest,
        requiredSkills: form.requiredSkills || [],
      };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage(editing ? "Career updated" : "Career added");
      fetchCareers();
      setEditing(null);
      setForm({ requiredSkills: [], skillInput: "" });
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this career? All associated skills will also be deleted.")) return;
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/careers/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Delete failed");
      setMessage("Career deleted");
      fetchCareers();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const addSkill = () => {
    const skill = form.skillInput?.trim();
    if (!skill) return;
    const currentSkills = form.requiredSkills || [];
    if (currentSkills.includes(skill)) {
      setMessage("Skill already added");
      return;
    }
    setForm({
      ...form,
      requiredSkills: [...currentSkills, skill],
      skillInput: "",
    });
  };

  const removeSkill = (skillToRemove: string) => {
    setForm({
      ...form,
      requiredSkills: (form.requiredSkills || []).filter(s => s !== skillToRemove),
    });
  };

  useEffect(() => {
    fetchCareers();
  }, [user]);

  if (loading) return <div className="loading">Loading careers...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Manage Careers</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ requiredSkills: [], skillInput: "" });
          }}
          className="add-btn"
        >
          + Add Career
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {editing !== null ? (
        <div className="admin-form">
          <h3>{editing ? "Edit Career" : "New Career"}</h3>
          <input
            placeholder="Career name (e.g., DevOps Engineer)"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            placeholder="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            value={form.interest || ""}
            onChange={(e) => setForm({ ...form, interest: e.target.value })}
          >
            <option value="">Select interest area</option>
            <option value="technology">Technology</option>
            <option value="business">Business</option>
            <option value="science">Science</option>
          </select>
          <div className="skills-editor">
            <label>Required Skills</label>
            <div className="skill-input-group">
              <input
                type="text"
                placeholder="Skill name (e.g., docker)"
                value={form.skillInput || ""}
                onChange={(e) => setForm({ ...form, skillInput: e.target.value })}
              />
              <button type="button" onClick={addSkill}>Add</button>
            </div>
            <div className="skill-tags">
              {(form.requiredSkills || []).map(skill => (
                <span key={skill} className="skill-tag">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>✕</button>
                </span>
              ))}
            </div>
          </div>
          <div className="form-buttons">
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Interest</th>
            <th>Required Skills</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {careers.map((career) => (
            <tr key={career.id}>
              <td>{career.name}</td>
              <td>{career.interest}</td>
              <td className="skills-cell">
                {(career.requiredSkills || []).join(", ")}
              </td>
              <td>
                <button onClick={() => { setEditing(career); setForm({ ...career, skillInput: "" }); }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(career.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminCareers;