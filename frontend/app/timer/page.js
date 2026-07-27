"use client";
// Focus Timer — not just a clock: every finished session is tied to a habit
// or study plan and logged, so the tracker/dashboard can show real focus data.
//
// BACKEND OWNER TODO:
//   Implement the FocusAPI endpoints (see lib/api.js + TEAM_HANDOFF.md).
//   The timer itself is pure frontend and already works. Sessions are kept
//   in local state (demo mode) until POST /api/focus-sessions exists —
//   the handleSessionDone() try/catch below already prefers the real API.
import React, { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HabitsAPI, FocusAPI, PlansAPI } from "@/lib/api";
import { PlayIcon, PauseIcon, ClockIcon, CheckIcon } from "@/lib/icons";

const POMODORO_MODES = {
  focus: { label: "Pomodoro", minutes: 25 },
  shortBreak: { label: "Short Break", minutes: 5 },
  longBreak: { label: "Long Break", minutes: 15 },
};

// Demo sessions shown until the backend endpoint exists.
const DEMO_SESSIONS = [
  { id: 1, habitName: "Solve one coding problem each weekday", minutes: 25, date: new Date().toISOString().slice(0, 10) },
  { id: 2, habitName: "Recap yesterday's topic for 20 minutes", minutes: 45, date: new Date().toISOString().slice(0, 10) },
  { id: 3, habitName: "Solve one coding problem each weekday", minutes: 25, date: "2026-07-06" },
];

function fmt(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimerPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [plans, setPlans] = useState([]);          // study plans you can focus on
  const [sessions, setSessions] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Timer state. `target` is "" (free focus), "habit:<id>" or "plan:<id>".
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState("focus");
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [soundVolume, setSoundVolume] = useState(0.7);
  const tick = useRef(null);
  const audioContext = useRef(null);

  async function load() {
    if (!user) return;
    setError("");
    try { setHabits(await HabitsAPI.list(user.id)); } catch (err) { setError(err.message); }
    try { setPlans(await PlansAPI.list(user.id)); } catch { /* plans optional */ }
    try {
      setSessions(await FocusAPI.list(user.id));
      setDemoMode(false);
    } catch {
      setSessions(DEMO_SESSIONS);
      setDemoMode(true);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // If we arrived from Habit Tracker or Study Plans, pre-select that item. (Khaing Khant Zaw)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const habitId = params.get("habit");
    const planId = params.get("plan");

    if (habitId && habits.some((h) => String(h.id) === habitId)) {
      setTarget(`habit:${habitId}`);
      return;
    }

    if (planId && plans.some((p) => String(p.id) === planId)) {
      setTarget(`plan:${planId}`);
    }
  }, [habits, plans]);

  // Countdown loop.
  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(tick.current); handleSessionDone(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
    // eslint-disable-next-line
  }, [running]);

  useEffect(() => {
    const prefix =
      mode === "shortBreak"
        ? "☕"
        : mode === "longBreak"
          ? "🌴"
          : "🍅";

    const label =
      mode === "shortBreak"
        ? "Break"
        : mode === "longBreak"
          ? "Break"
          : "Focus";

    document.title = `${prefix} ${fmt(secondsLeft)} ${label} - NextStep`;

    return () => {
      document.title = "NextStep | Focus Timer";
    };
  }, [running, secondsLeft, mode]);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  function prepareAudio() {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.current.state === "suspended") {
      audioContext.current.resume();
    }
  }

  function playTimerSound() {
    const context = audioContext.current;
    if (!context) return;

    const startAt = context.currentTime;

    [0, 0.25, 0.5].forEach((delay) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;

      gain.gain.setValueAtTime(0.0001, startAt + delay);
      gain.gain.exponentialRampToValueAtTime(soundVolume, startAt + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + delay + 0.18);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt + delay);
      oscillator.stop(startAt + delay + 0.2);
    });
  }

  function switchMode(nextMode) {
    const nextMinutes = POMODORO_MODES[nextMode].minutes;

    setMode(nextMode);
    setMinutes(nextMinutes);
    setSecondsLeft(nextMinutes * 60);
    setRunning(false);
  }

  function applyCustomDuration() {
    const value = Number(customMinutes);

    if (!Number.isInteger(value) || value < 1 || value > 240) {
      setError("Custom focus time must be between 1 and 240 minutes.");
      return;
    }

    setError("");
    setMode("custom");
    setMinutes(value);
    setSecondsLeft(value * 60);
    setRunning(false);
  }

  function testTimer() {
    setRunning(false);
    setSecondsLeft(5);
  }

  function startTimer() {
    prepareAudio();
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(minutes * 60);
  }

  // Resolve the dropdown value into the actual habit OR plan being focused on.
  const [targetKind, targetId] = target.includes(":") ? target.split(":") : ["", ""];
  const habit = targetKind === "habit" ? habits.find((h) => String(h.id) === targetId) : null;
  const plan = targetKind === "plan" ? plans.find((p) => String(p.id) === targetId) : null;
  const focusName = habit?.name || plan?.name || "Free focus";

  async function handleSessionDone(early = false) {
    setRunning(false);

    // Breaks are not stored as focus sessions.
    if (mode === "shortBreak" || mode === "longBreak") {
      playTimerSound();
      switchMode("focus");
      flash("Break finished. It is time for another focus session.");
      return;
    }

    const spentMin = Math.max(1, Math.round((minutes * 60 - secondsLeft) / 60)) || minutes;
    const entry = {
      userId: user.id,
      // Sessions link to a habit when one is chosen; plans are logged by name.
      habitId: habit?.id || null,
      habitName: focusName,
      minutes: early ? spentMin : minutes,
      date: new Date().toISOString().slice(0, 10),
    };

    if (demoMode) {
      setSessions((prev) => [{ id: Date.now(), ...entry }, ...prev]);
    } else {
      try { await FocusAPI.create(entry); load(); }
      catch { setSessions((prev) => [{ id: Date.now(), ...entry }, ...prev]); }
    }

    if (early) {
      setSecondsLeft(minutes * 60);
      flash(`Session logged: ${entry.minutes} min on "${entry.habitName}"${habit ? " — progress updated" : ""}`);
      return;
    }

    playTimerSound();

    const nextCompletedCount = completedFocusSessions + 1;
    const nextMode = nextCompletedCount % 4 === 0 ? "longBreak" : "shortBreak";

    setCompletedFocusSessions(nextCompletedCount);
    switchMode(nextMode);

    flash(
      nextMode === "longBreak"
        ? `Focus session completed. Take a ${POMODORO_MODES.longBreak.minutes}-minute long break.`
        : `Focus session completed. Take a ${POMODORO_MODES.shortBreak.minutes}-minute short break.`
    // BACKEND TODO: on the server, a logged session for a habit should
    // also bump that habit's progress (e.g. +10% per completed session).
    );
  }



  const today = new Date().toISOString().slice(0, 10);
  const todayMin = sessions.filter((s) => s.date === today).reduce((n, s) => n + s.minutes, 0);
  const weekCount = sessions.length;
  const pct = Math.round(((minutes * 60 - secondsLeft) / (minutes * 60)) * 100);

  return (
    <AppShell
      title="Focus Timer"
      subtitle="Use structured Pomodoro focus sessions and breaks while tracking progress for your habits and study plans."
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}
      {demoMode && (
        <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
          Demo data — the <code>/api/focus-sessions</code> endpoints aren&rsquo;t connected yet (see TEAM_HANDOFF.md).
        </div>
      )}

      <div className="grid grid-3 mb-24">
        <Card className="center"><div className="stat-value" style={{ color: "var(--primary)" }}>{todayMin}<span style={{ fontSize: 16 }}> min</span></div><div className="stat-label">Focused today</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--violet)" }}>{weekCount}</div><div className="stat-label">Sessions logged</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--green)" }}>{sessions.filter((s) => s.date === today).length}</div><div className="stat-label">Sessions today</div></Card>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        {/* Timer card */}
        <Card className="center">
          <div className="field-group" style={{ textAlign: "left" }}>
            <label className="field">What are you focusing on?</label>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={running}>
              <option value="">Free focus (nothing linked)</option>
              {habits.filter((h) => h.status === "active").length > 0 && (
                <optgroup label="Habits">
                  {habits.filter((h) => h.status === "active").map((h) => (
                    <option key={`h${h.id}`} value={`habit:${h.id}`}>{h.name}</option>
                  ))}
                </optgroup>
              )}
              {plans.length > 0 && (
                <optgroup label="Study plans">
                  {plans.map((p) => (
                    <option key={`p${p.id}`} value={`plan:${p.id}`}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="chip-row mb-16" style={{ justifyContent: "center" }}>
            {Object.entries(POMODORO_MODES).map(([key, item]) => (
              <button
                key={key}
                className={"filter-chip" + (mode === key ? " active" : "")}
                onClick={() => switchMode(key)}
                disabled={running}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="row gap-8 mb-16" style={{ justifyContent: "center", alignItems: "center" }}>
            <input
              className="input"
              type="number"
              min="1"
              max="240"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Custom minutes"
              disabled={running}
              style={{ width: 160 }}
            />
            <Button size="sm" type="button" onClick={applyCustomDuration} disabled={running || !customMinutes}>
              Set custom timer
            </Button>
          </div>

          <div className="row gap-8 mb-16" style={{ justifyContent: "center" }}>
            <Button
              size="sm"
              type="button"
              onClick={testTimer}
              disabled={running}
            >
              Test (5s)
            </Button>
          </div>

          <div
            className="field-group mb-16"
            style={{
              maxWidth: 280,
              margin: "0 auto",
              textAlign: "left",
            }}
          >
            <label className="field">
                Notification Volume ({Math.round(soundVolume * 400)}%)
            </label>

            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(Number(e.target.value))}
              style={{ width: "100%" }}
            />

            <Button
              size="sm"
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => {
                prepareAudio();
                playTimerSound();
              }}
            >
              Test sound
            </Button>
          </div>

          <div className="small mb-8" style={{ fontWeight: 700, color: "var(--primary)" }}>
            {mode === "custom" ? "Custom Focus" : POMODORO_MODES[mode].label}
          </div>

          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", margin: "8px 0" }}>
            {fmt(secondsLeft)}
          </div>

          <div className="row gap-8" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            {!running ? (
              <Button variant="primary" onClick={startTimer}>
                <PlayIcon size={16} />
                {secondsLeft < minutes * 60
                  ? "Resume"
                  : mode === "shortBreak" || mode === "longBreak"
                    ? "Start break"
                    : "Start focus"}
              </Button>
            ) : (
              <Button onClick={() => setRunning(false)}><PauseIcon size={16} /> Pause</Button>
            )}

            {secondsLeft < minutes * 60 && (mode === "focus" || mode === "custom") && (
              <Button variant="success" onClick={() => handleSessionDone(true)}>
                <CheckIcon size={16} /> End &amp; log
              </Button>
            )}

            {secondsLeft < minutes * 60 && (mode === "shortBreak" || mode === "longBreak") && (
              <Button onClick={() => switchMode("focus")}>
                Skip break
              </Button>
            )}

            {secondsLeft < minutes * 60 && (
              <Button variant="danger" onClick={reset}>Reset</Button>
            )}
          </div>
          
          <p className="small muted mt-16">
            Pomodoro cycle: {completedFocusSessions % 4}/4 focus sessions completed
          </p>

          {habit && <p className="small muted mt-16">Finishing this session updates the progress of <strong>{habit.name}</strong>.</p>}
          {plan && <p className="small muted mt-16">Focusing on your study plan <strong>{plan.name}</strong>.</p>}
        </Card>

        {/* Session history */}
        <Card>
          <div className="row gap-8 mb-16">
            <span className="stat-icon" style={{ background: "var(--primary-050)", color: "var(--primary-600)", width: 36, height: 36 }}><ClockIcon size={18} /></span>
            <h3 className="card-title">Recent sessions</h3>
          </div>
          <div className="stack gap-8">
            {sessions.length === 0 && <p className="muted small">No sessions yet — start your first focus session.</p>}
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="row" style={{ justifyContent: "space-between", padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{s.habitName}</div>
                  <div className="small muted">{s.date}</div>
                </div>
                <span className="small" style={{ fontWeight: 700, color: "var(--primary)" }}>{s.minutes} min</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
