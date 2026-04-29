const express = require("express");
const cors = require("cors");
const fuzzball = require("fuzzball");
const supabase = require("./supabaseClient");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();

// ========== INITIALIZE EXPRESS ==========
const app = express();
app.use(cors());
app.use(express.json());

// ========== HEALTH CHECK (for testing) ==========
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ========== INITIALIZE GEMINI AI ==========
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ========== CAREER DATABASE ==========
const careers = [
  {
    name: "Data Analyst",
    requiredSkills: ["excel", "sql", "python", "statistics"],
    interest: "technology",
    description: "Works with data to find insights and patterns."
  },
  {
    name: "Software Engineer",
    requiredSkills: ["javascript", "react", "node", "problem solving"],
    interest: "technology",
    description: "Builds software systems and applications."
  },
  {
    name: "Cybersecurity Analyst",
    requiredSkills: ["networking", "security", "linux", "problem solving"],
    interest: "technology",
    description: "Protects systems from cyber threats."
  },
  {
    name: "Business Analyst",
    requiredSkills: ["communication", "excel", "analysis", "business"],
    interest: "business",
    description: "Analyzes business needs and improves processes."
  },
  {
    name: "UI/UX Designer",
    requiredSkills: ["design", "creativity", "figma", "user research"],
    interest: "technology",
    description: "Designs user-friendly digital experiences."
  }
];

// Helper: normalize text
function normalize(text) {
  return text.toLowerCase().trim();
}

// ========== FUZZY SKILL MATCHING ==========
function isSkillMatch(userSkill, requiredSkill) {
  const normalizedUser = normalize(userSkill);
  const normalizedRequired = normalize(requiredSkill);
  if (normalizedUser === normalizedRequired) return true;
  const score = fuzzball.ratio(normalizedUser, normalizedRequired);
  return score >= 80;
}

function findMatchingSkills(userSkills, requiredSkills) {
  const matched = [];
  const missing = [];
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

// ========== AI MATCHING ENGINE ==========
function getCareerMatches(profile) {
  let userSkillsList = [];
  let userSkillsMap = new Map();
  if (profile.skills.length > 0 && typeof profile.skills[0] === 'object') {
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
    let totalWeight = 0, earnedWeight = 0;
    required.forEach(requiredSkill => {
      totalWeight += 1;
      let matchedSkillName = null;
      for (const userSkill of userSkillsList) {
        if (isSkillMatch(userSkill, requiredSkill)) {
          matchedSkillName = userSkill;
          break;
        }
      }
      if (matchedSkillName) {
        const proficiency = userSkillsMap.get(matchedSkillName) || 3;
        earnedWeight += proficiency / 5;
      }
    });
    const skillScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 70 : 0;
    const interestScore = normalize(career.interest) === userInterest ? 30 : 10;
    const score = Math.round(skillScore + interestScore);
    const completion = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    let reasoning = "";
    if (completion >= 80) {
      reasoning = `Excellent match! You have strong proficiency in ${matched.length}/${required.length} required skills.`;
    } else if (completion >= 50) {
      reasoning = `Good match — you have ${matched.length}/${required.length} key skills. Improve proficiency for better matches.`;
    } else if (completion > 0) {
      reasoning = `Potential match — you have ${matched.length}/${required.length} skills. Focus on: ${missing.join(", ")}.`;
    } else {
      reasoning = `Low match — consider learning: ${missing.join(", ")}.`;
    }
    return {
      name: career.name,
      score,
      description: career.description,
      requiredSkills: career.requiredSkills,
      matchedSkills: matched,
      missingSkills: missing,
      completion,
      reasoning
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

// ========== PUBLIC ENDPOINTS ==========
app.post("/api/jobs", async (req, res) => {
  const { careerName } = req.body;
  if (!careerName) return res.status(400).json({ error: "Career name required" });
  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("career_key", careerName.toLowerCase());
    if (error) {
      console.error("Jobs error:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  } catch (err) {
    console.error("Unexpected jobs error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/roadmap", async (req, res) => {
  const { careerName } = req.body;
  if (!careerName) return res.status(400).json({ error: "Career name required" });
  try {
    const { data, error } = await supabase
      .from("learning_paths")
      .select("*")
      .eq("career_key", careerName.toLowerCase())
      .order("display_order", { ascending: true });
    if (error) {
      console.error("Roadmap error:", error);
      return res.status(500).json({ error: error.message });
    }
    const roadmap = { shortTerm: [], mediumTerm: [], longTerm: [] };
    (data || []).forEach(item => {
      if (item.period === "shortTerm") roadmap.shortTerm.push(item);
      else if (item.period === "mediumTerm") roadmap.mediumTerm.push(item);
      else if (item.period === "longTerm") roadmap.longTerm.push(item);
    });
    res.json(roadmap);
  } catch (err) {
    console.error("Unexpected roadmap error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========== AI MATCH ENDPOINT (with logging and fallback) ==========
app.post("/ai/match", (req, res) => {
  const profile = req.body;
  console.log("📥 /ai/match received profile:", profile);
  if (!profile || !profile.skills || !profile.interest) {
    console.error("❌ Missing fields in profile");
    return res.status(400).json({ error: "Missing profile data" });
  }
  try {
    const results = getCareerMatches(profile);
    console.log("✅ /ai/match returning matches:", results.map(r => r.name));
    res.json(results);
  } catch (err) {
    console.error("🔥 Error in getCareerMatches:", err);
    // Fallback so dashboard doesn't stay empty
    const fallback = careers.map(c => ({
      name: c.name,
      score: 50,
      description: c.description,
      requiredSkills: c.requiredSkills,
      matchedSkills: [],
      missingSkills: c.requiredSkills,
      completion: 0,
      reasoning: "Demo match – please check your profile data."
    }));
    res.json(fallback);
  }
});

// ========== LIVE AI CHATBOT (GEMINI) ==========
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
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
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
  if (error || !profile || !profile.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ========== ADMIN CRUD for JOBS ==========
app.get("/api/admin/jobs", requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from("jobs").select("*").order("id");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/admin/jobs", requireAdmin, async (req, res) => {
  const { title, company, location, salary, career_key, required_skills, description, apply_url } = req.body;
  const { data, error } = await supabase
    .from("jobs")
    .insert([{ title, company, location, salary, career_key, required_skills, description, apply_url }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put("/api/admin/jobs/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("jobs")
    .update(req.body)
    .eq("id", id)
    .select();
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
  const { data, error } = await supabase
    .from("learning_paths")
    .insert([{ career_key, period, skill, duration, resource_url, resource_type, display_order }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put("/api/admin/learning-paths/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("learning_paths")
    .update(req.body)
    .eq("id", id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete("/api/admin/learning-paths/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("learning_paths").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ========== AUTO JOB SCRAPING (Adzuna) ==========
const categoryMap = {
  'it-jobs': 'software engineer',
  'data-science-jobs': 'data analyst',
  'security-jobs': 'cybersecurity analyst',
  'business-jobs': 'business analyst',
  'design-jobs': 'ui/ux designer'
};

function extractSkills(description) {
  const skillKeywords = [
    'javascript', 'react', 'node', 'python', 'sql', 'excel', 'statistics',
    'linux', 'security', 'communication', 'analysis', 'design', 'java', 'c++',
    'aws', 'docker', 'git', 'agile'
  ];
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
        const { error } = await supabase
          .from('jobs')
          .upsert(jobData, { onConflict: 'title, company' });
        if (error) {
          console.error(`Error saving job ${job.title}:`, error.message);
          errors++;
        } else {
          added++;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Failed to scrape category ${adzunaCategory}:`, err.message);
      errors++;
    }
  }
  console.log(`✅ Scrape finished. Added/Updated: ${added}, Errors: ${errors}`);
  return { added, errors };
}

// Schedule daily scrape at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('⏰ Running scheduled job scrape...');
  scrapeJobs().catch(err => console.error('Scheduled scrape failed:', err));
});

// Admin endpoint to manually trigger scrape
app.post('/api/admin/scrape-jobs', requireAdmin, async (req, res) => {
  try {
    const result = await scrapeJobs();
    res.json({ message: 'Scrape completed', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== START SERVER ==========
app.listen(5000, () => {
  console.log("AI Server running on port 5000");
  console.log("Careers available:", careers.map(c => c.name).join(", "));
  console.log("Fuzzy matching enabled");
  console.log("Gemini AI chatbot active on /api/chat");
  console.log("Job scraper active (daily at 2 AM)");
});