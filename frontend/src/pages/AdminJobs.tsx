import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  career_key: string;
  required_skills: string[];
  description: string;
  apply_url: string;
}

function AdminJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState<Partial<Job>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchJobs = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:5000/api/admin/jobs", {
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err: any) {
      console.error(err);
      setMessage("Error loading jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const url = editing
        ? `http://localhost:5000/api/admin/jobs/${editing.id}`
        : "http://localhost:5000/api/admin/jobs";
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
      setMessage(editing ? "Job updated" : "Job added");
      fetchJobs();
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
    if (!confirm("Delete this job?")) return;
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/jobs/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Delete failed");
      setMessage("Job deleted");
      fetchJobs();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  if (loading) return <div className="loading">Loading jobs...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Manage Jobs</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm({});
          }}
          className="add-btn"
        >
          + Add Job
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {editing !== null && (
        <div className="admin-form">
          <h3>{editing ? "Edit Job" : "New Job"}</h3>
          <input
            placeholder="Title"
            value={form.title || ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Company"
            value={form.company || ""}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <input
            placeholder="Location"
            value={form.location || ""}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <input
            placeholder="Salary"
            value={form.salary || ""}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
          />
          <input
            placeholder="Career key (e.g., software engineer)"
            value={form.career_key || ""}
            onChange={(e) => setForm({ ...form, career_key: e.target.value })}
          />
          <input
            placeholder="Required skills (comma separated)"
            value={form.required_skills?.join(",") || ""}
            onChange={(e) =>
              setForm({
                ...form,
                required_skills: e.target.value.split(",").map((s) => s.trim()),
              })
            }
          />
          <textarea
            placeholder="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            placeholder="Apply URL"
            value={form.apply_url || ""}
            onChange={(e) => setForm({ ...form, apply_url: e.target.value })}
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
            <th>Title</th>
            <th>Company</th>
            <th>Career Key</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.title}</td>
              <td>{job.company}</td>
              <td>{job.career_key}</td>
              <td>
                <button
                  onClick={() => {
                    setEditing(job);
                    setForm(job);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(job.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminJobs;