// Status label / pill. `color` maps to a soft accent.
import React from "react";

export default function Badge({ color = "gray", dot = false, children }) {
  const map = {
    gray: "badge",
    blue: "badge badge-blue",
    green: "badge badge-green",
    amber: "badge badge-amber",
    red: "badge badge-red",
    violet: "badge badge-violet",
  };
  return (
    <span className={map[color] || map.gray}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

// Helper: turn a status string into a coloured badge consistently
// across the whole app (habits, posts, tasks, requests).
export function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const config = {
    active: ["blue", "Active"],
    completed: ["green", "Completed"],
    paused: ["amber", "Paused"],
    approved: ["green", "Approved"],
    pending: ["amber", "Pending"],
    rejected: ["red", "Rejected"],
    open: ["amber", "Open"],
    resolved: ["green", "Resolved"],
  };
  const [color, label] = config[s] || ["gray", status];
  return <Badge color={color} dot>{label}</Badge>;
}
