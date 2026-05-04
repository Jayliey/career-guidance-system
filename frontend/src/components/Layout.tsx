import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Layout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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