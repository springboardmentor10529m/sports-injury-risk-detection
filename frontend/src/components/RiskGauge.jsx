import React from "react";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

export default function RiskGauge({ score = 0, status = null, size = 180, showLabel = true }) {
  // Clamp score between 0 and 100
  const normalizedScore = Math.min(Math.max(Number(score) || 0, 0), 100);
  
  // Radius and stroke calculations
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 240-degree arc (semicircular/speedometer style)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (normalizedScore / 100) * arcLength;

  let riskTier = {
    label: "Low Risk",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.3)",
    icon: CheckCircle,
    desc: "Biomechanical patterns within optimal thresholds.",
  };

  // Harmonized standard threshold logic: >= 50 is High Risk, >= 25 is Moderate Risk, < 25 is Low Risk
  const isHigh = status
    ? status.toLowerCase().includes("high") || status.toLowerCase().includes("critical")
    : normalizedScore >= 50;
  const isMod = status
    ? status.toLowerCase().includes("mod")
    : (normalizedScore >= 25 && normalizedScore < 50);

  if (isHigh) {
    riskTier = {
      label: status || "High Risk",
      color: "#f43f5e",
      glow: "rgba(244, 63, 94, 0.3)",
      icon: ShieldAlert,
      desc: "Critical biomechanical stress detected. Immediate review advised.",
    };
  } else if (isMod) {
    riskTier = {
      label: status || "Moderate Risk",
      color: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.3)",
      icon: AlertTriangle,
      desc: "Mild compensatory movement or asymmetry noted.",
    };
  }

  const IconComponent = riskTier.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(135deg)", filter: `drop-shadow(0 0 10px ${riskTier.glow})` }}
        >
          {/* Background Arc */}
          <circle
            className="risk-gauge-bg-arc"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active Colored Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={riskTier.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease",
            }}
          />
        </svg>

        {/* Center Content */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="risk-score-value"
            style={{
              fontSize: size > 150 ? "2.2rem" : "1.6rem",
              fontWeight: "800",
              color: "#ffffff",
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
            }}
          >
            {Math.round(normalizedScore)}
            <span style={{ fontSize: "1rem", color: riskTier.color }}>%</span>
          </span>
          <span className="risk-score-sublabel" style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "4px" }}>
            Injury Risk
          </span>
        </div>
      </div>

      {showLabel && (
        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "20px",
              backgroundColor: `rgba(${riskTier.color === '#10b981' ? '16, 185, 129' : riskTier.color === '#f59e0b' ? '245, 158, 11' : '244, 63, 94'}, 0.15)`,
              color: riskTier.color,
              fontWeight: "700",
              fontSize: "0.85rem",
              border: `1px solid ${riskTier.color}40`,
            }}
          >
            <IconComponent size={14} />
            <span>{riskTier.label}</span>
          </div>
          <p className="risk-score-desc" style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "220px", marginTop: "6px", lineHeight: "1.3" }}>
            {riskTier.desc}
          </p>
        </div>
      )}
    </div>
  );
}
