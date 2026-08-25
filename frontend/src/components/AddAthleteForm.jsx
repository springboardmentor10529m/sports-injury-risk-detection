import { useState } from "react";

export default function AddAthleteForm({ onAdd, placeholder = "athlete@email.com", buttonLabel = "Add" }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onAdd(email);
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't add that athlete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        type="email"
        required
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8,
          padding: "9px 12px", fontSize: 13, flex: 1, outline: "none",
        }}
      />
      <button className="btn btn-primary" disabled={loading} type="submit" style={{ padding: "9px 16px", fontSize: 13 }}>
        {loading ? "Adding..." : buttonLabel}
      </button>
      {error && <span style={{ color: "var(--risk-critical)", fontSize: 12, alignSelf: "center" }}>{error}</span>}
    </form>
  );
}
