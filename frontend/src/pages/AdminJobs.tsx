import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext"; // 👈 import useAuth

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
  const { user } = useAuth(); // 👈 get current user (for admin id)
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState<Partial<Job>>({});
  const [scraping, setScraping] = useState(false); // 👈 loading state for scrape button

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

  // 👇 New function to trigger job scraping
  const triggerScrape = async () => {
    if (!user) {
      alert("You must be logged in as admin to scrape jobs.");
      return;
    }
    setScraping(true);
    try {
      const response = await fetch("http://localhost:5000/api/admin/scrape-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id, // 👈 required by requireAdmin middleware
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Scrape completed! Added/Updated: ${data.result?.added || 0}, Errors: ${data.result?.errors || 0}`);
        fetchJobs(); // refresh job list after successful scrape
      } else {
        alert(`Scrape failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Scrape error:", error);
      alert("Scrape failed. Check console for details.");
    } finally {
      setScraping(false);
    }
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>Manage Jobs</h1>
        <button
          onClick={triggerScrape}
          disabled={scraping}
          className="scrape-btn"
          style={{
            background: "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {scraping ? "Scraping..." : "🔄 Scrape Jobs Now"}
        </button>
      </div>

      <button
        onClick={() => {
          setEditing(null);
          setForm({});
        }}
        className="add-btn"
      >
        + Add Job
      </button>

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