import React from "react";

export default function BrandLogo({
  size = 38,
  showText = true,
  subtitle = "Sports Injury Risk Detection",
  badgeText = null,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {/* Custom Biomechanical Kinetic Vector Emblem */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "10px",
          background: "linear-gradient(135deg, #0a1128 0%, #0f1f38 100%)",
          border: "1.5px solid rgba(56, 189, 248, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 18px rgba(56, 189, 248, 0.3), inset 0 0 10px rgba(16, 185, 129, 0.15)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <svg
          width={Math.round(size * 0.68)}
          height={Math.round(size * 0.68)}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="brandLogoGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="brandLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Biomechanical Kinematic Motion Paths */}
          <path
            d="M7 4 L7 28"
            stroke="url(#brandLogoGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M7 16 L22 5"
            stroke="url(#brandLogoGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M12 12.5 L24 27"
            stroke="url(#brandLogoGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M22 5 L24 27"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />

          {/* Illuminated Joint Tracking Nodes */}
          <circle cx="7" cy="4" r="2.4" fill="#38bdf8" />
          <circle cx="7" cy="16" r="2.8" fill="#818cf8" />
          <circle cx="7" cy="28" r="2.4" fill="#10b981" />
          <circle cx="22" cy="5" r="2.4" fill="#38bdf8" />
          <circle cx="24" cy="27" r="2.6" fill="#10b981" />
          <circle cx="14.5" cy="15.5" r="1.6" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="brand-kinetic-text"
              style={{
                fontSize: size > 40 ? "1.35rem" : "1.1rem",
                fontWeight: "900",
                letterSpacing: "-0.03em",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
              }}
            >
              KINETIC
              <span
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #10b981 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginLeft: "1px",
                }}
              >
                AI
              </span>
            </span>

            {badgeText && (
              <span
                className="brand-badge-text"
                style={{
                  fontSize: "0.65rem",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontWeight: "700",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                }}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", margin: 0, fontWeight: "500" }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
