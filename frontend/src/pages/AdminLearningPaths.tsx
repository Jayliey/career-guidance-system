import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface LearningPath {
  id: number;
  career_key: string;
  period: string;
  skill: string;
  duration: string;
  resource_url: string;
  resource_type: string;
  display_order: number;
}

function AdminLearningPaths() {
  const { user } = useAuth();
  const [items, setItems] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LearningPath | null>(null);
  const [form, setForm] = useState<Partial<LearningPath>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchItems = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:5000/api/admin/learning-paths", {
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Failed to fetch learning paths");
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setMessage("Error loading learning paths");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const url = editing
        ? `http://localhost:5000/api/admin/learning-paths/${editing.id}`
        : "http://localhost:5000/api/admin/learning-paths";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage(editing ? "Item updated" : "Item added");
      fetchItems();
      setEditing(null);
      setForm({});
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this learning path item?")) return;
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/learning-paths/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Delete failed");
      setMessage("Item deleted");
      fetchItems();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  if (loading) return <div className="loading">Loading learning paths...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Manage Learning Paths</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm({});
          }}
          className="add-btn"
        >
          + Add Item
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {editing !== null && (
        <div className="admin-form">
          <h3>{editing ? "Edit Item" : "New Item"}</h3>
          <input
            placeholder="Career key (e.g., software engineer)"
            value={form.career_key || ""}
            onChange={(e) => setForm({ ...form, career_key: e.target.value })}
          />
          <select
            value={form.period || ""}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
          >
            <option value="">Select period</option>
            <option value="shortTerm">Short Term (0-3 months)</option>
            <option value="mediumTerm">Medium Term (3-6 months)</option>
            <option value="longTerm">Long Term (6-12 months)</option>
          </select>
          <input
            placeholder="Skill name"
            value={form.skill || ""}
            onChange={(e) => setForm({ ...form, skill: e.target.value })}
          />
          <input
            placeholder="Duration (e.g., 3 weeks)"
            value={form.duration || ""}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
          <input
            placeholder="Resource URL"
            value={form.resource_url || ""}
            onChange={(e) => setForm({ ...form, resource_url: e.target.value })}
          />
          <select
            value={form.resource_type || ""}
            onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
          >
            <option value="">Select resource type</option>
            <option value="Free">Free</option>
            <option value="Course">Course</option>
            <option value="Certification">Certification</option>
            <option value="Practice">Practice</option>
          </select>
          <input
            placeholder="Display order (number)"
            type="number"
            value={form.display_order || 0}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) })}
          />
          <div className="form-buttons">
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Career Key</th>
            <th>Period</th>
            <th>Skill</th>
            <th>Duration</th>
            <th>Type</th>
            <th>Order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.career_key}</td>
              <td>{item.period}</td>
              <td>{item.skill}</td>
              <td>{item.duration}</td>
              <td>{item.resource_type}</td>
              <td>{item.display_order}</td>
              <td>
                <button onClick={() => { setEditing(item); setForm(item); }}>Edit</button>
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminLearningPaths;