import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Layout admin fetch error:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(profile?.is_admin === true);
    };
    fetchAdmin();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile menu toggle button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Sidebar – visible on desktop, conditionally on mobile */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo">CareerGuidance</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</NavLink>
          <NavLink to="/my-profile" onClick={() => setMobileMenuOpen(false)}>My Profile</NavLink>
          <NavLink to="/skills" onClick={() => setMobileMenuOpen(false)}>Skills</NavLink>
          <NavLink to="/interests" onClick={() => setMobileMenuOpen(false)}>Interests</NavLink>
          <NavLink to="/matches" onClick={() => setMobileMenuOpen(false)}>Matches</NavLink>
          <NavLink to="/roadmap" onClick={() => setMobileMenuOpen(false)}>Roadmap</NavLink>
          <NavLink to="/job-opportunities" onClick={() => setMobileMenuOpen(false)}>Job Opportunities</NavLink>
          <NavLink to="/chat-assistant" onClick={() => setMobileMenuOpen(false)}>Chat Assistant</NavLink>
          <NavLink to="/settings" onClick={() => setMobileMenuOpen(false)}>Settings</NavLink>
          {isAdmin && (
            <>
              <div className="sidebar-section-title">Admin</div>
              <NavLink to="/admin/jobs" onClick={() => setMobileMenuOpen(false)}>Admin Jobs</NavLink>
              <NavLink to="/admin/learning-paths" onClick={() => setMobileMenuOpen(false)}>Learning Paths</NavLink>
              <NavLink to="/admin/careers" onClick={() => setMobileMenuOpen(false)}>Admin Careers</NavLink>
              <NavLink to="/admin/analytics" onClick={() => setMobileMenuOpen(false)}>Admin Analytics</NavLink>
            </>
          )}
        </nav>
        <button onClick={handleLogout} className="sidebar-logout">Logout</button>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;