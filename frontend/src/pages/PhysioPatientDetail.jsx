import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ClipboardPlus } from "lucide-react";
import { addPhysioNote, getPhysioNotes, getPhysioPatientProfile, getPhysioPatientVideos } from "../api/client";
import StaffAthleteDetail from "../components/StaffAthleteDetail";

const PHASES = [
  ["mobility", "Mobility"],
  ["strength", "Strength"],
  ["return_to_sport", "Return to sport"],
];

export default function PhysioPatientDetail() {
  const { id } = useParams();
  const [notes, setNotes] = useState([]);
  const [phase, setPhase] = useState("mobility");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  function refreshNotes() {
    return getPhysioNotes(id).then((res) => setNotes(res.data));
  }

  useEffect(() => {
    refreshNotes();
  }, [id]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addPhysioNote(id, phase, text.trim());
      setText("");
      await refreshNotes();
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaffAthleteDetail
      athleteId={id}
      fetchProfile={getPhysioPatientProfile}
      fetchVideos={getPhysioPatientVideos}
      backTo="/physio/patients"
      backLabel="Back to patients"
      extra={
        <div className="card animate-in">
          <div className="card-title"><ClipboardPlus size={15} color="var(--accent)" /> Clinical notes</div>

          <form onSubmit={handleAddNote} style={{ marginBottom: 20 }}>
            <div className="field-row" style={{ marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Phase</label>
                <select value={phase} onChange={(e) => setPhase(e.target.value)}>
                  {PHASES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Good ankle ROM today, cleared for single-leg hop testing next session."
              rows={3}
              style={{
                width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
                borderRadius: 8, padding: 10, color: "var(--text)", fontFamily: "inherit", fontSize: 13,
                resize: "vertical", marginBottom: 10,
              }}
            />
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? "Saving..." : "Add note"}
            </button>
          </form>

          {notes.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No notes logged yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
                    <span style={{ textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
                      {n.phase.replace(/_/g, " ")}
                    </span>
                    <span>{new Date(n.created_at).toLocaleString()} · {n.physio_name}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{n.note}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}
