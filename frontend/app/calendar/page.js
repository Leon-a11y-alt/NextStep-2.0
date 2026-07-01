"use client";
import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import CalendarTaskCard from "@/components/CalendarTaskCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { CalendarAPI } from "@/lib/api";
import { PlusIcon, CalendarIcon, ArrowRightIcon } from "@/lib/icons";

// ---- Small date helpers (no external libraries, keeps the app offline-safe) ----
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Format a Date object as "YYYY-MM-DD" (matches the backend date strings).
function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Return the Monday of the week that contains the given date.
function mondayOf(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Nicely readable header like "1 Jul – 7 Jul 2026".
function rangeLabel(start) {
  const end = addDays(start, 6);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", date: toKey(new Date()), time: "09:00" });

  // Which week is currently visible. Anchored to the earliest seeded task
  // on first load so the demo always shows populated days.
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));

  async function load() {
    if (!user) return;
    setError("");
    try {
      const data = await CalendarAPI.list(user.id);
      setTasks(data);
      // Jump the visible week to where the tasks actually are (nice for demos).
      if (data.length > 0) {
        const earliest = data
          .map((t) => t.date)
          .sort()[0];
        setWeekStart(mondayOf(new Date(earliest + "T00:00:00")));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user]);

  // Build the 7 day-columns for the visible week.
  const days = useMemo(() => {
    const todayKey = toKey(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const key = toKey(date);
      return {
        key,
        name: DAY_NAMES[i],
        num: date.getDate(),
        isToday: key === todayKey,
        tasks: tasks.filter((t) => t.date === key),
      };
    });
  }, [weekStart, tasks]);

  // Upcoming list = tasks from today onward, soonest first.
  const upcoming = useMemo(() => {
    const todayKey = toKey(new Date());
    return [...tasks]
      .filter((t) => t.date >= todayKey)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 6);
  }, [tasks]);

  async function createTask(e) {
    e.preventDefault();
    try {
      await CalendarAPI.create({
        userId: user.id,
        title: form.title,
        date: form.date,
        time: form.time,
      });
      setShowCreate(false);
      setForm({ title: "", date: toKey(new Date()), time: "09:00" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(task) {
    try {
      const updated = await CalendarAPI.update(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(task) {
    try {
      await CalendarAPI.remove(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppShell
      title="Calendar Planner"
      subtitle="Schedule your habits and study plans across the week, then check them off."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> Add task</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />

      {/* Week navigation */}
      <div className="row mb-16" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-8">
          <CalendarIcon size={18} />
          <span className="section-title" style={{ margin: 0 }}>{rangeLabel(weekStart)}</span>
        </div>
        <div className="row gap-8">
          <Button size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>← Prev week</Button>
          <Button size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>This week</Button>
          <Button size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>Next week →</Button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="cal-grid mb-24">
        {days.map((d) => (
          <div key={d.key} className={"cal-day" + (d.isToday ? " today" : "")}>
            <div className="cal-daynum">
              <span>{d.name}</span>
              <span>{d.num}</span>
            </div>
            {d.tasks.length === 0 && <span className="small muted">—</span>}
            {d.tasks.map((t) => (
              <span
                key={t.id}
                className={"cal-chip" + (t.completed ? " done" : "")}
                title={t.completed ? "Click to mark not done" : "Click to mark done"}
                onClick={() => toggle(t)}
              >
                {t.time} · {t.title}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Upcoming list (uses the shared CalendarTaskCard component) */}
      <div className="section-title">Upcoming</div>
      <div className="grid" style={{ gap: 12 }}>
        {upcoming.length === 0 && <div className="empty">No upcoming tasks. Add one, or schedule a habit from the tracker.</div>}
        {upcoming.map((t) => (
          <CalendarTaskCard key={t.id} task={t} onToggle={toggle} onDelete={remove} />
        ))}
      </div>

      {/* Add-task modal */}
      <Modal open={showCreate} title="Add a calendar task" onClose={() => setShowCreate(false)}>
        <form onSubmit={createTask}>
          <div className="field-group">
            <label className="field">Task title</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Revise data structures"
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field-group">
              <label className="field">Date</label>
              <input
                className="input"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label className="field">Time</label>
              <input
                className="input"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <Button variant="primary" className="btn-block" type="submit">
            Add to calendar <ArrowRightIcon size={15} />
          </Button>
        </form>
      </Modal>
    </AppShell>
  );
}
