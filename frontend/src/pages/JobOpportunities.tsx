import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
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

function JobOpportunities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [careers, setCareers] = useState<string[]>([]);
  const [selectedCareer, setSelectedCareer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchJobsAndMatches();
  }, [user, navigate]);

  const fetchJobsAndMatches = async () => {
    try {
      // Fetch all jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*");
      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
      setFilteredJobs(jobsData || []);

      // Fetch user's profile using email (to get interest and skills)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("interest, skills, id")
        .eq("email", user!.email)
        .single();
      if (profileError) throw profileError;

      // Fetch user's skills using profile.id
      const { data: userSkills } = await supabase
        .from("user_skills")
        .select("skill_name, proficiency")
        .eq("user_id", profile.id);
      let skills: { name: string; proficiency: number }[] = [];
      if (userSkills && userSkills.length > 0) {
        skills = userSkills.map(s => ({ name: s.skill_name, proficiency: s.proficiency }));
      } else if (profile.skills && typeof profile.skills === 'string') {
        const skillNames = profile.skills.split(',').map((s: string) => s.trim());
        skills = skillNames.map((name: string) => ({ name, proficiency: 3 }));
      }

      const res = await fetch("http://localhost:5000/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest: profile.interest, skills }),
      });
      const matches = await res.json();
      if (matches && matches.length) {
        const careerNames: string[] = matches.map((m: any) => m.name);
        const uniqueCareers: string[] = Array.from(new Set(careerNames));
        const allCareers: string[] = ["all"];
        uniqueCareers.forEach((career: string) => allCareers.push(career));
        setCareers(allCareers);
      } else {
        setCareers(["all"]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...jobs];
    if (selectedCareer !== "all") {
      filtered = filtered.filter(job => job.career_key === selectedCareer.toLowerCase());
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term)
      );
    }
    setFilteredJobs(filtered);
  }, [selectedCareer, searchTerm, jobs]);

  if (loading) return <div className="loading">Loading job opportunities...</div>;

  return (
    <div className="job-opportunities-page">
      <div className="job-ops-header">
        <h1>Job Opportunities</h1>
        <p>Explore jobs matching your career interests</p>
      </div>

      <div className="job-filters">
        <div className="filter-group">
          <label>Filter by Career:</label>
          <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)}>
            {careers.map(career => (
              <option key={career} value={career}>
                {career === "all" ? "All Careers" : career}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="jobs-list-full">
        {filteredJobs.length === 0 ? (
          <div className="no-jobs">No jobs found. Try adjusting filters or add jobs via admin panel.</div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="job-card-full">
              <div className="job-card-header">
                <h3>{job.title}</h3>
                <span className="job-salary">{job.salary}</span>
              </div>
              <p className="job-company">{job.company} • {job.location}</p>
              <p className="job-description">{job.description}</p>
              <div className="job-skills">
                <strong>Required Skills:</strong>
                <div className="job-skills-list">
                  {(job.required_skills || []).map((skill, idx) => (
                    <span key={idx} className="job-skill">{skill}</span>
                  ))}
                </div>
              </div>
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="job-apply-btn">
                Apply Now →
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JobOpportunities;