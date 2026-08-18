import { useNavigate } from "react-router-dom";

function RoleSelection() {
  const navigate = useNavigate();

  const roles = [
    "ATHLETE",
    "COACH",
    "PHYSIOTHERAPIST",
    "SPORTS SCIENTIST",
    "ADMINISTRATOR",
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070908",
      color: "#f4f7f2",
      padding: "80px 8vw"
    }}>

      <p style={{
        color: "#b6ff4a",
        fontFamily: "DM Mono, monospace",
        fontSize: "11px",
        letterSpacing: "0.15em"
      }}>
        KINETIQ / ACCESS
      </p>

      <h1 style={{
        marginTop: "25px",
        fontSize: "clamp(45px, 7vw, 85px)",
        lineHeight: "0.95"
      }}>
        SELECT
        <br />
        <span style={{ color: "#b6ff4a" }}>
          YOUR ROLE.
        </span>
      </h1>

      <div style={{
        marginTop: "60px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px"
      }}>

        {roles.map((role) => (
          <button
            key={role}
            onClick={() => navigate(`/login?role=${role.toLowerCase()}`)}
            style={{
              minHeight: "180px",
              padding: "25px",
              textAlign: "left",
              background: "#101512",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f4f7f2",
              cursor: "pointer",
              fontFamily: "DM Mono, monospace",
              fontSize: "12px"
            }}
          >
            <span style={{
              color: "#b6ff4a",
              fontSize: "10px"
            }}>
              ACCESS
            </span>

            <div style={{
              marginTop: "70px"
            }}>
              {role}
            </div>
          </button>
        ))}

      </div>

    </div>
  );
}

export default RoleSelection;