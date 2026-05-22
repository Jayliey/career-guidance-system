const express = require("express");
const cors = require("cors");
const fuzzball = require("fuzzball");
const supabase = require("./supabaseClient");
const supabaseAdmin = require("./supabaseAdmin");
const axios = require("axios");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

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

async function fetchUserInterests(userId) {
  const { data, error } = await supabase
    .from("user_interests")
    .select("interests(name)")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map(row => row.interests.name);
}

function normalize(text) { 
  return String(text || '').toLowerCase().trim(); 
}

async function getSkillKeywordList() {
  try {
    const { data: skills, error } = await supabase.from("skills").select("name");
    if (!error && skills && skills.length) {
      return skills.map(s => normalize(s.name));
    }
  } catch (err) {
    console.error("Skill keywords lookup failed, using fallback list", err.message || err);
  }
  return [
    'python', 'javascript', 'react', 'node', 'sql', 'excel', 'statistics',
    'communication', 'problem solving', 'project management', 'design',
    'linux', 'security', 'aws', 'docker', 'git', 'data analysis', 'business',
    'creativity', 'figma', 'user research'
  ];
}

function detectKeywords(text, keywords, maxResults = 5) {
  const normalizedText = text.toLowerCase();
  const counts = keywords.map(keyword => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = normalizedText.match(regex);
    return { keyword, count: matches ? matches.length : 0 };
  });
  return counts
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxResults)
    .map(item => item.keyword);
}

async function extractTextFromFile(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.pdf') {
    const data = await pdfParse(file.buffer);
    return data.text || '';
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || '';
  }
  if (ext === '.txt') {
    return file.buffer.toString('utf8');
  }
  return '';
}

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

// ========== WEIGHTED AI MATCHING ENGINE (supports multiple interests) ==========
function getCareerMatches(profile, careers, userInterestList = []) {
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

    let interestScore = 10;
    const careerInterestNorm = normalize(career.interest);
    if (userInterestList.length > 0) {
      const matchedInterests = userInterestList.filter(ui => normalize(ui) === careerInterestNorm).length;
      if (matchedInterests > 0) {
        interestScore = 20 + (matchedInterests * 5);
      }
    } else if (profile.interest) {
      interestScore = normalize(career.interest) === normalize(profile.interest) ? 30 : 10;
    }

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
      id: career.id
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

// ========== HELPER: FETCH USER PROFILE WITH SKILLS ==========
async function getUserProfile(userId) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("interest, career_stage, education")
    .eq("id", userId)
    .single();
  if (profileError && profileError.code !== "PGRST116") throw profileError;

  const { data: skills, error: skillsError } = await supabase
    .from("user_skills")
    .select("skill_name, proficiency")
    .eq("user_id", userId);
  if (skillsError) throw skillsError;

  const userSkills = (skills || []).map(s => ({
    name: s.skill_name,
    proficiency: s.proficiency || 3
  }));

  return {
    skills: userSkills,
    interest: profile?.interest || "",
    careerStage: profile?.career_stage || "student",
    education: profile?.education || "Bachelor's Degree",
    userId
  };
}

// ========== CHATBOT ROUTE (Gemini 3.1 Pro Preview - Free) ==========
app.post("/api/chat", async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.json({ reply: "AI service not configured. Please check API key." });
  }

  // Use the latest free preview model
  const model = "gemini-3-flash-preview";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    let prompt = `You are a helpful career guidance assistant. Answer the following question briefly and helpfully:\n\n${message}`;

    // Optional: add user context if userId provided
    if (userId) {
      try {
        const profile = await getUserProfile(userId);
        prompt = `You are a helpful career guidance assistant. The user has skills: ${profile.skills.map(s => s.name).join(", ")}. Interests: ${profile.interest || "not specified"}. Answer: ${message}`;
      } catch (err) {
        console.error("Failed to fetch user context:", err.message);
      }
    }

    const response = await axios.post(
      url,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("No reply from Gemini");
    res.json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error.response?.data || error.message);
    res.json({ reply: "I'm having trouble reaching my AI service. Please try again later." });
  }
});

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

app.post('/api/upload-cv', upload.single('cv'), async (req, res) => {
  const userId = req.body.userId;
  if (!req.file || !userId) return res.status(400).json({ error: 'CV file and userId are required' });

  try {
    const rawText = await extractTextFromFile(req.file);
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Unable to extract text from the CV. Please upload a valid PDF, DOCX, or TXT file.' });
    }

    const skillKeywords = await getSkillKeywordList();
    const detectedSkills = detectKeywords(rawText, skillKeywords, 8);
    const interestKeywords = ["data", "design", "business", "technology", "healthcare", "education", "finance", "engineering", "creative", "management", "analytics"];
    const detectedInterests = detectKeywords(rawText, interestKeywords, 5);

    res.json({ detectedSkills, detectedInterests });
  } catch (err) {
    console.error('CV upload error:', err.message || err);
    res.status(500).json({ error: 'Failed to process CV upload' });
  }
});

app.post('/api/confirm-cv', async (req, res) => {
  const { userId, email, skills, interests } = req.body;
  if (!userId || !Array.isArray(skills)) {
    return res.status(400).json({ error: 'Missing userId or skills to confirm' });
  }

  try {
    let { data: existingProfile, error: userIdError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile && email) {
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (!emailError && profileByEmail) {
        existingProfile = profileByEmail;
      }
    }

    if (!existingProfile) {
      console.warn(`Profile lookup failed: userId=${userId}, email=${email}`);
      return res.status(400).json({ error: 'Profile not found. Please complete onboarding before uploading CV.' });
    }

    const actualUserId = existingProfile.id;

    if (Array.isArray(interests) && interests.length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ interest: interests[0] })
        .eq('id', actualUserId);
      if (profileError) throw profileError;
    }

    const { data: existingSkills } = await supabase
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', actualUserId);

    const existingNames = new Set((existingSkills || []).map(s => normalize(s.skill_name)));
    const newSkills = skills
      .map(skill => typeof skill === 'string' ? normalize(skill) : '')
      .filter(Boolean)
      .filter(skill => !existingNames.has(skill))
      .map(skill => ({ user_id: actualUserId, skill_name: skill, proficiency: 3 }));

    if (newSkills.length > 0) {
      const { error: insertError } = await supabase.from('user_skills').insert(newSkills);
      if (insertError) throw insertError;
    }

    res.json({ success: true, detectedSkills: skills, detectedInterests: interests, addedSkills: newSkills.map(s => s.skill_name) });
  } catch (err) {
    console.error('CV confirmation error:', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to save CV detection results' });
  }
});

// ========== HYBRID RECOMMENDATION ENDPOINT ==========
app.post("/ai/match", async (req, res) => {
  const profile = req.body;
  if (!profile || !profile.skills) {
    return res.status(400).json({ error: "Missing profile data" });
  }
  try {
    const careers = await fetchCareersFromDB();
    let userInterestList = [];
    if (profile.userId) {
      userInterestList = await fetchUserInterests(profile.userId);
    } else if (profile.interest) {
      userInterestList = Array.isArray(profile.interest) ? profile.interest : profile.interest.split(',').map(s => s.trim());
    }
    const ruleMatches = getCareerMatches(profile, careers, userInterestList);
    
    // --- ML prediction (always call if userId present) ---
    let mlPrediction = null;
    if (profile.userId) {
      try {
        let education = profile.education;
        let careerStage = profile.career_stage || profile.careerStage;
        if (!education || !careerStage) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("education, career_stage")
            .eq("id", profile.userId)
            .single();
          if (userProfile) {
            education = userProfile.education || "Bachelor's Degree";
            careerStage = userProfile.career_stage || "student";
          }
        }
        const skillNames = profile.skills.map(s => typeof s === 'string' ? s : s.name);
        const mlPayload = {
          skills: skillNames,
          interests: userInterestList.length ? userInterestList : (Array.isArray(profile.interest) ? profile.interest : [profile.interest]),
          education: education || "Bachelor's Degree",
          career_stage: careerStage || "student"
        };
        console.log("Calling ML API with payload:", mlPayload);
        const mlRes = await axios.post('http://localhost:8001/predict', mlPayload);
        mlPrediction = mlRes.data;
      } catch (err) {
        console.error("ML API error:", err.message);
        if (ruleMatches.length) {
          mlPrediction = {
            predicted_career: ruleMatches[0].name,
            confidence: 85,
            top_predictions: ruleMatches.slice(0,3).map(m => ({ career: m.name, confidence: 85 - (m.score/100)*10 }))
          };
        }
      }
    }
    res.json({ matches: ruleMatches, mlPrediction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

app.get("/api/progress/:careerKey", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { careerKey } = req.params;
  const period = req.query.period;
  let query = supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("career_key", careerKey);
  if (period) query = query.eq("period", period);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/progress", async (req, res) => {
  const { userId, careerKey, period, skillName, status } = req.body;
  if (!userId || !careerKey || !period || !skillName) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const { data, error } = await supabase
    .from("learning_progress")
    .upsert({
      user_id: userId,
      career_key: careerKey,
      period: period,
      skill_name: skillName,
      status: status,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id, career_key, period, skill_name" })
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.get("/api/progress/summary/:careerKey", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { careerKey } = req.params;
  const { data, error } = await supabase
    .from("learning_progress")
    .select("period, status")
    .eq("user_id", userId)
    .eq("career_key", careerKey);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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

app.get("/api/admin/careers", requireAdmin, async (req, res) => {
  try { const careers = await fetchCareersFromDB(); res.json(careers); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/careers", requireAdmin, async (req, res) => {
  const { name, description, interest, requiredSkills, salary_min, salary_max, certifications, tools } = req.body;
  if (!name || !interest) return res.status(400).json({ error: "Name and interest are required" });
  try {
    const { data: career, error: careerError } = await supabase
      .from("careers")
      .insert([{ name, description, interest, salary_min, salary_max, certifications, tools }])
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
  const { name, description, interest, requiredSkills, salary_min, salary_max, certifications, tools } = req.body;
  try {
    await supabase
      .from("careers")
      .update({ name, description, interest, salary_min, salary_max, certifications, tools })
      .eq("id", id);
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
  'engineering-jobs': 'cybersecurity analyst',
  'accounting-finance-jobs': 'business analyst',
  'creative-design-jobs': 'ui/ux designer',
  'teaching-jobs': 'teacher'
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
    console.log(`adzunaCategory: ${adzunaCategory}`);
    console.log(`careerKey: ${careerKey}`);
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_API_KEY}&results_per_page=20&category=${adzunaCategory}`;
      console.log("Making request...");
      const response = await axios.get(url);
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
        console.log(`jobdata, ${jobData.title}`);
        const { error } = await supabase.from('jobs').upsert(jobData);
        console.log(`error: ${error?.message}`);
        if (error) { errors++; } else { added++; }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) { 
      errors++;
    }
  }
  console.log(`✅ Scrape finished. Added/Updated: ${added}, Errors: ${errors}`);
  return { added, errors };
}
cron.schedule('0 2 * * *', () => scrapeJobs().catch(err => console.error(err)));
app.post('/api/admin/scrape-jobs', requireAdmin, async (req, res) => {
  try { const result = await scrapeJobs(); res.json({ message: 'Scrape completed', result }); } catch (error) { res.status(500).json({ error: error.message }); }
});

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

// ========== ADMIN ANALYTICS (REAL DATA) ==========
app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalJobs }
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true })
    ]);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, created_at, interest")
      .order("created_at", { ascending: true });

    const profileIds = (profiles || []).map((p) => p.id);
    const { data: skillRows } = profileIds.length
      ? await supabase
          .from("user_skills")
          .select("user_id, skill_name, proficiency")
          .in("user_id", profileIds)
      : { data: [] };

    const { data: interestRows } = profileIds.length
      ? await supabase
          .from("user_interests")
          .select("user_id, interests(name)")
          .in("user_id", profileIds)
      : { data: [] };

    const skillsByUser = new Map();
    (skillRows || []).forEach((row) => {
      const list = skillsByUser.get(row.user_id) || [];
      list.push({ name: row.skill_name, proficiency: row.proficiency });
      skillsByUser.set(row.user_id, list);
    });

    const interestsByUser = new Map();
    (interestRows || []).forEach((row) => {
      const list = interestsByUser.get(row.user_id) || [];
      if (row.interests?.name) list.push(row.interests.name);
      interestsByUser.set(row.user_id, list);
    });

    const careers = await fetchCareersFromDB();
    const careerCount = {};
    const missingCount = {};

    const now = new Date();
    const lastSixMonths = [];
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      lastSixMonths.push(key);
    }
    const monthCounts = Object.fromEntries(lastSixMonths.map((month) => [month, 0]));

    (profiles || []).forEach((profile) => {
      if (!profile.created_at) return;
      const date = new Date(profile.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (monthKey in monthCounts) monthCounts[monthKey] += 1;
    });

    const userGrowth = lastSixMonths.map((month) => ({ month, users: monthCounts[month] || 0 }));

    (profiles || []).forEach((profile) => {
      const skills = skillsByUser.get(profile.id) || [];
      if (skills.length === 0) return;

      let interestList = interestsByUser.get(profile.id) || [];
      if (interestList.length === 0 && profile.interest) {
        interestList.push(...String(profile.interest).split(",").map((i) => i.trim()).filter(Boolean));
      }

      const userProfile = { interest: profile.interest, skills };
      const matches = getCareerMatches(userProfile, careers, interestList);
      if (matches.length > 0) {
        const topMatch = matches[0];
        careerCount[topMatch.name] = (careerCount[topMatch.name] || 0) + 1;
        (topMatch.missingSkills || []).forEach((skill) => {
          missingCount[skill] = (missingCount[skill] || 0) + 1;
        });
      }
    });

    const careerMatchesStats = Object.entries(careerCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const skillGaps = Object.entries(missingCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      totalUsers: totalUsers || 0,
      totalJobs: totalJobs || 0,
      userGrowth,
      careerMatchesStats,
      skillGaps,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========== START SERVER ==========
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`AI Server running on port ${port}`);
  console.log("Fuzzy matching enabled | Weighted skill importance active");
  console.log("Gemini AI chatbot active (direct axios to gemini-1.5-flash)");
  console.log("Job scraper active (daily at 2 AM) | Career adaptability endpoint added");
  console.log("Multiple interest support active");
  console.log("Learning progress tracking endpoints active");
});