import { useEffect, useState } from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Access Control</div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Users</h1>
          <p style={{ color: "var(--text-dim)" }}>{users.length} accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Create account</>}
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

      <div className="card animate-in">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}{u.id === me.id && <span style={{ color: "var(--text-faint)" }}> (you)</span>}</td>
                  <td style={{ color: "var(--text-dim)" }}>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      disabled={u.id === me.id}
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "var(--text)" }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                    </select>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.is_active ? "var(--risk-low)" : "var(--risk-critical)", boxShadow: `0 0 8px ${u.is_active ? "var(--risk-low)" : "var(--risk-critical)"}` }} />
                      <span style={{ color: u.is_active ? "var(--risk-low)" : "var(--risk-critical)" }}>{u.is_active ? "Active" : "Deactivated"}</span>
                    </span>
                  </td>
                  <td style={{ color: "var(--text-dim)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.id === me.id}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", marginRight: 14, opacity: u.id === me.id ? 0.4 : 1 }}
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
    <div className="card animate-in" style={{ marginBottom: 20 }}>
      <div className="card-title"><ShieldCheck size={15} color="var(--accent)" /> Create a staff account</div>
      <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: -10, marginBottom: 16 }}>
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
