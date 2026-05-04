import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Password strength checker (basic)
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return "";
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score === 4) return "strong";
    if (score >= 2) return "medium";
    return "weak";
  };
  const strength = getPasswordStrength(newPassword);
  const strengthColor = strength === "strong" ? "#4caf50" : strength === "medium" ? "#ff9800" : "#f44336";

  const reauthenticate = async (password: string) => {
    // We need to verify current password. Supabase does not have a direct "verify password" method,
    // so we attempt to sign in again. If the user is already logged in, this will succeed.
    const { error } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password,
    });
    return !error;
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      setMessage("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setMessage("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setMessage("New password must be different from current password");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    const isAuth = await reauthenticate(currentPassword);
    if (!isAuth) {
      setMessage("Current password is incorrect");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMessage("Error: " + error.message);
    else setMessage("Password updated successfully!");
    setLoading(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEmailChange = async () => {
    if (!currentPassword) {
      setMessage("Please enter your current password");
      return;
    }
    if (!newEmail) {
      setMessage("Please enter a new email");
      return;
    }
    const isAuth = await reauthenticate(currentPassword);
    if (!isAuth) {
      setMessage("Current password is incorrect");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setMessage("Error: " + error.message);
    else setMessage("Verification email sent to the new address. You must confirm it before it becomes active.");
    setLoading(false);
    setCurrentPassword("");
    setNewEmail("");
    setTimeout(() => setMessage(""), 5000);
  };

  const handleDeleteAccount = async () => {
    if (!currentPassword) {
      setMessage("Please enter your current password to delete your account");
      return;
    }
    const isAuth = await reauthenticate(currentPassword);
    if (!isAuth) {
      setMessage("Current password is incorrect");
      return;
    }
    if (!confirm("Are you absolutely sure? This action is permanent and cannot be undone.")) return;
    setLoading(true);
    // Call backend endpoint to delete auth user and profile
    try {
      const res = await fetch("http://localhost:5000/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user!.id,
        },
        body: JSON.stringify({ userId: user!.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion failed");
      await supabase.auth.signOut();
      navigate("/");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your password, email, and account</p>
      </div>

      {message && <div className="settings-message">{message}</div>}

      <div className="settings-section">
        <h2>Change Password</h2>
        <div className="settings-field">
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
          />
        </div>
        <div className="settings-field">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          {newPassword && (
            <div className="password-strength">
              Strength: <span style={{ color: strengthColor }}>{strength}</span>
            </div>
          )}
        </div>
        <div className="settings-field">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
        <button onClick={handlePasswordChange} disabled={loading}>
          Update Password
        </button>
      </div>

      <div className="settings-section">
        <h2>Change Email</h2>
        <div className="settings-field">
          <label>Current Password (required)</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
          />
        </div>
        <div className="settings-field">
          <label>New Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter new email"
          />
        </div>
        <button onClick={handleEmailChange} disabled={loading}>
          Update Email
        </button>
        <p className="settings-note">A verification link will be sent to the new email address. Your email will not change until you verify it.</p>
      </div>

      <div className="settings-section danger-zone">
        <h2>Delete Account</h2>
        <p>This action is permanent and will remove all your data.</p>
        <div className="settings-field">
          <label>Current Password (required)</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password to delete"
          />
        </div>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="danger-btn">
            Delete My Account
          </button>
        ) : (
          <div className="delete-confirm">
            <p>Are you absolutely sure? This cannot be undone.</p>
            <button onClick={handleDeleteAccount} className="danger-btn confirm">
              Yes, delete my account
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;