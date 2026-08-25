import { useEffect, useState } from "react";
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ROLES = ["athlete", "coach", "physiotherapist", "sports_scientist", "admin"];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function refresh() {
    return getAdminUsers().then((res) => setUsers(res.data));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function toggleActive(u) {
    await updateAdminUser(u.id, { is_active: !u.is_active });
    await refresh();
  }

  async function changeRole(u, role) {
    await updateAdminUser(u.id, { role });
    await refresh();
  }

  async function handleDelete(u) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    await deleteAdminUser(u.id);
    await refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Users</h1>
          <p style={{ color: "var(--text-dim)" }}>{users.length} accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Cancel" : "+ Create account"}
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}

      <div className="card">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Email</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Role</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Status</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 4px" }}>{u.full_name}{u.id === me.id && <span style={{ color: "var(--text-faint)" }}> (you)</span>}</td>
                  <td style={{ padding: "10px 4px", color: "var(--text-dim)" }}>{u.email}</td>
                  <td style={{ padding: "10px 4px" }}>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      disabled={u.id === me.id}
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "var(--text)" }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 4px" }}>
                    <span style={{ color: u.is_active ? "var(--risk-low)" : "var(--risk-critical)", fontSize: 12 }}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 4px", color: "var(--text-dim)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: "10px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.id === me.id}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", marginRight: 12, opacity: u.id === me.id ? 0.4 : 1 }}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={u.id === me.id}
                      style={{ background: "none", border: "none", color: "var(--risk-critical)", fontSize: 12, cursor: "pointer", opacity: u.id === me.id ? 0.4 : 1 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CreateUserForm({ onCreated }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "admin" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createAdminUser(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, marginBottom: 4 }}>Create a staff account</h3>
      <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
        Creates a profile-less account (mainly for additional admins). For athlete/coach/physio/scientist
        accounts with full profiles, have them self-register instead.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Full name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
