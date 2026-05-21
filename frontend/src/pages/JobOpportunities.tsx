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

interface CareerOption {
  name: string;
  score: number;
}

function JobOpportunities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [selectedCareer, setSelectedCareer] = useState("");
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

      // Fetch user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("interest, skills, id")
        .eq("email", user!.email)
        .single();
      if (profileError) throw profileError;

      // Fetch user's skills
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

      // Get career matches from backend
      const res = await fetch("http://localhost:5000/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest: profile.interest, skills }),
      });
      const result = await res.json();
      const matches = result.matches || result;

      // Take only the top 8 matches
      if (matches && matches.length > 0) {
        const top8 = matches.slice(0, 8);
        const careerList = top8.map((m: any) => ({ name: m.name, score: m.score }));
        setCareers(careerList);
        setSelectedCareer(careerList[0].name);
        // Initial filter: jobs for first career
        const initialFiltered = jobsData?.filter(job => job.career_key === careerList[0].name.toLowerCase()) || [];
        setFilteredJobs(initialFiltered);
      } else {
        setCareers([]);
        setFilteredJobs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update filtered jobs when selectedCareer or searchTerm changes
  useEffect(() => {
    if (!selectedCareer) return;
    let filtered = jobs.filter(job => job.career_key === selectedCareer.toLowerCase());
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
          <label>Select Career:</label>
          <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)}>
            {careers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.score}% match)
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
          <div className="no-jobs">No jobs found for this career. Try another career or add jobs via admin panel.</div>
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