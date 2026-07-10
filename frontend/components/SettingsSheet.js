"use client";
// Settings bottom sheet — opened from the gear button pinned at the bottom
// of the sidebar. Slides up from the bottom edge of the screen.
//
// Preferences persist in localStorage under "nextstep_prefs":
//   { timerDefault, dailyReminder, forumReplies }
// The focus timer reads timerDefault on load. The mode control is live —
// it drives the same context as the Study | Habit toggle.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Button from "./Button";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { XIcon, BookIcon, TargetIcon, LogoutIcon } from "@/lib/icons";

const DEFAULTS = { timerDefault: 25, dailyReminder: true, forumReplies: true };

export function readPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("nextstep_prefs") || "{}") }; }
  catch { return { ...DEFAULTS }; }
}

function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={"switch" + (on ? " on" : "")}
      onClick={() => onChange(!on)}
    />
  );
}

export default function SettingsSheet({ open, onClose }) {
  const { user, logout } = useAuth();
  const { mode, setMode } = useMode();
  const router = useRouter();
  const [prefs, setPrefs] = useState(DEFAULTS);

  // Re-read saved prefs every time the sheet opens.
  useEffect(() => { if (open) setPrefs(readPrefs()); }, [open]);

  if (!open) return null;

  function update(patch) {
    // Functional form so rapid consecutive changes never clobber each other.
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("nextstep_prefs", JSON.stringify(next));
      return next;
    });
  }

  function handleLogout() {
    logout();
    onClose();
    router.replace("/login");
  }

  // Portal to <body>: the sidebar is position:sticky, which creates a
  // stacking context that would trap the overlay underneath the page cards.
  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <div className="sheet-handle" />
        <div className="row mb-8" style={{ justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 18, fontWeight: 750 }}>Settings and Privacy</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close settings"><XIcon size={18} /></button>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <div className="settings-label">Appearance</div>
          <div className="settings-row">
            <div>
              <div className="small" style={{ fontWeight: 650 }}>App mode</div>
              <div className="small muted">Study is purple with study tools; Habit is warm orange.</div>
            </div>
            <div className="mode-switch" style={{ margin: 0 }}>
              <button className={"mode-btn" + (mode === "study" ? " active" : "")} onClick={() => setMode("study")}>
                <BookIcon size={14} /> Study
              </button>
              <button className={"mode-btn" + (mode === "habit" ? " active" : "")} onClick={() => setMode("habit")}>
                <TargetIcon size={14} /> Habit
              </button>
            </div>
          </div>
        </div>

        {/* Focus timer */}
        <div className="settings-section">
          <div className="settings-label">Focus timer</div>
          <div className="settings-row">
            <div>
              <div className="small" style={{ fontWeight: 650 }}>Default session length</div>
              <div className="small muted">Used when the timer page opens.</div>
            </div>
            <select
              className="select"
              style={{ width: 110 }}
              value={prefs.timerDefault}
              onChange={(e) => update({ timerDefault: Number(e.target.value) })}
            >
              {[15, 25, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>

        {/* Notifications (stored locally for now — backend later) */}
        <div className="settings-section">
          <div className="settings-label">Notifications</div>
          <div className="settings-row">
            <div>
              <div className="small" style={{ fontWeight: 650 }}>Daily study reminder</div>
              <div className="small muted">A nudge to keep your streak going.</div>
            </div>
            <Toggle on={prefs.dailyReminder} onChange={(v) => update({ dailyReminder: v })} label="Daily study reminder" />
          </div>
          <div className="settings-row">
            <div>
              <div className="small" style={{ fontWeight: 650 }}>Forum replies</div>
              <div className="small muted">When someone comments on your advice.</div>
            </div>
            <Toggle on={prefs.forumReplies} onChange={(v) => update({ forumReplies: v })} label="Forum replies" />
          </div>
        </div>

        {/* Account */}
        <div className="settings-section">
          <div className="settings-label">Account</div>
          <div className="settings-row">
            <div>
              <div className="small" style={{ fontWeight: 650 }}>{user?.name}</div>
              <div className="small muted">{user?.email} &middot; {user?.yearLevel} &middot; {user?.diploma}</div>
            </div>
            <Button size="sm" variant="danger" onClick={handleLogout}><LogoutIcon size={15} /> Log out</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
