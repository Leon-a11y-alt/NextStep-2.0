"use client";
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import HabitCard from "@/components/HabitCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HabitsAPI } from "@/lib/api";
import { PlusIcon } from "@/lib/icons";

const FREQUENCIES = ["Daily", "Weekdays", "Weekly", "3x per week", "Monthly"];
const FILTERS = ["All", "active", "completed", "paused"];

export default function TrackerPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", frequency: "Daily" });

  async function load() {
    if (!user) return;
    setError("");
    try { setHabits(await HabitsAPI.list(user.id)); }
    catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function createHabit(e) {
    e.preventDefault();
    try {
      await HabitsAPI.create({ userId: user.id, name: form.name, frequency: form.frequency });
      setShowCreate(false);
      setForm({ name: "", frequency: "Daily" });
      load();
    } catch (err) { setError(err.message); }
  }

  async function markComplete(habit) {
    try {
      const updated = await HabitsAPI.update(habit.id, { status: "completed" });
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } catch (err) { setError(err.message); }
  }

  async function togglePause(habit) {
    const next = habit.status === "paused" ? "active" : "paused";
    try {
      const updated = await HabitsAPI.update(habit.id, { status: next });
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } catch (err) { setError(err.message); }
  }

  async function removeHabit(habit) {
    try {
      await HabitsAPI.remove(habit.id);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    } catch (err) { setError(err.message); }
  }

  const shown = filter === "All" ? habits : habits.filter((h) => h.status === filter);
  const counts = {
    active: habits.filter((h) => h.status === "active").length,
    completed: habits.filter((h) => h.status === "completed").length,
    paused: habits.filter((h) => h.status === "paused").length,
  };

  return (
    <AppShell
      title="Habit & Study Tracker"
      subtitle="Build habits from advice, set a frequency, and track your progress."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> New habit</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />

      {/* Summary + filters */}
      <div className="grid grid-3 mb-24">
        <Card className="center"><div className="stat-value" style={{ color: "var(--primary)" }}>{counts.active}</div><div className="stat-label">Active</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--green)" }}>{counts.completed}</div><div className="stat-label">Completed</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--amber)" }}>{counts.paused}</div><div className="stat-label">Paused</div></Card>
      </div>

      <div className="chip-row mb-24">
        {FILTERS.map((f) => (
          <button key={f} className={"filter-chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
            {f === "All" ? "All" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-2">
        {shown.length === 0 && <div className="empty">No habits here yet. Create one, or add advice from the forum.</div>}
        {shown.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            fromAdvice={!!h.sourcePostId}
            onComplete={markComplete}
            onTogglePause={togglePause}
            onDelete={removeHabit}
          />
        ))}
      </div>

      <Modal open={showCreate} title="Create a habit or study plan" onClose={() => setShowCreate(false)}>
        <form onSubmit={createHabit}>
          <div className="field-group">
            <label className="field">Habit / plan name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Revise for 30 minutes" />
          </div>
          <div className="field-group">
            <label className="field">Frequency</label>
            <select className="select" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <Button variant="primary" className="btn-block" type="submit">Add habit</Button>
        </form>
      </Modal>
    </AppShell>
  );
}
