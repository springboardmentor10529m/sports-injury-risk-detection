import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { getRiskHistory } from "../api/client";

export default function History() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getRiskHistory().then((res) => setData(res.data));
  }, []);

  if (!data) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  if (data.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Risk History</h1>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>No completed analyses yet.</p>
          <Link to="/analyze" className="btn btn-primary">Analyze a video</Link>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: d.overall_risk_score,
    id: d.video_id,
  }));

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Risk History</h1>

      <div className="card" style={{ marginBottom: 20, height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <ReferenceArea y1={0} y2={35} fill="var(--risk-low)" fillOpacity={0.06} />
            <ReferenceArea y1={36} y2={60} fill="var(--risk-moderate)" fillOpacity={0.06} />
            <ReferenceArea y1={61} y2={80} fill="var(--risk-high)" fillOpacity={0.06} />
            <ReferenceArea y1={81} y2={100} fill="var(--risk-critical)" fillOpacity={0.06} />
            <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="var(--text-faint)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Date</th>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Activity</th>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Score</th>
              <th style={{ padding: "6px 4px", fontWeight: 500 }}>Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.video_id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 4px" }}>{new Date(d.date).toLocaleDateString()}</td>
                <td style={{ padding: "10px 4px", textTransform: "capitalize" }}>{d.activity_type}</td>
                <td style={{ padding: "10px 4px" }} className="mono">{d.overall_risk_score}</td>
                <td style={{ padding: "10px 4px" }}>{d.risk_category}</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>
                  <Link to={`/analysis/${d.video_id}`} style={{ color: "var(--accent)" }}>View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
