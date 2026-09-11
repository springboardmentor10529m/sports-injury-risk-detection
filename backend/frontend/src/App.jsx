import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import "./App.css";
import API_BASE from "./config/api";
import {
  parseErrorMessage,
  validateRegistration,
  validateAthleteProfile,
  normalizePhone,
} from "./utils/validation";

function App() {
  const [page, setPage] = useState("home");

  // =========================
  // REGISTER
  // =========================

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "athlete",
  });

  const [registerMessage, setRegisterMessage] = useState(null); // { type, text }

  // =========================
  // LOGIN
  // =========================

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [loginMessage, setLoginMessage] = useState(null); // { type, text }

  // =========================
  // ATHLETE PROFILE
  // =========================

  const [athleteData, setAthleteData] = useState({
    user_id: "",
    name: "",
    sport: "",
    position: "",
    age: "",
    height: "",
    weight: "",
    training_load: "",
    flexibility: "",
    strength: "",
    balance: "",
    endurance: "",
    training_level: "Intermediate",
    gender: "Male",
    coach_notes: "",
  });

  const [athleteMessage, setAthleteMessage] = useState(null); // { type, text }
  const [priorInjuries, setPriorInjuries] = useState([]);
  const [injuryForm, setInjuryForm] = useState({
    body_part: "Knee",
    injury_type: "ACL / Ligament Strain",
    severity: "Moderate",
    months_ago: "6",
    fully_recovered: 1,
    notes: "",
  });


  // Restore session from localStorage on refresh
  useEffect(() => {
    const restoreSession = async () => {
      const storedUserId = localStorage.getItem("user_id");
      if (!storedUserId) return;

      try {
        const athleteRes = await fetch(`${API_BASE}/athlete/${storedUserId}`);
        if (athleteRes.ok) {
          const athleteInfo = await athleteRes.json();
          if (athleteInfo?.athlete_id) {
            localStorage.setItem("athlete_id", athleteInfo.athlete_id);
          }
          setAthleteData((previous) => ({
            ...previous,
            ...athleteInfo,
            user_id: storedUserId,
          }));
          setPage("dashboard");
        } else {
          setAthleteData((previous) => ({
            ...previous,
            user_id: storedUserId,
          }));
          setPage("athlete");
        }
      } catch (error) {
        console.error("Session restore error:", error);
      }
    };

    restoreSession();
  }, []);

  // =========================
  // REGISTER
  // =========================

  const handleRegister = async (e) => {
    e.preventDefault();

    setRegisterMessage({ type: "info", text: "Creating your account..." });

    const validationError = validateRegistration(registerData);
    if (validationError) {
      setRegisterMessage({ type: "error", text: validationError });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...registerData,
          email: registerData.email.trim().toLowerCase(),
          phone: normalizePhone(registerData.phone),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.user_id) {
        setRegisterMessage({
          type: "success",
          text: "Account created successfully! Redirecting to athlete profile setup..."
        });

        // Save user ID in storage & state
        localStorage.setItem("user_id", data.user_id);

        setAthleteData((previous) => ({
          ...previous,
          user_id: data.user_id,
          name: registerData.name || "",
        }));

        // Seamlessly move to Athlete Profile setup
        setTimeout(() => {
          setPage("athlete");
          setRegisterMessage(null);
        }, 700);
      } else {
        const errorText = parseErrorMessage(data, "Registration failed. Please check your details.");
        setRegisterMessage({ type: "error", text: errorText });
      }
    } catch (error) {
      console.error("Register error:", error);
      setRegisterMessage({
        type: "error",
        text: "Unable to connect to the server. Please make sure the backend is running on port 8000."
      });
    }
  };

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginMessage({ type: "info", text: "Signing you in..." });

    try {
      const formData = new URLSearchParams();
      formData.append("email", loginData.email);
      formData.append("password", loginData.password);

      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.user_id) {
        localStorage.setItem("user_id", data.user_id);
        setLoginMessage({ type: "success", text: `Welcome back, ${data.name}!` });

        let targetPage = "athlete";
        let existingAthleteInfo = null;

        // Check if athlete profile already exists
        try {
          const athleteRes = await fetch(`${API_BASE}/athlete/${data.user_id}`);
          if (athleteRes.ok) {
            existingAthleteInfo = await athleteRes.json();
            if (existingAthleteInfo?.athlete_id) {
              localStorage.setItem("athlete_id", existingAthleteInfo.athlete_id);
              targetPage = "dashboard";
            }
          }
        } catch (athleteErr) {
          console.error("Athlete profile fetch error:", athleteErr);
        }

        setAthleteData((previous) => ({
          ...previous,
          ...(existingAthleteInfo || {}),
          user_id: data.user_id,
          name: data.name || previous.name || "",
        }));

        setTimeout(() => {
          setPage(targetPage);
          setLoginMessage(null);
        }, 600);
      } else {
        const errorText = parseErrorMessage(data, "Invalid email or password.");
        setLoginMessage({ type: "error", text: errorText });
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginMessage({
        type: "error",
        text: "Unable to connect to the server. Please make sure the backend is running on port 8000."
      });
    }
  };

  // =========================
  // ATHLETE SUBMIT
  // =========================

  const handleAthleteSubmit = async (e) => {
    e.preventDefault();

    setAthleteMessage({ type: "info", text: "Saving athlete profile..." });

    const validationError = validateAthleteProfile(athleteData);
    if (validationError) {
      setAthleteMessage({ type: "error", text: validationError });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/athlete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: athleteData.user_id,
          sport: athleteData.sport,
          position: athleteData.position,
          age: Number(athleteData.age),
          height: Number(athleteData.height),
          weight: Number(athleteData.weight),
          training_load: Number(athleteData.training_load),
          flexibility: Number(athleteData.flexibility),
          strength: Number(athleteData.strength),
          balance: Number(athleteData.balance),
          endurance: Number(athleteData.endurance),
          training_level: athleteData.training_level || "Intermediate",
          gender: athleteData.gender || "Male",
          coach_notes: athleteData.coach_notes,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.athlete_id) {
        localStorage.setItem("athlete_id", data.athlete_id);
        setAthleteData((prev) => ({
          ...prev,
          athlete_id: data.athlete_id,
        }));

        // Persist any logged prior injuries
        for (const inj of priorInjuries) {
          try {
            await fetch(`${API_BASE}/athlete/${data.athlete_id}/injuries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                athlete_id: data.athlete_id,
                injury_type: inj.injury_type,
                body_part: inj.body_part,
                severity: inj.severity || "Moderate",
                months_ago: Number(inj.months_ago) || 0,
                fully_recovered: Number(inj.fully_recovered) || 1,
                notes: inj.notes || "",
              }),
            });
          } catch (e) {
            console.warn("Could not save injury history:", e);
          }
        }

        setAthleteMessage({
          type: "success",
          text: "Profile saved successfully! Loading your dashboard..."
        });

        setTimeout(() => {
          setAthleteMessage(null);
          setPage("dashboard");
        }, 700);
      } else {
        const errorText = parseErrorMessage(data, "Unable to save your profile.");
        setAthleteMessage({ type: "error", text: errorText });
      }
    } catch (error) {
      console.error("Athlete submit error:", error);
      setAthleteMessage({
        type: "error",
        text: "Unable to connect to the server. Please make sure the backend is running on port 8000."
      });
    }
  };

  // =========================
  // ATHLETE INPUT CHANGE
  // =========================

  const handleAthleteChange = (e) => {
    setAthleteData({
      ...athleteData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // NAVIGATION
  // =========================

  const goTo = (destination) => {
    setPage(destination);
    setRegisterMessage(null);
    setLoginMessage(null);
    setAthleteMessage(null);
  };

  // =========================
  // RESET / LOGOUT
  // =========================

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("athlete_id");
    localStorage.removeItem("latest_prediction_id");
    localStorage.removeItem("latest_recommendation_id");

    setLoginData({
      email: "",
      password: "",
    });

    setAthleteData({
      user_id: "",
      name: "",
      sport: "",
      position: "",
      age: "",
      height: "",
      weight: "",
      training_load: "",
      flexibility: "",
      strength: "",
      balance: "",
      endurance: "",
      training_level: "Intermediate",
      gender: "Male",
      coach_notes: "",
    });

    setPage("home");
  };

  // =========================
  // HOME PAGE
  // =========================

  const renderHome = () => (
    <main className="home-page">
      <section className="hero">

        <div className="hero-content">

          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            SMART ATHLETE SAFETY PLATFORM
          </div>

          <h1>
            Train harder.
            <br />
            <span>Move smarter.</span>
          </h1>

          <p className="hero-description">
            Understand your performance, analyze movement,
            identify potential injury risks, and get
            personalized recommendations designed around
            your athletic profile.
          </p>

          <div className="hero-actions">

            <button
              className="btn btn-primary btn-large"
              onClick={() => goTo("register")}
            >
              Get started
              <span>→</span>
            </button>

            <button
              className="btn btn-secondary btn-large"
              onClick={() => goTo("login")}
            >
              I already have an account
            </button>

          </div>

          <div className="trust-row">

            <div className="trust-item">
              <strong>01</strong>
              <span>Athlete profile</span>
            </div>

            <div className="trust-divider"></div>

            <div className="trust-item">
              <strong>02</strong>
              <span>Performance data</span>
            </div>

            <div className="trust-divider"></div>

            <div className="trust-item">
              <strong>03</strong>
              <span>Risk insights</span>
            </div>

          </div>

        </div>

        <div className="hero-visual">

          <div className="athlete-card">

            <div className="card-top">

              <div>
                <span className="small-label">
                  ATHLETE OVERVIEW
                </span>

                <h3>
                  Performance Monitor
                </h3>
              </div>

              <div className="status-pill">
                <span></span>
                Active
              </div>

            </div>

            <div className="visual-metrics">

              <div className="metric-card">

                <span>
                  Movement quality
                </span>

                <strong>78%</strong>

                <div className="metric-bar">
                  <div
                    style={{
                      width: "78%",
                    }}
                  ></div>
                </div>

              </div>

              <div className="metric-card">

                <span>
                  Balance
                </span>

                <strong>82%</strong>

                <div className="metric-bar">
                  <div
                    style={{
                      width: "82%",
                    }}
                  ></div>
                </div>

              </div>

            </div>

            <div className="risk-preview">

              <div>

                <span className="small-label">
                  CURRENT RISK
                </span>

                <strong>Low</strong>

                <p>
                  Keep your current training routine.
                </p>

              </div>

              <div className="risk-score">
                30
                <span>/100</span>
              </div>

            </div>

          </div>

          <div className="floating-stat floating-one">
            <span>✓</span>
            Personalized insights
          </div>

          <div className="floating-stat floating-two">
            <span>↗</span>
            Track your progress
          </div>

        </div>

      </section>

      <section className="features-section">

        <div className="section-heading">

          <span className="section-kicker">
            HOW IT WORKS
          </span>

          <h2>
            Everything you need to train with confidence.
          </h2>

          <p>
            A simple workflow designed to make athlete
            monitoring easier.
          </p>

        </div>

        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-number">
              01
            </div>

            <div className="feature-icon">
              👤
            </div>

            <h3>
              Build your profile
            </h3>

            <p>
              Tell us about your sport, physical metrics,
              training load and athletic background.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-number">
              02
            </div>

            <div className="feature-icon">
              🎥
            </div>

            <h3>
              Upload your movement
            </h3>

            <p>
              Upload training videos so your movement
              performance can be evaluated.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-number">
              03
            </div>

            <div className="feature-icon">
              📊
            </div>

            <h3>
              Understand your risk
            </h3>

            <p>
              View performance insights, injury-risk
              indicators and personalized recommendations.
            </p>

          </div>

        </div>

      </section>
    </main>
  );

  // =========================
  // LOGIN PAGE
  // =========================

  const renderLogin = () => (
    <main className="auth-page">

      <div className="auth-layout">

        <div className="auth-info">

          <div className="eyebrow">
            ATHLETE PLATFORM
          </div>

          <h1>
            Welcome back.
            <br />
            <span>Let's keep moving.</span>
          </h1>

          <p>
            Sign in to access your athlete profile,
            performance data and injury-risk insights.
          </p>

          <div className="auth-benefits">

            <div>
              <span>✓</span>
              Secure athlete profile
            </div>

            <div>
              <span>✓</span>
              Performance tracking
            </div>

            <div>
              <span>✓</span>
              Personalized recommendations
            </div>

          </div>

        </div>

        <form
          className="auth-card"
          onSubmit={handleLogin}
        >

          <div className="auth-card-header">

            <div className="auth-icon">
              →
            </div>

            <div>

              <h2>
                Sign in
              </h2>

              <p>
                Enter your account details below.
              </p>

            </div>

          </div>

          <div className="field">

            <label>
              Email address
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  email: e.target.value,
                })
              }
              required
            />

          </div>

          <div className="field">

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  password: e.target.value,
                })
              }
              required
            />

          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
          >
            Sign in
            <span>→</span>
          </button>

          {loginMessage && (
            <div className={`feedback ${loginMessage.type || "info"}`}>
              {loginMessage.text || loginMessage}
            </div>
          )}

          <div className="auth-switch">

            Don't have an account?

            <button
              type="button"
              onClick={() =>
                goTo("register")
              }
            >
              Create one
            </button>

          </div>

        </form>

      </div>

    </main>
  );

  // =========================
  // REGISTER PAGE
  // =========================

  const renderRegister = () => (
    <main className="auth-page">

      <div className="auth-layout">

        <div className="auth-info">

          <div className="eyebrow">
            START YOUR JOURNEY
          </div>

          <h1>
            Your performance.
            <br />
            <span>Your insights.</span>
          </h1>

          <p>
            Create your athlete account and start building
            a personalized profile for smarter training.
          </p>

          <div className="registration-steps">

            <div className="registration-step active">

              <strong>
                01
              </strong>

              <div>

                <b>
                  Create account
                </b>

                <span>
                  Basic account information
                </span>

              </div>

            </div>

            <div className="registration-step">

              <strong>
                02
              </strong>

              <div>

                <b>
                  Build your profile
                </b>

                <span>
                  Sport and physical metrics
                </span>

              </div>

            </div>

            <div className="registration-step">

              <strong>
                03
              </strong>

              <div>

                <b>
                  Start tracking
                </b>

                <span>
                  Performance and risk insights
                </span>

              </div>

            </div>

          </div>

        </div>

        <form
          className="auth-card"
          onSubmit={handleRegister}
        >

          <div className="auth-card-header">

            <div className="auth-icon">
              +
            </div>

            <div>

              <h2>
                Create account
              </h2>

              <p>
                It only takes a minute.
              </p>

            </div>

          </div>

          <div className="field">

            <label>
              Full name
            </label>

            <input
              type="text"
              placeholder="Your full name"
              value={registerData.name}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  name: e.target.value,
                })
              }
              required
            />

          </div>

          <div className="field">

            <label>
              Email address
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={registerData.email}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  email: e.target.value,
                })
              }
              required
            />

          </div>

          <div className="field">

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Create a password (min 8 characters)"
              value={registerData.password}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  password: e.target.value,
                })
              }
              required
              minLength={8}
            />

          </div>

          <div className="field">

            <label>
              Phone number
            </label>

            <input
              type="tel"
              placeholder="10-digit mobile (starts with 6-9)"
              value={registerData.phone}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  phone: e.target.value,
                })
              }
              required
              minLength={10}
              maxLength={15}
              pattern="[6789][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
            />

          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
          >
            Create account
            <span>→</span>
          </button>

          {registerMessage && (
            <div className={`feedback ${registerMessage.type || "info"}`}>
              {registerMessage.text || registerMessage}
            </div>
          )}

          <div className="auth-switch">

            Already have an account?

            <button
              type="button"
              onClick={() =>
                goTo("login")
              }
            >
              Sign in
            </button>

          </div>

        </form>

      </div>

    </main>
  );

  // =========================
  // ATHLETE PROFILE PAGE
  // =========================

  const renderAthlete = () => (
    <main className="profile-page">

      <div className="profile-wrapper">

        <div className="profile-heading">

          <div>

            <div className="eyebrow">
              ATHLETE PROFILE
            </div>

            <h1>
              Let's build your profile.
            </h1>

            <p>
              These details help us understand your
              athletic background and training condition.
            </p>

          </div>

          <div className="profile-progress">

            <span>
              PROFILE SETUP
            </span>

            <strong>
              1 of 1
            </strong>

            <div>
              <span></span>
            </div>

          </div>

        </div>

        <form
          className="profile-card"
          onSubmit={handleAthleteSubmit}
        >

          <div className="profile-section-header">

            <div className="section-icon">
              01
            </div>

            <div>

              <h2>
                Basic information
              </h2>

              <p>
                Tell us about your sport and body metrics.
              </p>

            </div>

          </div>

          <div className="profile-grid">

            <div className="field">
              <label>Sport</label>
              <select
                name="sport"
                value={athleteData.sport}
                onChange={handleAthleteChange}
                required
              >
                <option value="">Select your sport</option>
                <option value="Cricket">Cricket</option>
                <option value="Football">Football / Soccer</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Athletics">Athletics / Track &amp; Field</option>
                <option value="Badminton">Badminton</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Rugby">Rugby</option>
                <option value="Swimming">Swimming</option>
                <option value="Weightlifting">Weightlifting / CrossFit</option>
                <option value="Baseball">Baseball / Softball</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="field">
              <label>Position / Role</label>
              <input
                type="text"
                name="position"
                list="position-suggestions"
                placeholder="e.g. Batsman, Fast Bowler, Midfielder, Point Guard"
                value={athleteData.position}
                onChange={handleAthleteChange}
                required
              />
              <datalist id="position-suggestions">
                <option value="Batsman" />
                <option value="Fast Bowler" />
                <option value="Spin Bowler" />
                <option value="Wicketkeeper" />
                <option value="All-Rounder" />
                <option value="Striker / Forward" />
                <option value="Midfielder" />
                <option value="Defender" />
                <option value="Goalkeeper" />
                <option value="Point Guard" />
                <option value="Shooting Guard" />
                <option value="Small Forward" />
                <option value="Power Forward" />
                <option value="Center" />
                <option value="Sprinter" />
                <option value="Distance Runner" />
                <option value="Hurdler" />
                <option value="Jumper" />
              </datalist>
            </div>

            <div className="field">
              <label>Gender</label>
              <select
                name="gender"
                value={athleteData.gender || "Male"}
                onChange={handleAthleteChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Prefer not to say</option>
              </select>
            </div>

            <div className="field">
              <label>Training Level</label>
              <select
                name="training_level"
                value={athleteData.training_level || "Intermediate"}
                onChange={handleAthleteChange}
              >
                <option value="Beginner">Beginner (Recreational)</option>
                <option value="Intermediate">Intermediate (Club / College)</option>
                <option value="Advanced">Advanced (Semi-Professional)</option>
                <option value="Elite">Elite (National / Olympic)</option>
              </select>
            </div>

            <div className="field">
              <label>Age</label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 20"
                value={athleteData.age}
                onChange={handleAthleteChange}
                required
              />
            </div>

            <div className="field">
              <label>
                Height <span>(cm)</span> <small style={{ color: "#64748b", fontWeight: 400 }}>(50 – 250 cm)</small>
              </label>
              <input
                type="number"
                name="height"
                min="50"
                max="250"
                step="0.5"
                placeholder="e.g. 175"
                value={athleteData.height}
                onChange={handleAthleteChange}
                required
              />
            </div>

            <div className="field">
              <label>
                Weight <span>(kg)</span> <small style={{ color: "#64748b", fontWeight: 400 }}>(20 – 250 kg)</small>
              </label>
              <input
                type="number"
                name="weight"
                min="20"
                max="250"
                step="0.5"
                placeholder="e.g. 70"
                value={athleteData.weight}
                onChange={handleAthleteChange}
                required
              />
            </div>

          </div>

          <div className="profile-divider"></div>

          {/* SECTION 03: PRIOR INJURY HISTORY */}
          <div className="profile-section-header">
            <div className="section-icon">02</div>
            <div>
              <h2>Prior Injury History</h2>
              <p>
                Document past musculoskeletal injuries. Note: Prior injuries directly increase risk weighting (+25% to +40%) for vulnerable anatomical joints.
              </p>
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Affected Body Part</label>
                <select
                  value={injuryForm.body_part}
                  onChange={(e) => {
                    const bp = e.target.value;
                    let defaultType = "Ligament Sprain";
                    if (bp === "Knee") defaultType = "ACL / Meniscus Injury";
                    if (bp === "Hamstring") defaultType = "Hamstring Strain";
                    if (bp === "Ankle") defaultType = "Lateral Ankle Sprain";
                    if (bp === "Shoulder") defaultType = "Rotator Cuff / Impingement";
                    if (bp === "Lower Back") defaultType = "Lumbar Strain / Disc";
                    setInjuryForm({ ...injuryForm, body_part: bp, injury_type: defaultType });
                  }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="Knee">Knee / ACL</option>
                  <option value="Hamstring">Hamstring</option>
                  <option value="Ankle">Ankle</option>
                  <option value="Shoulder">Shoulder</option>
                  <option value="Lower Back">Lower Back</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Injury Type / Diagnosis</label>
                <input
                  type="text"
                  value={injuryForm.injury_type}
                  onChange={(e) => setInjuryForm({ ...injuryForm, injury_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Months Ago</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={injuryForm.months_ago}
                  onChange={(e) => setInjuryForm({ ...injuryForm, months_ago: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Recovery Status</label>
                <select
                  value={injuryForm.fully_recovered}
                  onChange={(e) => setInjuryForm({ ...injuryForm, fully_recovered: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value={1}>Fully Recovered (Normal +25% weighting)</option>
                  <option value={0}>Ongoing / Residual (+40% weighting)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "13px", padding: "6px 14px" }}
              onClick={() => {
                if (injuryForm.injury_type.trim()) {
                  setPriorInjuries([...priorInjuries, { ...injuryForm, id: Date.now() }]);
                  setInjuryForm({
                    body_part: "Knee",
                    injury_type: "ACL / Ligament Strain",
                    severity: "Moderate",
                    months_ago: "6",
                    fully_recovered: 1,
                    notes: "",
                  });
                }
              }}
            >
              + Add Prior Injury Record
            </button>

            {priorInjuries.length > 0 && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Logged Prior Injuries ({priorInjuries.length}):</span>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "16px", fontSize: "13px", color: "#475569" }}>
                  {priorInjuries.map((inj, idx) => (
                    <li key={inj.id || idx} style={{ marginBottom: "4px" }}>
                      <strong>{inj.body_part}</strong>: {inj.injury_type} ({inj.months_ago} months ago, {inj.fully_recovered === 1 ? "Recovered" : "Residual/Ongoing"})
                      <button
                        type="button"
                        onClick={() => setPriorInjuries(priorInjuries.filter((_, i) => i !== idx))}
                        style={{ marginLeft: "8px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}
                      >
                        ✕ Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="profile-divider"></div>

          <div className="profile-section-header">

            <div className="section-icon">
              03
            </div>

            <div>

              <h2>
                Physical & training metrics
              </h2>

              <p>
                Rate your current physical capabilities.
              </p>

            </div>

          </div>

          <div className="profile-grid metrics-grid">

            <div className="metric-input">

              <label>
                Training load
              </label>

              <input
                type="number"
                name="training_load"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={athleteData.training_load}
                onChange={handleAthleteChange}
                required
              />

              <span>
                Current training intensity
              </span>

            </div>

            <div className="metric-input">

              <label>
                Flexibility
              </label>

              <input
                type="number"
                name="flexibility"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={athleteData.flexibility}
                onChange={handleAthleteChange}
                required
              />

              <span>
                Overall flexibility score
              </span>

            </div>

            <div className="metric-input">

              <label>
                Strength
              </label>

              <input
                type="number"
                name="strength"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={athleteData.strength}
                onChange={handleAthleteChange}
                required
              />

              <span>
                Overall strength score
              </span>

            </div>

            <div className="metric-input">

              <label>
                Balance
              </label>

              <input
                type="number"
                name="balance"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={athleteData.balance}
                onChange={handleAthleteChange}
                required
              />

              <span>
                Balance and stability score
              </span>

            </div>

            <div className="metric-input">

              <label>
                Endurance
              </label>

              <input
                type="number"
                name="endurance"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={athleteData.endurance}
                onChange={handleAthleteChange}
                required
              />

              <span>
                Cardiovascular endurance
              </span>

            </div>

          </div>

          <div className="profile-divider"></div>

          <div className="profile-section-header">
            <div className="section-icon">
              04
            </div>
            <div>
              <h2>
                Athlete Training Notes
              </h2>
              <p>
                Add any training history, medical notes, or personal athletic goals.
              </p>
            </div>
          </div>

          <div className="field">
            <label>
              Athlete Notes / Training History
            </label>
            <textarea
              name="coach_notes"
              rows="4"
              placeholder="Training history, past concerns, target events, or any recurring discomfort..."
              value={athleteData.coach_notes}
              onChange={handleAthleteChange}
            ></textarea>
          </div>

          <div className="profile-submit-row">

            <div className="privacy-note">

              <span>
                🔒
              </span>

              Your profile information is stored securely.

            </div>

            <button
              type="submit"
              className="btn btn-primary btn-large"
            >
              Save profile
              <span>→</span>
            </button>

          </div>

          {athleteMessage && (
            <div className={`feedback ${athleteMessage.type || "info"}`}>
              {athleteMessage.text || athleteMessage}
            </div>
          )}

        </form>

      </div>

    </main>
  );

  // =========================
  // APP
  // =========================

  return (
    <div className="app">

      {page !== "dashboard" && (
        <header className="navbar">

          <button
            className="brand"
            onClick={() => goTo("home")}
          >

            <span className="brand-mark">
              S
            </span>

            <span>
              Sport<span>Shield</span>
            </span>

          </button>

          <nav className="nav-links">

            <button
              className={
                page === "home"
                  ? "active"
                  : ""
              }
              onClick={() => goTo("home")}
            >
              Home
            </button>

            <button
              className={
                page === "login"
                  ? "active"
                  : ""
              }
              onClick={() => goTo("login")}
            >
              Sign in
            </button>

            <button
              className="nav-cta"
              onClick={() => goTo("register")}
            >
              Get started
            </button>

          </nav>

        </header>
      )}

      {page === "home" && renderHome()}

      {page === "login" && renderLogin()}

      {page === "register" && renderRegister()}

      {page === "athlete" && renderAthlete()}

      {page === "dashboard" && (
        <Dashboard
          athleteData={athleteData}
          onNavigate={goTo}
          onLogout={handleLogout}
        />
      )}

    </div>
  );
}

export default App;