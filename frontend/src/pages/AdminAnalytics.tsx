import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient"; // ✅ import supabase
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  totalUsers: number;
  totalJobs: number;
  userGrowth: { month: string; users: number }[];
  careerMatchesStats: { name: string; value: number }[];
  skillGaps: { skill: string; count: number }[];
}

function AdminAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const COLORS = ["#4f8cff", "#a855f7", "#ff8c00", "#4caf50", "#ff4d4d"];

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    // setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics", {
        headers: { "x-user-id": user?.id || "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Analytics error:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const res = await fetch("http://localhost:5000/api/admin/scrape-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": authUser?.id || "",
        },
      });
      const result = await res.json();
      if (res.ok) {
        setScrapeResult(`✅ Added: ${result.result?.added || 0}, Errors: ${result.result?.errors || 0}`);
        // Refresh analytics to show updated job count
        fetchAnalytics();
      } else {
        setScrapeResult(`❌ Error: ${result.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setScrapeResult(`❌ Request failed: ${err.message}`);
    } finally {
      setScraping(false);
      setTimeout(() => setScrapeResult(null), 5000);
    }
  };

  if (loading) return <div className="admin-analytics"><h1>Admin Dashboard</h1><div className="loading">Loading...</div></div>;
  if (error) return <div className="admin-analytics"><h1>Admin Dashboard</h1><div className="error">{error}</div><button onClick={fetchAnalytics}>Retry</button></div>;
  if (!data) return null;

  const { totalUsers, totalJobs, userGrowth, careerMatchesStats, skillGaps } = data;

  return (
    <div className="admin-analytics">
      <h1>Admin Dashboard</h1>

      {/* Scraper test button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button
          onClick={triggerScrape}
          disabled={scraping}
          style={{
            background: "#4f8cff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
          }}
        >
          {scraping ? "Scraping..." : "🧹 Test Job Scraper"}
        </button>
        {scrapeResult && (
          <span style={{ marginLeft: "12px", padding: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "8px" }}>
            {scrapeResult}
          </span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card"><h3>Total Users</h3><div className="value">{totalUsers}</div></div>
        <div className="stat-card"><h3>Total Jobs</h3><div className="value">{totalJobs}</div></div>
        <div className="stat-card"><h3>Career Matches</h3><div className="value">{careerMatchesStats.reduce((s,c)=>s+c.value,0)}</div></div>
      </div>

      {/* Charts Row */}
      <div className="chart-row">
        <div className="chart-container">
          <h2>Most Recommended Careers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={careerMatchesStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {careerMatchesStats.map((_,i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h2>User Growth (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#4f8cff" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-container full-width">
        <h2>Top Missing Skills (Skill Gaps)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={skillGaps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="skill" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#4f8cff" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Action Links – at the bottom, clearly clickable */}
      <div className="admin-quick-links">
        <button className="admin-link-btn" onClick={() => navigate("/admin/jobs")}>📋 Manage Jobs</button>
        <button className="admin-link-btn" onClick={() => navigate("/admin/careers")}>📚 Manage Careers</button>
        <button className="admin-link-btn" onClick={() => navigate("/admin/learning-paths")}>🗺️ Learning Paths</button>
      </div>
    </div>
  );
}

export default AdminAnalytics;