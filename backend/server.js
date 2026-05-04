const express = require("express");
const cors = require("cors");
const fuzzball = require("fuzzball");
const supabase = require("./supabaseClient");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ========== GEMINI AI ==========
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ========== FETCH CAREERS FROM DB (WITH WEIGHTS) ==========
async function fetchCareersFromDB() {
  const { data: careers, error } = await supabase.from("careers").select("*");
  if (error) throw error;
  for (let career of careers) {
    const { data: skills, error: skillError } = await supabase
      .from("career_skills")
      .select("skill_name, weight")
      .eq("career_id", career.id);
    if (skillError) throw skillError;
    career.requiredSkills = skills.map(s => s.skill_name);
    career.skillWeights = {};
    skills.forEach(s => { career.skillWeights[s.skill_name] = s.weight || 3; });
  }
  return careers;
}

function normalize(text) { return text.toLowerCase().trim(); }

// ========== FUZZY MATCHING ==========
function isSkillMatch(userSkill, requiredSkill) {
  const normalizedUser = normalize(userSkill);
  const normalizedRequired = normalize(requiredSkill);
  if (normalizedUser === normalizedRequired) return true;
  const score = fuzzball.ratio(normalizedUser, normalizedRequired);
  return score >= 80;
}

function findMatchingSkills(userSkills, requiredSkills) {
  const matched = [], missing = [];
  requiredSkills.forEach(required => {
    let found = false;
    for (const userSkill of userSkills) {
      if (isSkillMatch(userSkill.name || userSkill, required)) {
        found = true;
        break;
      }
    }
    found ? matched.push(required) : missing.push(required);
  });
  return { matched, missing };
}

// ========== WEIGHTED AI MATCHING ENGINE (ALSO RETURNS CAREER ID) ==========
function getCareerMatches(profile, careers) {
  let userSkillsList = [], userSkillsMap = new Map();
  if (profile.skills.length && typeof profile.skills[0] === 'object') {
    profile.skills.forEach(skill => {
      const skillName = normalize(skill.name);
      userSkillsList.push(skillName);
      userSkillsMap.set(skillName, skill.proficiency || 3);
    });
  } else {
    profile.skills.forEach(skill => {
      const skillName = normalize(skill);
      userSkillsList.push(skillName);
      userSkillsMap.set(skillName, 3);
    });
  }
  const userInterest = normalize(profile.interest);
  const results = careers.map(career => {
    const required = career.requiredSkills.map(normalize);
    const { matched, missing } = findMatchingSkills(userSkillsList, required);
    const weights = career.skillWeights || {};
    let totalWeighted = 0, earnedWeighted = 0;
    required.forEach(reqSkill => {
      const weight = weights[reqSkill] || 3;
      totalWeighted += weight;
      if (userSkillsMap.has(reqSkill)) {
        const proficiency = userSkillsMap.get(reqSkill) || 3;
        earnedWeighted += weight * (proficiency / 5);
      }
    });
    const skillScore = totalWeighted > 0 ? (earnedWeighted / totalWeighted) * 70 : 0;
    const interestScore = normalize(career.interest) === userInterest ? 30 : 10;
    const score = Math.round(skillScore + interestScore);
    const completion = totalWeighted > 0 ? Math.round((earnedWeighted / totalWeighted) * 100) : 0;
    let reasoning = "";
    if (completion >= 80) reasoning = `Excellent match! You have strong proficiency in ${matched.length}/${required.length} required skills.`;
    else if (completion >= 50) reasoning = `Good match — you have ${matched.length}/${required.length} key skills. Improve proficiency for better matches.`;
    else if (completion > 0) reasoning = `Potential match — you have ${matched.length}/${required.length} skills. Focus on: ${missing.join(", ")}.`;
    else reasoning = `Low match — consider learning: ${missing.join(", ")}.`;
    return {
      name: career.name,
      score,
      description: career.description,
      requiredSkills: career.requiredSkills,
      matchedSkills: matched,
      missingSkills: missing,
      completion,
      reasoning,
      id: career.id   // ✅ included for adaptability endpoint
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

// ========== PUBLIC ENDPOINTS ==========
app.post("/api/jobs", async (req, res) => {
  const { careerName } = req.body;
  if (!careerName) return res.status(400).json({ error: "Career name required" });
  try {
    const { data, error } = await supabase.from("jobs").select("*").eq("career_key", careerName.toLowerCase());
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Personalised roadmap (reorders based on user's existing proficiency)
app.post("/api/roadmap", async (req, res) => {
  const { careerName, userSkills } = req.body;
  if (!careerName) return res.status(400).json({ error: "Career name required" });
  try {
    const { data, error } = await supabase
      .from("learning_paths")
      .select("*")
      .eq("career_key", careerName.toLowerCase())
      .order("display_order", { ascending: true });
    if (error) throw error;
    const roadmap = { shortTerm: [], mediumTerm: [], longTerm: [] };
    (data || []).forEach(item => {
      if (item.period === "shortTerm") roadmap.shortTerm.push(item);
      else if (item.period === "mediumTerm") roadmap.mediumTerm.push(item);
      else if (item.period === "longTerm") roadmap.longTerm.push(item);
    });
    // Personalisation: reorder based on user's proficiency (higher first)
    if (userSkills && Array.isArray(userSkills)) {
      const userSkillMap = new Map();
      userSkills.forEach(s => userSkillMap.set(s.name.toLowerCase(), s.proficiency || 3));
      const sortByProximity = (items) => {
        return items.sort((a, b) => {
          const profA = userSkillMap.get(a.skill?.toLowerCase()) || 0;
          const profB = userSkillMap.get(b.skill?.toLowerCase()) || 0;
          return profB - profA;
        });
      };
      roadmap.shortTerm = sortByProximity(roadmap.shortTerm);
      roadmap.mediumTerm = sortByProximity(roadmap.mediumTerm);
      roadmap.longTerm = sortByProximity(roadmap.longTerm);
    }
    res.json(roadmap);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/ai/match", async (req, res) => {
  const profile = req.body;
  if (!profile || !profile.skills || !profile.interest) return res.status(400).json({ error: "Missing profile data" });
  try {
    const careers = await fetchCareersFromDB();
    const results = getCareerMatches(profile, careers);
    res.json(results);
  } catch (err) { res.json([]); }
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
      systemInstruction: { parts: [{ text: "You are a career guidance assistant. Answer only career, job, skill, education, and professional development questions. Keep answers concise (2-3 sentences)." }] }
    });
    const reply = result.response.text();
    res.json({ reply });
  } catch (error) { res.status(500).json({ error: "AI service unavailable" }); }
});

// ========== CAREER ADAPTABILITY SCORE ==========
app.post("/api/adaptability", async (req, res) => {
  const { careerId } = req.body;
  if (!careerId) return res.status(400).json({ error: "Career ID required" });
  try {
    const { data: skills } = await supabase.from("career_skills").select("skill_name").eq("career_id", careerId);
    const skillNames = skills.map(s => s.skill_name);
    const { count: totalCareers } = await supabase.from("careers").select("*", { count: "exact", head: true }).neq("id", careerId);
    if (!totalCareers) return res.json({ adaptabilityScore: 0 });
    let totalOtherOccurrences = 0;
    for (const skill of skillNames) {
      const { count } = await supabase
        .from("career_skills")
        .select("*", { count: "exact", head: true })
        .eq("skill_name", skill)
        .neq("career_id", careerId);
      totalOtherOccurrences += count || 0;
    }
    const maxPossible = skillNames.length * totalCareers;
    const adaptabilityScore = maxPossible ? Math.round((totalOtherOccurrences / maxPossible) * 100) : 0;
    res.json({ adaptabilityScore });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ADMIN MIDDLEWARE ==========
const requireAdmin = async (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (error || !profile || !profile.is_admin) return res.status(403).json({ error: "Admin access required" });
  next();
};

// ========== ADMIN CRUD for CAREERS ==========
app.get("/api/admin/careers", requireAdmin, async (req, res) => {
  try { const careers = await fetchCareersFromDB(); res.json(careers); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/admin/careers", requireAdmin, async (req, res) => {
  const { name, description, interest, requiredSkills } = req.body;
  if (!name || !interest) return res.status(400).json({ error: "Name and interest are required" });
  try {
    const { data: career, error: careerError } = await supabase
      .from("careers")
      .insert([{ name, description, interest }])
      .select()
      .single();
    if (careerError) throw careerError;
    if (requiredSkills && requiredSkills.length) {
      const skillsData = requiredSkills.map(skill => ({ career_id: career.id, skill_name: skill.toLowerCase().trim(), weight: 3 }));
      const { error: skillsError } = await supabase.from("career_skills").insert(skillsData);
      if (skillsError) throw skillsError;
    }
    res.status(201).json(career);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put("/api/admin/careers/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, interest, requiredSkills } = req.body;
  try {
    await supabase.from("careers").update({ name, description, interest }).eq("id", id);
    await supabase.from("career_skills").delete().eq("career_id", id);
    if (requiredSkills && requiredSkills.length) {
      const skillsData = requiredSkills.map(skill => ({ career_id: id, skill_name: skill.toLowerCase().trim(), weight: 3 }));
      await supabase.from("career_skills").insert(skillsData);
    }
    res.json({ message: "Career updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/admin/careers/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try { await supabase.from("careers").delete().eq("id", id); res.json({ message: "Career deleted" }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== OTHER ADMIN CRUD (jobs, learning paths) ==========
app.get("/api/admin/jobs", requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from("jobs").select("*").order("id");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post("/api/admin/jobs", requireAdmin, async (req, res) => {
  const { title, company, location, salary, career_key, required_skills, description, apply_url } = req.body;
  const { data, error } = await supabase.from("jobs").insert([{ title, company, location, salary, career_key, required_skills, description, apply_url }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});
app.put("/api/admin/jobs/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("jobs").update(req.body).eq("id", id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.delete("/api/admin/jobs/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ========== ADMIN CRUD for LEARNING PATHS ==========
app.get("/api/admin/learning-paths", requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from("learning_paths").select("*").order("id");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post("/api/admin/learning-paths", requireAdmin, async (req, res) => {
  const { career_key, period, skill, duration, resource_url, resource_type, display_order } = req.body;
  const { data, error } = await supabase.from("learning_paths").insert([{ career_key, period, skill, duration, resource_url, resource_type, display_order }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});
app.put("/api/admin/learning-paths/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("learning_paths").update(req.body).eq("id", id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.delete("/api/admin/learning-paths/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("learning_paths").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ========== JOB SCRAPING ==========
const categoryMap = {
  'it-jobs': 'software engineer',
  'data-science-jobs': 'data analyst',
  'security-jobs': 'cybersecurity analyst',
  'business-jobs': 'business analyst',
  'design-jobs': 'ui/ux designer'
};
function extractSkills(description) {
  const skillKeywords = ['javascript','react','node','python','sql','excel','statistics','linux','security','communication','analysis','design','java','c++','aws','docker','git','agile'];
  if (!description) return [];
  const lower = description.toLowerCase();
  return skillKeywords.filter(skill => lower.includes(skill));
}
async function scrapeJobs() {
  console.log('🔄 Adzuna job scrape started...');
  let added = 0, errors = 0;
  for (const [adzunaCategory, careerKey] of Object.entries(categoryMap)) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1`;
      const params = {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_API_KEY,
        results_per_page: 20,
        category: adzunaCategory,
        content_type: 'application/json'
      };
      const response = await axios.get(url, { params });
      const jobs = response.data.results;
      if (!jobs || jobs.length === 0) continue;
      for (const job of jobs) {
        const jobData = {
          title: job.title,
          company: job.company?.display_name || 'Unknown',
          location: job.location?.display_name || 'Remote',
          salary: job.salary_min && job.salary_max ? `${job.salary_min} - ${job.salary_max}` : 'Not specified',
          career_key: careerKey,
          required_skills: extractSkills(job.description),
          description: job.description || '',
          apply_url: job.redirect_url,
          created_at: new Date(),
          updated_at: new Date()
        };
        const { error } = await supabase.from('jobs').upsert(jobData, { onConflict: 'title, company' });
        if (error) { errors++; } else { added++; }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) { errors++; }
  }
  console.log(`✅ Scrape finished. Added/Updated: ${added}, Errors: ${errors}`);
  return { added, errors };
}
cron.schedule('0 2 * * *', () => scrapeJobs().catch(err => console.error(err)));
app.post('/api/admin/scrape-jobs', requireAdmin, async (req, res) => {
  try { const result = await scrapeJobs(); res.json({ message: 'Scrape completed', result }); } catch (error) { res.status(500).json({ error: error.message }); }
});

// ========== DELETE AUTH USER ==========
app.post('/api/admin/delete-user', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId || userId !== req.headers['x-user-id']) return res.status(403).json({ error: 'Unauthorized' });
  try {
    await supabase.from('profiles').delete().eq('id', userId);
    const adminSupabase = require('./supabaseAdmin');
    await adminSupabase.auth.admin.deleteUser(userId);
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== START SERVER ==========
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`AI Server running on port ${port}`);
  console.log("Fuzzy matching enabled | Weighted skill importance active");
  console.log("Gemini AI chatbot active | Learning paths personalisation ready");
  console.log("Job scraper active (daily at 2 AM) | Career adaptability endpoint added");
});