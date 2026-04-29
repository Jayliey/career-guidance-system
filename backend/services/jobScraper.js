// backend/services/jobScraper.js
const axios = require('axios');
const supabase = require('../supabaseClient');

// Map Adzuna categories to your career keys
const categoryMap = {
  'it-jobs': 'software engineer',
  'data-science-jobs': 'data analyst',
  'security-jobs': 'cybersecurity analyst',
  'business-jobs': 'business analyst',
  'design-jobs': 'ui/ux designer',
  'finance-jobs': 'business analyst',      // fallback
  'engineering-jobs': 'software engineer' // fallback
};

// Simple keyword extraction from description (enhance as needed)
function extractSkills(description) {
  const skillKeywords = [
    'javascript', 'react', 'node', 'python', 'sql', 'excel', 'statistics',
    'linux', 'security', 'communication', 'analysis', 'design', 'java', 'c++',
    'aws', 'azure', 'docker', 'kubernetes', 'git', 'agile', 'scrum'
  ];
  const lowerDesc = description.toLowerCase();
  return skillKeywords.filter(skill => lowerDesc.includes(skill));
}

async function scrapeJobs() {
  console.log('🔄 Adzuna job scrape started...');
  const results = { added: 0, updated: 0, errors: 0 };

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
          required_skills: extractSkills(job.description || ''),
          description: job.description || '',
          apply_url: job.redirect_url,
          created_at: new Date(),
          updated_at: new Date()
        };

        // Upsert – avoid duplicates based on title + company
        const { error } = await supabase
          .from('jobs')
          .upsert(jobData, { onConflict: 'title, company' });

        if (error) {
          console.error(`Error saving job: ${job.title}`, error.message);
          results.errors++;
        } else {
          results.added++;
        }
      }
      // Be kind to Adzuna API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Failed to scrape category ${adzunaCategory}:`, err.message);
      results.errors++;
    }
  }
  console.log(`✅ Scrape finished. Added/Updated: ${results.added}, Errors: ${results.errors}`);
  return results;
}

module.exports = { scrapeJobs };