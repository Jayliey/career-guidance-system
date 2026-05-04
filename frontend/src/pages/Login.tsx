import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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
    setLoading(false);
    if (error) alert(error.message);
    else navigate("/dashboard");
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
          <h2>Login</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={handleLogin} disabled={loading}>
            {loading ? "Logging..." : "Login"}
          </button>

          {/* Forgot password link */}
          <div className="forgot-password">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="forgot-btn"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>

      {/* Reset password modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
            <input
              type="email"
              placeholder="Your email address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? "Sending..." : "Send reset link"}
              </button>
              <button onClick={() => setShowResetModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}