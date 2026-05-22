import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface Career {
  id: number;
  name: string;
  description: string;
  interest: string;
  requiredSkills: string[];
  salary_min?: number;
  salary_max?: number;
  certifications?: string[];
  tools?: string[];
}

// Extended form type to include temporary inputs
interface CareerForm extends Partial<Career> {
  skillInput?: string;
  certInput?: string;
  toolInput?: string;
}

function AdminCareers() {
  const { user } = useAuth();
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Career | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CareerForm>({ requiredSkills: [], certifications: [], tools: [], skillInput: "", certInput: "", toolInput: "" });
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
        salary_min: form.salary_min,
        salary_max: form.salary_max,
        certifications: form.certifications || [],
        tools: form.tools || [],
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
      setForm({ requiredSkills: [], certifications: [], tools: [], skillInput: "", certInput: "", toolInput: "" });
      setShowForm(false);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
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

  const addCertification = () => {
    const cert = form.certInput?.trim();
    if (!cert) return;
    const current = form.certifications || [];
    if (current.includes(cert)) {
      setMessage("Certification already added");
      return;
    }
    setForm({
      ...form,
      certifications: [...current, cert],
      certInput: "",
    });
  };

  const removeCertification = (certToRemove: string) => {
    setForm({
      ...form,
      certifications: (form.certifications || []).filter(c => c !== certToRemove),
    });
  };

  const addTool = () => {
    const tool = form.toolInput?.trim();
    if (!tool) return;
    const current = form.tools || [];
    if (current.includes(tool)) {
      setMessage("Tool already added");
      return;
    }
    setForm({
      ...form,
      tools: [...current, tool],
      toolInput: "",
    });
  };

  const removeTool = (toolToRemove: string) => {
    setForm({
      ...form,
      tools: (form.tools || []).filter(t => t !== toolToRemove),
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
            setForm({ requiredSkills: [], certifications: [], tools: [], skillInput: "", certInput: "", toolInput: "" });
            setShowForm(true);
          }}
          className="add-btn"
        >
          + Add Career
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {showForm ? (
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

          {/* Salary Range */}
          <div className="salary-inputs">
            <label>Salary Range (optional)</label>
            <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
              <input
                type="number"
                placeholder="Min"
                value={form.salary_min ?? ""}
                onChange={(e) => setForm({ ...form, salary_min: e.target.value ? parseInt(e.target.value) : undefined })}
              />
              <input
                type="number"
                placeholder="Max"
                value={form.salary_max ?? ""}
                onChange={(e) => setForm({ ...form, salary_max: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* Required Skills */}
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

          {/* Certifications */}
          <div className="list-editor">
            <label>Certifications (optional)</label>
            <div className="skill-input-group">
              <input
                type="text"
                placeholder="e.g., AWS Certified, PMP"
                value={form.certInput || ""}
                onChange={(e) => setForm({ ...form, certInput: e.target.value })}
              />
              <button type="button" onClick={addCertification}>Add</button>
            </div>
            <div className="skill-tags">
              {(form.certifications || []).map(cert => (
                <span key={cert} className="skill-tag">
                  {cert}
                  <button type="button" onClick={() => removeCertification(cert)}>✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Common Tools */}
          <div className="list-editor">
            <label>Common Tools (optional)</label>
            <div className="skill-input-group">
              <input
                type="text"
                placeholder="e.g., Docker, Kubernetes, Figma"
                value={form.toolInput || ""}
                onChange={(e) => setForm({ ...form, toolInput: e.target.value })}
              />
              <button type="button" onClick={addTool}>Add</button>
            </div>
            <div className="skill-tags">
              {(form.tools || []).map(tool => (
                <span key={tool} className="skill-tag">
                  {tool}
                  <button type="button" onClick={() => removeTool(tool)}>✕</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-buttons">
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEditing(null); setShowForm(false); }}>Cancel</button>
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
                <button onClick={() => { setEditing(career); setForm({ ...career, skillInput: "", certInput: "", toolInput: "" }); setShowForm(true); }}>
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