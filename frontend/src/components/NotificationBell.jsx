import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/client";

const TYPE_COLOR = {
  high_risk_alert: "var(--risk-high)",
  training_load_warning: "var(--risk-moderate)",
  assessment_completed: "var(--risk-low)",
  assessment_failed: "var(--risk-critical)",
  new_user_registered: "var(--accent2)",
  athlete_linked: "var(--accent)",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread_count: 0, notifications: [] });
  const ref = useRef(null);
  const navigate = useNavigate();

  function refresh() {
    getNotifications().then((res) => setData(res.data)).catch(() => {});
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleClick(n) {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      refresh();
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    refresh();
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{
          position: "relative", background: "var(--surface-raised)", border: "1px solid var(--border)",
          borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--text-dim)",
        }}
      >
        <Bell size={16} />
        {data.unread_count > 0 && (
          <span
            style={{
              position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
              background: "var(--risk-critical)", color: "#fff", fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              boxShadow: "0 0 8px var(--risk-critical)",
            }}
          >
            {data.unread_count > 9 ? "9+" : data.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="animate-in"
          style={{
            position: "absolute", top: 46, right: 0, width: 360, maxHeight: 440, overflowY: "auto",
            background: "linear-gradient(180deg, var(--surface-raised), var(--surface))",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-card-hover)", zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-soft)" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
            {data.unread_count > 0 && (
              <button
                onClick={handleMarkAll}
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {data.notifications.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              No notifications yet.
            </div>
          ) : (
            data.notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: "12px 16px", borderBottom: "1px solid var(--border-soft)", cursor: "pointer",
                  background: n.is_read ? "transparent" : "var(--accent-soft)",
                  display: "flex", gap: 10, transition: "background 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: TYPE_COLOR[n.type] || "var(--text-dim)",
                    boxShadow: n.is_read ? "none" : `0 0 6px ${TYPE_COLOR[n.type] || "var(--text-dim)"}`,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
