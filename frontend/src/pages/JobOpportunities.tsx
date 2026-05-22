import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import '@fortawesome/fontawesome-free/css/all.min.css';

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
  career_key: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchJobsAndMatches();
  }, [user, navigate]);

  const normalizeCareerKey = (value: string | null | undefined) => {
    if (!value) return "";
    return value
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  };

  const openApplyLink = (url: string, title: string) => {
    if (url && url !== "#" && url !== "" && url !== "null") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Fallback: Search for the job title on LinkedIn/Indeed
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(title + " job apply")}`;
      if (confirm(`No direct apply link available for "${title}". Would you like to search Google for this job?`)) {
        window.open(searchUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const fetchJobsAndMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all jobs first
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*");
      
      if (jobsError) {
        console.error("Jobs fetch error:", jobsError);
        setError("Failed to fetch jobs");
        throw jobsError;
      }
      
      console.log("Jobs fetched:", jobsData?.length || 0);
      setJobs(jobsData || []);

      // Fetch user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("interest, skills, id")
        .eq("email", user!.email)
        .single();
      
      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

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
        body: JSON.stringify({ 
          userId: user?.id,
          interest: profile.interest, 
          skills 
        }),
      });
      const result = await res.json();
      const matches = result.matches || result;

      console.log("Career matches from backend:", matches?.length || 0);

      // Take only the top 8 matches and map to careers with normalized keys
      if (matches && matches.length > 0) {
        const top8 = matches.slice(0, 8);
        const careerList = top8.map((m: any) => {
          const careerKey = normalizeCareerKey(m.name);
          return { 
            name: m.name, 
            score: m.score,
            career_key: careerKey
          };
        });
        setCareers(careerList);
        
        if (careerList.length > 0) {
          setSelectedCareer(careerList[0].name);
          const normalizedCareerKey = careerList[0].career_key;
          const initialFiltered = jobsData?.filter(job => {
            const jobCareerKey = normalizeCareerKey(job.career_key as string);
            return jobCareerKey === normalizedCareerKey ||
              jobCareerKey.includes(normalizedCareerKey) ||
              normalizedCareerKey.includes(jobCareerKey);
          }) || [];
          setFilteredJobs(initialFiltered);
          console.log(`Filtered jobs for ${careerList[0].name}:`, initialFiltered.length);
        }
      } else {
        console.warn("No career matches found from backend");
        setCareers([]);
        setFilteredJobs([]);
      }
    } catch (err) {
      console.error("Error in fetchJobsAndMatches:", err);
      setError("Error loading data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Update filtered jobs when selectedCareer or searchTerm changes
  useEffect(() => {
    if (!selectedCareer || careers.length === 0) return;
    
    // Find the selected career object
    const selectedCareerObj = careers.find(c => c.name === selectedCareer);
    if (!selectedCareerObj) return;
    const normalizedCareerKey = selectedCareerObj.career_key;
    
    // Filter jobs based on career key
    let filtered = jobs.filter(job => {
      const jobCareerKey = normalizeCareerKey(job.career_key as string);
      return jobCareerKey === normalizedCareerKey ||
        jobCareerKey.includes(normalizedCareerKey) ||
        normalizedCareerKey.includes(jobCareerKey);
    });
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.title?.toLowerCase().includes(term) ||
        job.company?.toLowerCase().includes(term)
      );
    }
    
    setFilteredJobs(filtered);
    console.log(`Filtered ${filtered.length} jobs for ${selectedCareer}`);
  }, [selectedCareer, searchTerm, jobs, careers]);

  if (loading) return (
    <div className="loading">
      <i className="fas fa-spinner fa-pulse"></i> Loading job opportunities...
    </div>
  );

  if (error) return (
    <div className="error-container">
      <i className="fas fa-exclamation-circle"></i>
      <p>{error}</p>
      <button onClick={() => fetchJobsAndMatches()} className="retry-btn">
        <i className="fas fa-sync-alt"></i> Retry
      </button>
    </div>
  );

  return (
    <div className="job-opportunities-page">
      <div className="job-ops-header">
        <h1><i className="fas fa-briefcase"></i> Job Opportunities</h1>
        <p>Explore jobs matching your career interests</p>
      </div>

      <div className="job-filters">
        <div className="filter-group">
          <label><i className="fas fa-chart-line"></i> Select Career:</label>
          <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)}>
            {careers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.score}% match)
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="jobs-summary">
        <i className="fas fa-chart-simple"></i> Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} for {selectedCareer}
      </div>

      <div className="jobs-list-full">
        {filteredJobs.length === 0 ? (
          <div className="no-jobs">
            <i className="fas fa-info-circle"></i>
            <p>No jobs found for this career.</p>
            <p className="no-jobs-hint">Try another career from the dropdown above, or contact the admin to add jobs for this career.</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="job-card-full">
              <div className="job-card-header">
                <h3>{job.title}</h3>
                <span className="job-salary"><i className="fas fa-money-bill-wave"></i> {job.salary || "Not specified"}</span>
              </div>
              <p className="job-company">
                <i className="fas fa-building"></i> {job.company} • 
                <i className="fas fa-location-dot"></i> {job.location || "Remote/Anywhere"}
              </p>
              <p className="job-description">{job.description?.substring(0, 200)}...</p>
              <div className="job-skills">
                <strong><i className="fas fa-code"></i> Required Skills:</strong>
                <div className="job-skills-list">
                  {(job.required_skills || []).map((skill, idx) => (
                    <span key={idx} className="job-skill">{skill}</span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => openApplyLink(job.apply_url, job.title)} 
                className="job-apply-btn"
              >
                Apply Now <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JobOpportunities;