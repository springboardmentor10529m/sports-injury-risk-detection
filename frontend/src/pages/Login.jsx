import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { loginUser } from "../api/auth";


function Login() {

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const role = searchParams.get("role") || "athlete";


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  async function handleLogin(e) {

    e.preventDefault();

    setError("");
    setLoading(true);


    try {

      const data = await loginUser(
        email,
        password
      );


      console.log(
        "Login successful:",
        data
      );


      // Store authentication information

      localStorage.setItem(
        "access_token",
        data.access_token
      );


      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );


      // Go to dashboard

      navigate(
        `/${data.user.role}/dashboard`
      );


    } catch (err) {

      console.error(
        "Login error:",
        err
      );


      setError(
        err.message ||
        "Invalid email or password"
      );


    } finally {

      setLoading(false);

    }

  }


  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#070908",
        color: "#f4f7f2",
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: "60px",
        padding: "60px 8vw",
        alignItems: "center"
      }}
    >

      {/* =================================================
          LEFT SECTION
      ================================================= */}

      <div>

        <div
          style={{
            color: "#b6ff4a",
            fontFamily: "DM Mono, monospace",
            fontSize: "11px",
            letterSpacing: "0.15em"
          }}
        >
          KINETIQ
        </div>


        <p
          style={{
            marginTop: "40px",
            color: "#b6ff4a",
            fontFamily: "DM Mono, monospace",
            fontSize: "11px"
          }}
        >
          AI-POWERED SPORTS ANALYTICS
        </p>


        <h1
          style={{
            marginTop: "20px",
            fontSize: "clamp(55px, 8vw, 100px)",
            lineHeight: "0.9",
            letterSpacing: "-0.06em"
          }}
        >

          MOVE

          <br />

          SMARTER.

          <br />

          <span
            style={{
              color: "#b6ff4a"
            }}
          >
            STAY AHEAD.
          </span>

        </h1>

      </div>


      {/* =================================================
          LOGIN CARD
      ================================================= */}

      <div
        style={{
          padding: "35px",
          background: "#101512",
          border: "1px solid rgba(182,255,74,0.16)"
        }}
      >

        <p
          style={{
            color: "#b6ff4a",
            fontFamily: "DM Mono, monospace",
            fontSize: "10px"
          }}
        >
          SECURE ACCESS
        </p>


        <h2
          style={{
            marginTop: "15px"
          }}
        >
          Welcome back.
        </h2>


        <p
          style={{
            marginTop: "8px",
            color: "#9aa39b",
            fontFamily: "DM Mono, monospace",
            fontSize: "10px",
            textTransform: "uppercase"
          }}
        >
          {role.replace("-", " ")} ACCESS
        </p>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              border: "1px solid rgba(255,80,80,0.3)",
              background: "rgba(255,80,80,0.08)",
              color: "#ff8585",
              fontFamily: "DM Mono, monospace",
              fontSize: "10px"
            }}
          >

            {error}

          </div>

        )}


        {/* =================================================
            FORM
        ================================================= */}

        <form
          style={{
            marginTop: "35px",
            display: "flex",
            flexDirection: "column",
            gap: "18px"
          }}
          onSubmit={handleLogin}
        >

          {/* EMAIL */}

          <label>

            <span className="form-label">
              EMAIL
            </span>


            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </label>


          {/* PASSWORD */}

          <label>

            <span className="form-label">
              PASSWORD
            </span>


            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

          </label>


          {/* LOGIN BUTTON */}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
            style={{
              marginTop: "10px",
              justifyContent: "center",
              opacity: loading ? 0.6 : 1
            }}
          >

            {loading
              ? "AUTHENTICATING..."
              : "SIGN IN →"
            }

          </button>

        </form>


        {/* =================================================
            DEMO CREDENTIALS
        ================================================= */}

        <div
          style={{
            marginTop: "25px",
            padding: "12px",
            border: "1px solid rgba(182,255,74,0.08)",
            color: "#68716a",
            fontFamily: "DM Mono, monospace",
            fontSize: "9px",
            lineHeight: "1.7"
          }}
        >

          <div
            style={{
              color: "#b6ff4a",
              marginBottom: "5px"
            }}
          >
            DEMO ACCESS
          </div>

          athlete@kinetiq.com / athlete123

        </div>


        {/* =================================================
            CHANGE ROLE
        ================================================= */}

        <button
          onClick={() => navigate("/roles")}
          style={{
            marginTop: "25px",
            background: "none",
            border: "none",
            color: "#5e675f",
            fontFamily: "DM Mono, monospace",
            fontSize: "10px",
            cursor: "pointer"
          }}
        >

          ← CHANGE ROLE

        </button>

      </div>

    </div>

  );
}


export default Login;