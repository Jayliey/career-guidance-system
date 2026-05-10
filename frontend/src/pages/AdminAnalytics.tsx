import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
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

type CareerMatchStat = {
  name: string;
  value: number;
};

type SkillGap = {
  skill: string;
  count: number;
};

type UserGrowthPoint = {
  month: string;
  users: number;
};

type AnalyticsData = {
  totalUsers: number;
  totalJobs: number;
  userGrowth: UserGrowthPoint[];
  careerMatchesStats: CareerMatchStat[];
  skillGaps: SkillGap[];
};

function AdminAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalJobs: 0,
    userGrowth: [],
    careerMatchesStats: [],
    skillGaps: [],
  });

  const COLORS = ["#4f8cff", "#a855f7", "#ff8c00", "#4caf50", "#ff4d4d"];

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics", {
        headers: { "x-user-id": user.id },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const result = await res.json();
      setData(result);
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
          <div className="value">{data.totalUsers}</div>
        </div>
        <div className="stat-card">
          <h3>Total Jobs</h3>
          <div className="value">{data.totalJobs}</div>
        </div>
        <div className="stat-card">
          <h3>Career Matches</h3>
          <div className="value">
            {data.careerMatchesStats.reduce((sum: number, c: CareerMatchStat) => sum + c.value, 0)}
          </div>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-container">
          <h2>Most Recommended Careers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.careerMatchesStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.careerMatchesStats.map((_, index: number) => (
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
            <LineChart data={data.userGrowth}>
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
          <BarChart data={data.skillGaps}>
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