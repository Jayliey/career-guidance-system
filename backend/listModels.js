// listModels.js (CommonJS version)
const axios = require("axios");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in .env");
    return;
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const response = await axios.get(url);
    const models = response.data.models;
    console.log("\n✅ Available models for your API key:\n");
    models.forEach(model => {
      const supports = model.supportedGenerationMethods?.join(", ") || "unknown";
      console.log(` - ${model.name} (supports: ${supports})`);
    });
  } catch (error) {
    console.error("❌ Error fetching models:");
    console.error(error.response?.data || error.message);
  }
}

listModels();