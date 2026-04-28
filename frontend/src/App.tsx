import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import DemoDashboard from "./pages/DemoDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminCheck from "./components/AdminCheck";
import AdminJobs from "./pages/AdminJobs";
import AdminLearningPaths from "./pages/AdminLearningPaths";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/demo-dashboard" element={<DemoDashboard />} />

      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/jobs" element={
        <AdminCheck>
          <AdminJobs />
        </AdminCheck>
      } />

      <Route path="/admin/learning-paths" element={
        <AdminCheck>
          <AdminLearningPaths />
        </AdminCheck>
      } />

      <Route path="*" element={<div>404 - Page not found</div>} />
    </Routes>
  );
}

export default App;