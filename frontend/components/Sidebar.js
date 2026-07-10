"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import SettingsSheet from "./SettingsSheet";
import { HomeIcon, ForumIcon, TrackerIcon, CalendarIcon, ShieldIcon, BookIcon, ClockIcon, SparkIcon, SettingsIcon } from "@/lib/icons";

// Each link declares which app modes it belongs to (see lib/mode.js) and its
// own "highlighter" accent — every feature has a colour of its own, like a
// pencil case. The same colours drive the page-title underline in AppShell.
const links = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon, modes: ["study", "habit"], fg: "#6366f1", bg: "rgba(99, 102, 241, 0.12)" },
  { href: "/forum", label: "Advice Forum", icon: ForumIcon, modes: ["study", "habit"], fg: "#0d9488", bg: "rgba(13, 148, 136, 0.12)" },
  { href: "/tracker", label: "Habit Tracker", icon: TrackerIcon, modes: ["habit"], fg: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" },
  { href: "/plans", label: "Study Plans", icon: BookIcon, modes: ["study"], fg: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, modes: ["study", "habit"], fg: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
  { href: "/timer", label: "Focus Timer", icon: ClockIcon, modes: ["study"], fg: "#e11d48", bg: "rgba(225, 29, 72, 0.10)" },
  { href: "/help", label: "Study Help", icon: SparkIcon, modes: ["study"], fg: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mode } = useMode();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <aside className="sidebar">
      <div className="nav-section">Menu</div>
      {links.filter((l) => l.modes.includes(mode)).map(({ href, label, icon: Icon, fg, bg }) => (
        <Link
          key={href}
          href={href}
          className={"nav-link" + (pathname === href ? " active" : "")}
          style={{ "--tile-fg": fg, "--tile-bg": bg }}
        >
          <span className="ico"><Icon size={17} /></span>
          {label}
        </Link>
      ))}

      {/* Settings and Privacy — sits right below the menu links; opens the bottom sheet. */}
      <button
        className="nav-link"
        onClick={() => setShowSettings(true)}
        style={{ "--tile-fg": "#64748b", "--tile-bg": "rgba(100, 116, 139, 0.12)" }}
      >
        <span className="ico"><SettingsIcon size={17} /></span>
        Settings and Privacy
      </button>

      {/* Admin link only shows for admin accounts. */}
      {user?.role === "admin" && (
        <>
          <div className="nav-section">Moderation</div>
          <Link
            href="/admin"
            className={"nav-link" + (pathname === "/admin" ? " active" : "")}
            style={{ "--tile-fg": "#dc2626", "--tile-bg": "rgba(220, 38, 38, 0.10)" }}
          >
            <span className="ico"><ShieldIcon size={17} /></span>
            Admin Panel
          </Link>
        </>
      )}

      <SettingsSheet open={showSettings} onClose={() => setShowSettings(false)} />
    </aside>
  );
}
