"use client";
// Calendar Planner — Done by WK
//
// Shows scheduled habits + study plans on a calendar you can tick off.
// A view dropdown switches between the current week, the whole month, and
// the previous month.
//
// Everything is stored in Supabase: the page talks to CalendarAPI, which
// hits /api/calendar -> calendar.controller -> calendar.repo -> the
// calendar_tasks table. Loading = GET, ticking a task = PUT, adding = POST.
import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { CalendarAPI, HabitsAPI, PlansAPI } from "@/lib/api";
import { PlusIcon, CalendarIcon, ArrowRightIcon } from "@/lib/icons";

// ---- Small date helpers (no external libraries, keeps the app offline-safe) ----
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Format a Date as "YYYY-MM-DD" (matches the backend's date strings).
function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Monday of the week that contains `date`.
function mondayOf(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function firstOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date, n) { return new Date(date.getFullYear(), date.getMonth() + n, 1); }
// Readable week header like "1 Jul – 7 Jul 2026".
function weekLabel(start) {
  const end = addDays(start, 6);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: toKey(new Date()),
    time: "09:00",
    taskType: "calendar",
    frequency: "Daily",
  });

  // View state: "week" shows 7 days; "month" shows a whole month grid.
  const [view, setView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date())); // anchor for week view
  const [monthCursor, setMonthCursor] = useState(() => firstOfMonth(new Date())); // anchor for month view

  // ---- Load all this user's tasks from Supabase ----
  async function load() {
    if (!user) return;
    setError("");
    try {
      const data = await CalendarAPI.list(user.id);
      setTasks(data);
    } catch (err) { setError(err.message); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user]);

  // The dropdown under the title. Choosing a view also resets its anchor to
  // "today" so the user always lands somewhere sensible.
  function chooseView(value) {
    setView(value);

    if (value === "date") setSelectedDate(new Date());
    if (value === "week") setWeekStart(mondayOf(new Date()));
    if (value === "month" || value === "year") setMonthCursor(firstOfMonth(new Date()));
  }

  const cells = useMemo(() => {
    const todayKey = toKey(new Date());

    const dayCell = (date, inMonth = true) => ({
      key: toKey(date),
      name: DAY_NAMES[(date.getDay() + 6) % 7],
      num: date.getDate(),
      month: MONTHS[date.getMonth()],
      inMonth,
      isToday: toKey(date) === todayKey,
      tasks: tasks.filter((task) => task.date === toKey(date)),
    });

    if (view === "date") return [dayCell(selectedDate)];

    if (view === "week") {
      return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return dayCell(date);
      });
    }

    if (view === "month") {
      const start = mondayOf(firstOfMonth(monthCursor));

      return Array.from({ length: 42 }, (_, index) => {
        const date = addDays(start, index);
        return dayCell(date, date.getMonth() === monthCursor.getMonth());
      });
    }

    return [];
  }, [view, selectedDate, weekStart, monthCursor, tasks]);

  const headerLabel =
    view === "date"
      ? selectedDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : view === "week"
        ? weekLabel(weekStart)
        : view === "month"
          ? `${MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`
          : `${monthCursor.getFullYear()}`;

  function step(direction) {
    if (view === "date") setSelectedDate((date) => addDays(date, direction));
    else if (view === "week") setWeekStart((date) => addDays(date, direction * 7));
    else if (view === "month") setMonthCursor((date) => addMonths(date, direction));
    else setMonthCursor((date) => new Date(date.getFullYear() + direction, date.getMonth(), 1));
  }

  // ---- Create / toggle / delete (all persist to Supabase) ----
  async function createTask(e) {
    e.preventDefault();

    try {
      let habitId = null;
      let planId = null;

      // Create the task inside Habit Tracker first.
      if (form.taskType === "habit") {
        const habit = await HabitsAPI.create({
          userId: user.id,
          name: form.title,
          frequency: form.frequency,
        });

        habitId = habit.id;
      }

      // Create the task inside Study Plans first.
      if (form.taskType === "plan") {
        const plan = await PlansAPI.create({
          userId: user.id,
          name: form.title,
        });

        planId = plan.id;
      }

      // Create the calendar task and store its linked habitId or planId.
      await CalendarAPI.create({
        userId: user.id,
        habitId,
        planId,
        title: form.title,
        date: form.date,
        time: form.time,
      });

      setShowCreate(false);
      setForm({
        title: "",
        date: toKey(new Date()),
        time: "09:00",
        taskType: "calendar",
        frequency: "Daily",
      });

      load();
    } catch (err) { setError(err.message); }
  }
  async function toggle(task) {
    try {
      const updated = await CalendarAPI.update(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) { setError(err.message); }
  }

  return (
    <AppShell
      title="Calendar Planner"
      subtitle="Schedule your habits and study plans across the weeks and check them off."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> Add task</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />

      {/* View dropdown, right under the subtitle (Done by WK) */}
      <div className="row gap-8 mb-16" style={{ alignItems: "center" }}>
        <label className="small muted">View:</label>
        <select
          className="select"
          style={{ width: 180 }}
          value={view}
          onChange={(e) => chooseView(e.target.value)}
        >
          <option value="date">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
        {view === "date" && (
          <input
            className="input"
            type="date"
            value={toKey(selectedDate)}
            onChange={(e) => {
              setSelectedDate(new Date(`${e.target.value}T00:00:00`));
            }}
            style={{ width: 170 }}
          />
        )}
      </div>

      {/* Header + navigation */}
      <div className="row mb-16" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-8">
          <CalendarIcon size={18} />
          <span className="section-title" style={{ margin: 0 }}>{headerLabel}</span>
        </div>
        <div className="row gap-8">
          <Button size="sm" onClick={() => step(-1)}>← Prev</Button>
          <Button size="sm" onClick={() => {setSelectedDate(new Date());setWeekStart(mondayOf(new Date()));setMonthCursor(firstOfMonth(new Date()));}} > {view === "year" ? "This year" : "Today"}</Button>
          <Button size="sm" onClick={() => step(1)}>Next →</Button>
        </div>
      </div>

      {/* Legend so the two task colours are clear (WK) */}
      <div className="row gap-16 mb-16" style={{ flexWrap: "wrap" }}>
        <span className="row gap-8 small muted"><span className="cal-swatch plan" /> Study plans</span>
        <span className="row gap-8 small muted"><span className="cal-swatch habit" /> Habits</span>
        <span className="row gap-8 small muted"><span className="cal-swatch done" /> Done</span>
      </div>

      {view === "year" && (
        <div className="grid grid-3">
          {MONTHS.map((monthName, monthIndex) => {
            const year = monthCursor.getFullYear();

            const monthTasks = tasks.filter((task) => {
              const taskDate = new Date(`${task.date}T00:00:00`);

              return (
                taskDate.getFullYear() === year &&
                taskDate.getMonth() === monthIndex
              );
            });

            const completedCount = monthTasks.filter(
              (task) => task.completed
            ).length;

            return (
              <Card
                key={monthName}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setMonthCursor(new Date(year, monthIndex, 1));
                  setView("month");
                }}
              >
                <h3 className="card-title">{monthName}</h3>

                <p className="small muted">
                  {monthTasks.length} task
                  {monthTasks.length === 1 ? "" : "s"}
                </p>

                <p className="small muted">
                  {completedCount} completed
                </p>
              </Card>
            );
          })}
        </div>
      )}


      {view !== "year" && (
        <div
          className={
            "cal-grid" +
            (view === "month" ? " month" : view === "week" ? " week" : " date-view")
          }
        >
          {cells.map((d) => (
            <div
              key={d.key}
              className={
                "cal-day" +
                (d.isToday ? " today" : "") +
                (d.inMonth ? "" : " outside")
              }
            >
              <div className="cal-daynum">
                {view === "date" ? (
                  <span>{d.name}, {d.num} {d.month}</span>
                ) : view === "week" ? (
                  <>
                    <span>{d.name}</span>
                    <span>{d.num}</span>
                  </>
                ) : (
                  <span>{d.num}</span>
                )}
              </div>

              {d.tasks.length === 0 && (
                <span className="small muted">No tasks</span>
              )}

              {d.tasks.map((task) => (
                <span
                  key={task.id}
                  className={
                    "cal-chip" +
                    (task.planId
                      ? " plan"
                      : task.habitId
                        ? " habit"
                        : "") +
                    (task.completed ? " done" : "")
                  }
                  onClick={() => toggle(task)}
                >
                  {task.time} · {task.title}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add-task modal */}
      <Modal open={showCreate} title="Add a calendar task" onClose={() => setShowCreate(false)}>
        <form onSubmit={createTask}>
          <div className="field-group">
            <label className="field">Add task to</label>
            <select
              className="select"
              value={form.taskType}
              onChange={(e) => setForm({ ...form, taskType: e.target.value })}
            >
              <option value="calendar">Calendar only</option>
              <option value="habit">Calendar and Habit Tracker</option>
              <option value="plan">Calendar and Study Plans</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field">Task title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Revise data structures" />
          </div>
          {form.taskType === "habit" && (
            <div className="field-group">
              <label className="field">Frequency</label>
              <select
                className="select"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              >
                <option value="Daily">Daily</option>
                <option value="Weekdays">Weekdays</option>
                <option value="Weekly">Weekly</option>
                <option value="3x per week">3x per week</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          )}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field-group">
              <label className="field">Date</label>
              <input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field">Time</label>
              <input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <Button variant="primary" className="btn-block" type="submit">Add to calendar <ArrowRightIcon size={15} /></Button>
        </form>
      </Modal>
    </AppShell>
  );
}
