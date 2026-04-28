import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState<Partial<Job>>({});

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("id");

    if (error) {
      console.error("Fetch error:", error.message);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const payload = {
    ...form,
    required_skills: Array.isArray(form.required_skills)
      ? form.required_skills
      : [],
  };

  if (editing) {
    await supabase.from("jobs").update(payload).eq("id", editing.id);
  } else {
    await supabase.from("jobs").insert([payload]);
  }

  fetchJobs();
  setEditing(null);
  setForm({});
};

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this job?")) return;

    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchJobs();
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  if (loading) return <div>Loading jobs...</div>;

  return (
    <div className="admin-container">
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

      {/* FIXED CONDITION */}
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
            placeholder="Career key"
            value={form.career_key || ""}
            onChange={(e) => setForm({ ...form, career_key: e.target.value })}
          />

          <input
            placeholder="Required skills (comma separated)"
            value={form.required_skills?.join(",") || ""}
            onChange={(e) =>
              setForm({
                ...form,
                required_skills: e.target.value
                  .split(",")
                  .map((s) => s.trim()),
              })
            }
          />

          <textarea
            placeholder="Description"
            value={form.description || ""}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            placeholder="Apply URL"
            value={form.apply_url || ""}
            onChange={(e) =>
              setForm({ ...form, apply_url: e.target.value })
            }
          />

          <button onClick={handleSave}>Save</button>
          <button onClick={() => setEditing(null)}>Cancel</button>
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

                <button onClick={() => handleDelete(job.id)}>
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

export default AdminJobs;