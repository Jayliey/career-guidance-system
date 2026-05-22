import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) return alert("Enter email and password");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    // Fetch user's role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", email)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      setLoading(false);
      alert("Error fetching user role. Please contact support.");
      return;
    }

    setLoading(false);

    // Redirect based on role
    if (profile?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      alert("Please enter your email address");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + "/update-password",
    });
    setResetLoading(false);
    if (error) {
      alert(error.message);
    } else {
      alert("Password reset email sent! Check your inbox.");
      setShowResetModal(false);
      setResetEmail("");
    }
  };

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          <h2><i className="fas fa-sign-in-alt"></i> Login</h2>

          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <button onClick={handleLogin} disabled={loading} className="login-btn">
            {loading ? <><i className="fas fa-spinner fa-pulse"></i> Logging...</> : <><i className="fas fa-arrow-right"></i> Login</>}
          </button>

          {/* Forgot password link */}
          <div className="forgot-password">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="forgot-btn"
            >
              <i className="fas fa-key"></i> Forgot password?
            </button>
          </div>
        </div>
      </div>

      {/* Reset password modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3><i className="fas fa-envelope"></i> Reset Password</h3>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
            <input
              type="email"
              placeholder="Your email address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? <><i className="fas fa-spinner fa-pulse"></i> Sending...</> : <><i className="fas fa-paper-plane"></i> Send reset link</>}
              </button>
              <button onClick={() => setShowResetModal(false)}>
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}