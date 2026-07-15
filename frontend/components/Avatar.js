"use client";
import React from "react";

// Small round profile avatar showing a user's initials, e.g. "Alex Tan" -> "AT",
// "Phyllis Lan" -> "PL". The colour is derived from the name so every user
// gets their own consistent look (Reddit-style). Done by Andrea Ho.
function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";
}

// Turn a name into a stable hue (0–359) so the same person always looks the same.
function hueFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function Avatar({ name, size = 30 }) {
  const hue = hueFor(name);
  return (
    <span
      className="user-avatar"
      title={name}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `hsl(${hue} 70% 90%)`,
        color: `hsl(${hue} 55% 35%)`,
      }}
    >
      {initials(name)}
    </span>
  );
}
