import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import DemoDashboard from "./pages/DemoDashboard";
import AdminJobs from "./pages/AdminJobs";
import AdminLearningPaths from "./pages/AdminLearningPaths";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCareers from "./pages/AdminCareers";

// New user pages
import MyProfile from "./pages/MyProfile";
import Skills from "./pages/Skills";
import Interests from "./pages/Interests";
import Matches from "./pages/Matches";
import Roadmap from "./pages/Roadmap";
import JobOpportunities from "./pages/JobOpportunities";
import ChatAssistant from "./pages/ChatAssistant";
import Settings from "./pages/Settings";

import Layout from "./components/Layout";

function App() {
  return (
    <Routes>
      {/* Public routes – no sidebar */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/demo-dashboard" element={<DemoDashboard />} />

      {/* Admin routes – no sidebar (separate layout) */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/analytics" element={<Navigate replace to="/admin/dashboard" />} />
      <Route path="/admin/jobs" element={<AdminJobs />} />
      <Route path="/admin/learning-paths" element={<AdminLearningPaths />} />
      <Route path="/admin/careers" element={<AdminCareers />} />

      {/* Protected user routes – with persistent sidebar */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/interests" element={<Interests />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/job-opportunities" element={<JobOpportunities />} />
        <Route path="/chat-assistant" element={<ChatAssistant />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div>404 - Page not found</div>} />
    </Routes>
  );
}

export default App;