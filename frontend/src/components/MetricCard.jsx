import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function MetricCard({
  title,
  value,
  unit = "",
  subtitle,
  icon: Icon,
  trend, // { direction: 'up' | 'down' | 'neutral', label: string, isGood: boolean }
  progress, // number 0-100
  color = "cyan", // 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple'
  onClick,
}) {
  const colorMap = {
    cyan: {
      accent: "#06b6d4",
      bgGlow: "rgba(6, 182, 212, 0.12)",
      border: "rgba(6, 182, 212, 0.3)",
    },
    emerald: {
      accent: "#10b981",
      bgGlow: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
    },
    amber: {
      accent: "#f59e0b",
      bgGlow: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.3)",
    },
    rose: {
      accent: "#f43f5e",
      bgGlow: "rgba(244, 63, 94, 0.12)",
      border: "rgba(244, 63, 94, 0.3)",
    },
    purple: {
      accent: "#a855f7",
      bgGlow: "rgba(168, 85, 247, 0.12)",
      border: "rgba(168, 85, 247, 0.3)",
    },
  };

  const theme = colorMap[color] || colorMap.cyan;

  return (
    <div
      onClick={onClick}
      className="glass-panel"
      style={{
        padding: "1.25rem",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* Background Accent Highlight */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          background: theme.bgGlow,
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.02em" }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              padding: "8px",
              borderRadius: "10px",
              backgroundColor: theme.bgGlow,
              border: `1px solid ${theme.border}`,
              color: theme.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "1.85rem",
            fontWeight: "800",
            color: "#ffffff",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.1,
          }}
        >
          {value !== undefined && value !== null ? value : "--"}
        </span>
        {unit && (
          <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div style={{ margin: "0.6rem 0" }}>
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
                height: "100%",
                backgroundColor: theme.accent,
                borderRadius: "999px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
        {subtitle && (
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
            {subtitle}
          </span>
        )}
        {trend && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.75rem",
              fontWeight: "600",
              color: trend.isGood ? "#34d399" : "#fb7185",
            }}
          >
            {trend.direction === "up" && <TrendingUp size={13} />}
            {trend.direction === "down" && <TrendingDown size={13} />}
            {trend.direction === "neutral" && <Minus size={13} />}
            <span>{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
