import React from "react";
import Card from "./Card";

// A dashboard widget: icon + big number + label.
// `tone` sets the soft accent colour of the icon tile.
export default function DashboardStatCard({ icon: Icon, value, label, tone = "blue" }) {
  const tones = {
    blue: { bg: "var(--primary-050)", fg: "var(--primary-600)" },
    green: { bg: "var(--green-050)", fg: "var(--green)" },
    amber: { bg: "var(--amber-050)", fg: "var(--amber)" },
    violet: { bg: "var(--violet-050)", fg: "var(--violet)" },
  };
  const t = tones[tone] || tones.blue;
  return (
    <Card hover className="stat-card">
      <div className="stat-icon" style={{ background: t.bg, color: t.fg }}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </Card>
  );
}
