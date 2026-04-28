import { createClient } from "@supabase/supabase-js";

// 🔐 Replace these with your real Supabase values
const supabaseUrl = "https://kbwvdvcfuofngprovgbs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtid3ZkdmNmdW9mbmdwcm92Z2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzA5NjgsImV4cCI6MjA5MjM0Njk2OH0.M16HhpNDLOeBYA4L6EZsXqsK1VPPrdkB8hUIYg4l1Z0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);