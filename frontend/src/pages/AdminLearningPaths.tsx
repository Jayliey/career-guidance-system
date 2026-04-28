import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
  const [items, setItems] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LearningPath | null>(null);
  const [form, setForm] = useState<Partial<LearningPath>>({});

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    return {
      "Content-Type": "application/json",
      "x-user-id": session.user.id,
    };
  };

  const fetchItems = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("http://localhost:5000/api/admin/learning-paths", { headers });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const headers = await getAuthHeaders();

      const url = editing
        ? `http://localhost:5000/api/admin/learning-paths/${editing.id}`
        : "http://localhost:5000/api/admin/learning-paths";

      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Save failed");

      await fetchItems();
      setEditing(null);

      // ✅ FIX: safe reset (prevents undefined fields)
      setForm({});
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this learning path item?")) return;

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(
        `http://localhost:5000/api/admin/learning-paths/${id}`,
        { method: "DELETE", headers }
      );

      if (!res.ok) throw new Error("Delete failed");

      await fetchItems();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  if (loading) return <div className="loading">Loading learning paths...</div>;

  return (
    <div className="admin-container">
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

      {/* ✅ FIX: correct condition */}
      {editing !== undefined && (
        <div className="admin-form">
          <h3>{editing ? "Edit Item" : "New Item"}</h3>

          <input
            placeholder="Career key (e.g., software engineer)"
            value={form.career_key || ""}
            onChange={(e) =>
              setForm({ ...form, career_key: e.target.value })
            }
          />

          <select
            value={form.period || ""}
            onChange={(e) =>
              setForm({ ...form, period: e.target.value })
            }
          >
            <option value="">Select period</option>
            <option value="shortTerm">Short Term (0-3 months)</option>
            <option value="mediumTerm">Medium Term (3-6 months)</option>
            <option value="longTerm">Long Term (6-12 months)</option>
          </select>

          <input
            placeholder="Skill name"
            value={form.skill || ""}
            onChange={(e) =>
              setForm({ ...form, skill: e.target.value })
            }
          />

          <input
            placeholder="Duration (e.g., 3 weeks)"
            value={form.duration || ""}
            onChange={(e) =>
              setForm({ ...form, duration: e.target.value })
            }
          />

          <input
            placeholder="Resource URL"
            value={form.resource_url || ""}
            onChange={(e) =>
              setForm({ ...form, resource_url: e.target.value })
            }
          />

          <select
            value={form.resource_type || ""}
            onChange={(e) =>
              setForm({ ...form, resource_type: e.target.value })
            }
          >
            <option value="">Select resource type</option>
            <option value="Free">Free</option>
            <option value="Course">Course</option>
            <option value="Certification">Certification</option>
            <option value="Practice">Practice</option>
          </select>

          <input
            type="number"
            placeholder="Display order"
            value={form.display_order || 0}
            onChange={(e) =>
              setForm({
                ...form,
                display_order: parseInt(e.target.value),
              })
            }
          />

          <button onClick={handleSave}>Save</button>
          <button onClick={() => setEditing(null)}>Cancel</button>
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
                <button
                  onClick={() => {
                    setEditing(item);
                    setForm(item);
                  }}
                >
                  Edit
                </button>

                <button onClick={() => handleDelete(item.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminLearningPaths;