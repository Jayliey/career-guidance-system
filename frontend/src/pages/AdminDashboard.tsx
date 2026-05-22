import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "../App.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer, Legend
} from "recharts";
import '@fortawesome/fontawesome-free/css/all.min.css';

interface DashboardStats {
  totalUsers: number;
  totalJobs: number;
  totalSkills: number;
  totalCareers: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  userGrowth: { month: string; users: number }[];
  careerMatchesStats: { name: string; value: number }[];
  skillGaps: { skill: string; count: number }[];
  topSkills: { name: string; count: number }[];
  userInterests: { name: string; count: number }[];
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportDateRange, setReportDateRange] = useState("week");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#ec4899"];

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchDashboardData();
    fetchUsers();
    fetchLocalStats();
  }, [user, navigate]);

  const fetchLocalStats = async () => {
    try {
      // Fetch skills count from database
      const { count: skillsCount } = await supabase
        .from("skills")
        .select("*", { count: "exact", head: true });
      
      // Fetch careers count
      const { count: careersCount } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true });
      
      // Fetch top skills from user_skills
      const { data: topSkillsData } = await supabase
        .from("user_skills")
        .select("skill_name, proficiency")
        .limit(100);
      
      const skillCounts: { [key: string]: number } = {};
      topSkillsData?.forEach(s => {
        skillCounts[s.skill_name] = (skillCounts[s.skill_name] || 0) + 1;
      });
      
      const topSkills = Object.entries(skillCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      setStats(prev => ({
        totalUsers: prev?.totalUsers ?? 0,
        totalJobs: prev?.totalJobs ?? 0,
        totalSkills: skillsCount || 0,
        totalCareers: careersCount || 0,
        activeUsersToday: prev?.activeUsersToday ?? 0,
        newUsersThisWeek: prev?.newUsersThisWeek ?? 0,
        newUsersThisMonth: prev?.newUsersThisMonth ?? 0,
        userGrowth: prev?.userGrowth ?? [],
        careerMatchesStats: prev?.careerMatchesStats ?? [],
        skillGaps: prev?.skillGaps ?? [],
        topSkills,
        userInterests: prev?.userInterests ?? [],
      }));
    } catch (err) {
      console.error("Error fetching local stats:", err);
    }
  };

  const fetchDashboardData = async () => {
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics", {
        headers: { "x-user-id": user?.id || "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStats(json);
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert(`User role updated to ${newRole}`);
    } catch (err: any) {
      alert("Error updating user role: " + err.message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      
      if (error) throw error;
      setUsers(users.filter(u => u.id !== userId));
      alert("User deleted successfully");
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
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
        setScrapeResult(`Added: ${result.result?.added || 0}, Errors: ${result.result?.errors || 0}`);
        fetchDashboardData();
      } else {
        setScrapeResult(`Error: ${result.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setScrapeResult(`Request failed: ${err.message}`);
    } finally {
      setScraping(false);
      setTimeout(() => setScrapeResult(null), 5000);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      let data = [];
      let filename = "";
      
      if (reportDateRange === "users") {
        // Export users data
        const { data: usersData } = await supabase
          .from("profiles")
          .select("email, role, created_at");
        data = usersData || [];
        filename = `users-export.csv`;
      } else if (reportDateRange === "skills") {
        // Export skills data
        const { data: skillsData } = await supabase
          .from("skills")
          .select("name, category");
        data = skillsData || [];
        filename = `skills-export.csv`;
      } else if (reportDateRange === "jobs") {
        // Export jobs data from your API
        const res = await fetch("http://localhost:5000/api/admin/jobs", {
          headers: { "x-user-id": user?.id || "" },
        });
        const jobsData = await res.json();
        data = jobsData;
        filename = `jobs-export.csv`;
      } else {
        // Default analytics export
        data = stats ? [{
          totalUsers: stats.totalUsers,
          totalJobs: stats.totalJobs,
          totalSkills: stats.totalSkills,
          totalCareers: stats.totalCareers,
          newUsersThisWeek: stats.newUsersThisWeek,
          activeUsersToday: stats.activeUsersToday,
          exportDate: new Date().toISOString()
        }] : [];
        filename = `analytics-report-${new Date().toISOString().split("T")[0]}.csv`;
      }
      
      // Convert to CSV
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(","),
          ...data.map((row: Record<string, unknown>) =>
            headers.map(h => JSON.stringify(row[h] ?? "")).join(",")
          )
        ];
        const csv = csvRows.join("\n");
        
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert("Report downloaded successfully!");
      } else {
        alert("No data available for the selected report");
      }
    } catch (err: any) {
      alert("Error generating report: " + err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="admin-container">
      <div className="loading"><i className="fas fa-spinner fa-pulse"></i> Loading dashboard...</div>
    </div>
  );
  
  if (error) return (
    <div className="admin-container">
      <div className="error">{error}</div>
      <button onClick={fetchDashboardData} className="admin-btn">Retry</button>
    </div>
  );

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <h1><i className="fas fa-chalkboard-user"></i> Admin Dashboard</h1>
        <div className="admin-header-actions">
          <button onClick={triggerScrape} disabled={scraping} className="admin-btn">
            <i className="fas fa-cloud-upload-alt"></i> {scraping ? "Scraping..." : "Scrape Jobs"}
          </button>
          <select value={reportDateRange} onChange={(e) => setReportDateRange(e.target.value)} className="admin-select">
            <option value="analytics">Analytics Report</option>
            <option value="users">Users Report</option>
            <option value="skills">Skills Report</option>
            <option value="jobs">Jobs Report</option>
          </select>
          <button onClick={generateReport} disabled={generatingReport} className="admin-btn primary">
            <i className="fas fa-download"></i> {generatingReport ? "Generating..." : "Export Report"}
          </button>
        </div>
      </div>

      {scrapeResult && (
        <div className="admin-message info">
          <i className="fas fa-info-circle"></i> {scrapeResult}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
          <i className="fas fa-chart-line"></i> Overview
        </button>
        <button className={`admin-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
          <i className="fas fa-users"></i> User Management
        </button>
        <button className={`admin-tab ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
          <i className="fas fa-file-alt"></i> Reports
        </button>
        <button className={`admin-tab ${activeTab === "content" ? "active" : ""}`} onClick={() => setActiveTab("content")}>
          <i className="fas fa-database"></i> Content Management
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && stats && (
        <>
          {/* Stats Cards - All in one row */}
          <div className="stats-grid">
            <div className="stat-card">
              <i className="fas fa-users"></i>
              <div className="stat-value">{stats.totalUsers || 0}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <i className="fas fa-briefcase"></i>
              <div className="stat-value">{stats.totalJobs || 0}</div>
              <div className="stat-label">Total Jobs</div>
            </div>
            <div className="stat-card">
              <i className="fas fa-code"></i>
              <div className="stat-value">{stats.totalSkills || 0}</div>
              <div className="stat-label">Skills in DB</div>
            </div>
            <div className="stat-card">
              <i className="fas fa-graduation-cap"></i>
              <div className="stat-value">{stats.totalCareers || 0}</div>
              <div className="stat-label">Career Paths</div>
            </div>
            <div className="stat-card">
              <i className="fas fa-user-plus"></i>
              <div className="stat-value">{stats.newUsersThisWeek || 0}</div>
              <div className="stat-label">New This Week</div>
            </div>
            <div className="stat-card">
              <i className="fas fa-calendar-day"></i>
              <div className="stat-value">{stats.activeUsersToday || 0}</div>
              <div className="stat-label">Active Today</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="chart-row">
            <div className="chart-container">
              <h2><i className="fas fa-chart-line"></i> User Growth</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3340" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1e2a", borderColor: "#252a35" }} />
                  <Area type="monotone" dataKey="users" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <h2><i className="fas fa-chart-pie"></i> Top Career Matches</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={stats.careerMatchesStats || []} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    label={false}
                  >
                    {(stats.careerMatchesStats || []).map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1a1e2a", borderColor: "#252a35" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-row">
            <div className="chart-container">
              <h2><i className="fas fa-chart-bar"></i> Most Common Skills</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topSkills?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3340" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1e2a", borderColor: "#252a35" }} />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <h2><i className="fas fa-exclamation-triangle"></i> Top Missing Skills</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.skillGaps?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3340" />
                  <XAxis dataKey="skill" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1e2a", borderColor: "#252a35" }} />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Tab: User Management */}
      {activeTab === "users" && (
        <div className="admin-users-section">
          <div className="admin-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {usersLoading ? (
            <div className="loading"><i className="fas fa-spinner fa-pulse"></i> Loading users...</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th><i className="fas fa-envelope"></i> Email</th>
                    <th><i className="fas fa-tag"></i> Role</th>
                    <th><i className="fas fa-calendar"></i> Joined</th>
                    <th><i className="fas fa-cog"></i> Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>
                        <select
                          value={u.role || "user"}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="role-select"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => deleteUser(u.id)} className="delete-btn">
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === "reports" && (
        <div className="admin-reports-section">
          <div className="reports-grid">
            <div className="report-card">
              <i className="fas fa-users"></i>
              <h3>User Report</h3>
              <p>Export complete user data including registration dates and roles</p>
              <button onClick={() => { setReportDateRange("users"); generateReport(); }} className="admin-btn">
                <i className="fas fa-download"></i> Export Users CSV
              </button>
            </div>
            <div className="report-card">
              <i className="fas fa-code"></i>
              <h3>Skills Report</h3>
              <p>Export all skills data including categories</p>
              <button onClick={() => { setReportDateRange("skills"); generateReport(); }} className="admin-btn">
                <i className="fas fa-download"></i> Export Skills CSV
              </button>
            </div>
            <div className="report-card">
              <i className="fas fa-briefcase"></i>
              <h3>Jobs Report</h3>
              <p>Export all job listings with details and requirements</p>
              <button onClick={() => { setReportDateRange("jobs"); generateReport(); }} className="admin-btn">
                <i className="fas fa-download"></i> Export Jobs CSV
              </button>
            </div>
            <div className="report-card">
              <i className="fas fa-chart-line"></i>
              <h3>Analytics Report</h3>
              <p>Download detailed analytics with platform statistics</p>
              <button onClick={() => { setReportDateRange("analytics"); generateReport(); }} className="admin-btn">
                <i className="fas fa-download"></i> Export Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Content Management */}
      {activeTab === "content" && (
        <div className="admin-content-section">
          <div className="content-cards">
            <div className="content-card" onClick={() => navigate("/admin/careers")}>
              <i className="fas fa-graduation-cap"></i>
              <h3>Manage Careers</h3>
              <p>Add, edit, or remove career paths and requirements</p>
              <span className="arrow"><i className="fas fa-arrow-right"></i></span>
            </div>
            <div className="content-card" onClick={() => navigate("/admin/jobs")}>
              <i className="fas fa-briefcase"></i>
              <h3>Manage Jobs</h3>
              <p>Add, edit, or remove job listings</p>
              <span className="arrow"><i className="fas fa-arrow-right"></i></span>
            </div>
            <div className="content-card" onClick={() => navigate("/admin/learning-paths")}>
              <i className="fas fa-map-signs"></i>
              <h3>Learning Paths</h3>
              <p>Manage learning resources and paths for careers</p>
              <span className="arrow"><i className="fas fa-arrow-right"></i></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;