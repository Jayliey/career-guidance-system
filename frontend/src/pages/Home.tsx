import ParticlesBackground from "../components/ParticlesBackground";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data.user);
    };
    checkUser();
  }, []);

  const goToOnboarding = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      alert("Please login or sign up first");
      navigate("/login");
      return;
    }
    navigate("/onboarding");
  };

  const goToDashboard = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      navigate("/login");
      return;
    }
    navigate("/dashboard");
  };

  const goToDemoMode = () => {
    const demoProfile = {
      id: "demo-user-123",
      email: "demo@careerai.com",
      interest: "technology",
      skills: [
        { name: "python", proficiency: 4 },
        { name: "javascript", proficiency: 3 },
        { name: "excel", proficiency: 3 },
        { name: "problem solving", proficiency: 4 },
        { name: "communication", proficiency: 3 }
      ]
    };
    localStorage.setItem("demoMode", "true");
    localStorage.setItem("demoProfile", JSON.stringify(demoProfile));
    navigate("/demo-dashboard");
  };

  return (
    <div className="app">
      <ParticlesBackground />
      <div className="overlay">
        <nav className="navbar">
          <div className="logo">CareerAI</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#demo">Demo</a>
          </div>
          <div className="auth">
            {!isLoggedIn ? (
              <>
                <button className="login" onClick={() => navigate("/login")}>Login</button>
                <button className="signup" onClick={() => navigate("/signup")}>Sign Up</button>
              </>
            ) : (
              <button className="primary" onClick={goToDashboard}>Go to Dashboard</button>
            )}
            <button className="primary" onClick={goToOnboarding}>Start AI Assessment</button>
          </div>
        </nav>

        <section className="hero">
          <h1>Your Career Path, Predicted by AI</h1>
          <p>We analyze your skills, personality, and interests to guide your future career.</p>
          <div className="cta">
            <button className="primary" onClick={goToOnboarding}>Start AI Assessment</button>
            <button className="secondary" onClick={goToDashboard}>View Dashboard</button>
            <button className="demo-btn" onClick={goToDemoMode}>🎮 Try Demo Mode</button>
          </div>
        </section>

        <section className="features" id="features">
          <h2>Why Use CareerAI?</h2>
          <div className="feature-grid">
            <div className="card">
              <h3>AI Career Matching</h3>
              <p>Get top 5 career recommendations based on your skills, interests, and profile.</p>
            </div>
            <div className="card">
              <h3>Skill Gap Analysis</h3>
              <p>Identify missing skills required to reach your dream career.</p>
            </div>
            <div className="card">
              <h3>Career Roadmap</h3>
              <p>Follow a structured path from learning to employment.</p>
            </div>
            <div className="card">
              <h3>AI Chat Assistant</h3>
              <p>Get instant career advice and guidance anytime.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="how-it-works" id="how">
          <h2>How CareerAI Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Profile</h3>
              <p>Sign up and complete your profile with your skills, interests, and experience level.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our AI analyzes your skills and interests using intelligent matching algorithms.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Matches</h3>
              <p>Receive personalized career recommendations with match percentages and AI reasoning.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Identify Gaps</h3>
              <p>See exactly which skills you're missing for your dream career.</p>
            </div>
            <div className="step">
              <div className="step-number">5</div>
              <h3>Follow Roadmap</h3>
              <p>Get a structured learning path with courses and resources to close skill gaps.</p>
            </div>
          </div>
        </section>

        <section className="preview" id="demo">
          <h2>Live AI Career Simulation</h2>
          <div className="preview-card">
            <p>Click "Try Demo Mode" above to see the full AI career matching system in action!</p>
            <div className="demo-skills">
              <p><strong>Demo Profile Includes:</strong></p>
              <ul>
                <li>✓ Python (Advanced)</li>
                <li>✓ JavaScript (Intermediate)</li>
                <li>✓ Excel (Intermediate)</li>
                <li>✓ Problem Solving (Advanced)</li>
                <li>✓ Interest: Technology</li>
              </ul>
            </div>
            <p className="blur">No login required — see personalized results instantly!</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;