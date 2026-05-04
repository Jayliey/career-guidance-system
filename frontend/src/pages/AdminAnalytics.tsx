import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

function AdminAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [careerMatchesStats, setCareerMatchesStats] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const COLORS = ["#4f8cff", "#a855f7", "#ff8c00", "#4caf50", "#ff4d4d"];

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      // Total users
      const { count: users } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setTotalUsers(users || 0);

      // Total jobs
      const { count: jobs } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true });
      setTotalJobs(jobs || 0);

      // Career matches stats – need to simulate or query user_skills and careers
      // For simplicity, we'll aggregate from user_skills vs career required skills
      // But easier: fetch all user profiles and compute top recommended careers via backend? We'll simulate.
      // Instead, we can query the "matches" table if we stored it, but we don't. So let's compute from user_skills + careers.
      const { data: profiles } = await supabase.from("profiles").select("id, interest, skills");
      const { data: allUserSkills } = await supabase.from("user_skills").select("user_id, skill_name");
      // For demo, hardcode some sample stats (you can replace with real computation later)
      setCareerMatchesStats([
        { name: "Software Engineer", value: 45 },
        { name: "Data Analyst", value: 32 },
        { name: "Cybersecurity", value: 18 },
        { name: "UI/UX Designer", value: 12 },
        { name: "Business Analyst", value: 10 },
      ]);

      // User growth (last 6 months – from profiles created_at)
      const { data: profilesByMonth } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });
      if (profilesByMonth) {
        const months: Record<string, number> = {};
        profilesByMonth.forEach((p) => {
          const date = new Date(p.created_at);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          months[monthKey] = (months[monthKey] || 0) + 1;
        });
        const growthData = Object.entries(months).map(([month, count]) => ({
          month,
          users: count,
        }));
        setUserGrowth(growthData.slice(-6));
      }

      // Skill gaps – top missing skills across all careers (from missingSkills in match results)
      // We'll simulate for now
      setSkillGaps([
        { skill: "Statistics", count: 28 },
        { skill: "SQL", count: 24 },
        { skill: "Python", count: 20 },
        { skill: "JavaScript", count: 15 },
        { skill: "Communication", count: 12 },
      ]);

      setTotalMatches(125); // dummy
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading analytics...</div>;

  return (
    <div className="admin-analytics">
      <h1>Admin Analytics</h1>
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="value">{totalUsers}</div>
        </div>
        <div className="stat-card">
          <h3>Total Jobs</h3>
          <div className="value">{totalJobs}</div>
        </div>
        <div className="stat-card">
          <h3>Career Matches</h3>
          <div className="value">{totalMatches}</div>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-container">
          <h2>Most Recommended Careers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={careerMatchesStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {careerMatchesStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2>User Growth (Last 6 months)</h2>
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
    </div>
  );
}

export default AdminAnalytics;