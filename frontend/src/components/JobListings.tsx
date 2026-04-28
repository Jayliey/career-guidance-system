import { useState, useEffect } from "react";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  requiredSkills: string[];
  description: string;
  applyUrl: string;
}

function JobListings({
  careerName,
  onClose,
}: {
  careerName: string;
  onClose: () => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerName }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load jobs");
        }

        setJobs(data || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [careerName]);

  return (
    <div className="jobs-modal-overlay" onClick={onClose}>
      <div
        className="jobs-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jobs-header">
          <h2>💼 Job Listings for {careerName}</h2>
          <button className="jobs-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="jobs-content">
          {loading && (
            <div className="jobs-loading">Loading jobs...</div>
          )}

          {error && (
            <div className="jobs-error">⚠️ {error}</div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="jobs-empty">
              No jobs found for this career yet.
            </div>
          )}

          {!loading && !error && jobs.length > 0 && (
            <div className="jobs-list">
              {jobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div className="job-header">
                    <h3>{job.title}</h3>
                    <span className="job-salary">
                      {job.salary}
                    </span>
                  </div>

                  <p className="job-company">
                    {job.company} • {job.location}
                  </p>

                  <p className="job-description">
                    {job.description}
                  </p>

                  <div className="job-skills">
                    <strong>Required Skills:</strong>

                    <div className="job-skills-list">
                      {(job.requiredSkills || []).map(
                        (skill: string) => (
                          <span
                            key={skill}
                            className="job-skill"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="job-apply-btn"
                  >
                    Apply Now →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobListings;