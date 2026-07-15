"use client";
// Study Plans — Done by Khaing Khant Zaw
//
// A "study plan" is a module (e.g. "Biology") that holds a list of lessons.
// Ticking a lesson off auto-computes the plan's progress (done / total).
//
// How the data flows (the request path to explain in the demo):
//   this page  ->  lib/api.js (PlansAPI)  ->  /api/plans route
//              ->  plans.controller  ->  plans.repo  ->  study_plans + lessons tables (Supabase)
//
// Each plan can also be pushed into two other features:
//   • "Add to calendar"  -> creates a calendar_task linked by planId
//   • "Focus on this"     -> opens the Focus Timer pre-set to this plan
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { PlansAPI, CalendarAPI } from "@/lib/api";
import { PlusIcon, BookIcon, CheckIcon, ChevronDownIcon, CalendarIcon, ClockIcon } from "@/lib/icons";

// Today's date as "YYYY-MM-DD" (used to prefill the calendar date picker).
const todayKey = () => new Date().toISOString().slice(0, 10);

// A plan's progress bar % = completed lessons / total lessons.
function progressOf(plan) {
  if (!plan.lessons.length) return 0;
  return Math.round((plan.lessons.filter((l) => l.completed).length / plan.lessons.length) * 100);
}

export default function PlansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(null);      // which plan card is open
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", module: "" });
  const [lessonFor, setLessonFor] = useState(null);    // plan we're adding a lesson to
  const [lessonTitle, setLessonTitle] = useState("");
  const [calendarFor, setCalendarFor] = useState(null); // plan being scheduled onto the calendar
  const [calForm, setCalForm] = useState({ date: todayKey(), time: "09:00" });

  // Fetch this user's plans (each already comes with its lessons nested).
  async function load() {
    if (!user?.id) return;
    setError("");
    try { setPlans(await PlansAPI.list(user.id)); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  // ---- Create a plan ----
  async function createPlan(e) {
    e.preventDefault();
    try {
      await PlansAPI.create({ userId: user.id, ...form });
      setShowCreate(false); setForm({ name: "", module: "" });
      load();
    } catch (err) { setError(err.message); }
  }

  // ---- Add a lesson (bullet topic) to a plan ----
  async function addLesson(e) {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    try {
      await PlansAPI.addLesson(lessonFor.id, { title: lessonTitle });
      setLessonFor(null); setLessonTitle("");
      load();
    } catch (err) { setError(err.message); }
  }

  // ---- Tick a lesson done / not-done (updates the plan's progress) ----
  async function toggleLesson(plan, lesson) {
    try {
      await PlansAPI.toggleLesson(plan.id, lesson.id, !lesson.completed);
      load();
    } catch (err) { setError(err.message); }
  }

  async function removePlan(plan) {
    try { await PlansAPI.remove(plan.id); load(); } catch (err) { setError(err.message); }
  }

  // ---- Add a plan to the Calendar ----
  // Creates a calendar_task carrying planId, so the calendar knows it came
  // from a study plan. Persists to Supabase via CalendarAPI.
  function openCalendar(plan) {
    setCalendarFor(plan);
    setCalForm({ date: todayKey(), time: "09:00" });
  }
  async function scheduleToCalendar(e) {
    e.preventDefault();
    try {
      await CalendarAPI.create({
        userId: user.id,
        planId: calendarFor.id,
        title: calendarFor.name,
        date: calForm.date,
        time: calForm.time,
      });
      setCalendarFor(null);
      flash(`"${calendarFor.name}" added to your calendar.`);
    } catch (err) { setError(err.message); }
  }

  // ---- Focus on a plan ----
  // Sends the plan id to the Focus Timer via the URL; the timer pre-selects it
  // so a finished session is logged against this plan.
  function focusOnPlan(plan) {
    router.push(`/timer?plan=${plan.id}`);
  }

  const totalLessons = plans.reduce((n, p) => n + p.lessons.length, 0);
  const doneLessons = plans.reduce((n, p) => n + p.lessons.filter((l) => l.completed).length, 0);

  return (
    <AppShell
      title="Study Plans"
      subtitle="Break each module into lessons, track your progress, and schedule or focus on it."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> New study plan</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}

      {/* Summary numbers (same figures the dashboard shows) */}
      <div className="grid grid-3 mb-24">
        <Card className="center"><div className="stat-value" style={{ color: "var(--primary)" }}>{plans.length}</div><div className="stat-label">Study plans</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--green)" }}>{doneLessons}</div><div className="stat-label">Lessons completed</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--violet)" }}>{totalLessons - doneLessons}</div><div className="stat-label">Lessons remaining</div></Card>
      </div>

      {/* One card per plan; click the header to expand its lessons + actions */}
      <div className="stack gap-16">
        {plans.length === 0 && <div className="empty">No study plans yet. Create one for a module you&rsquo;re taking.</div>}
        {plans.map((plan) => {
          const pct = progressOf(plan);
          const open = expanded === plan.id;
          return (
            <Card key={plan.id}>
              <div className="row" style={{ justifyContent: "space-between", gap: 10, cursor: "pointer" }} onClick={() => setExpanded(open ? null : plan.id)}>
                <div className="row gap-12">
                  <div className="stat-icon" style={{ background: "var(--primary-050)", color: "var(--primary-600)", width: 40, height: 40 }}>
                    <BookIcon size={20} />
                  </div>
                  <div>
                    <div className="card-title">{plan.name}</div>
                    <div className="small muted">{plan.module} &middot; {plan.lessons.filter((l) => l.completed).length}/{plan.lessons.length} lessons done</div>
                  </div>
                </div>
                <div className="row gap-12">
                  <span className="small" style={{ fontWeight: 700 }}>{pct}%</span>
                  <span style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><ChevronDownIcon size={18} /></span>
                </div>
              </div>

              <div className="mt-16"><div className="progress"><span style={{ width: `${pct}%` }} /></div></div>

              {open && (
                <div className="mt-16">
                  <div className="stack gap-8">
                    {plan.lessons.length === 0 && <p className="muted small">No lessons yet — add the topics you need to cover.</p>}
                    {plan.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => toggleLesson(plan, lesson)}
                        className="row gap-12"
                        style={{
                          padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10,
                          border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", width: "100%",
                          opacity: lesson.completed ? 0.65 : 1,
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", flexShrink: 0,
                          background: lesson.completed ? "var(--green)" : "var(--surface)",
                          color: "#fff", border: lesson.completed ? "none" : "1px solid var(--border-strong)",
                        }}>
                          {lesson.completed && <CheckIcon size={14} />}
                        </span>
                        <span className="small" style={{ textDecoration: lesson.completed ? "line-through" : "none" }}>{lesson.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Actions: connect this plan to the Calendar and the Focus Timer */}
                  <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
                    <Button size="sm" onClick={() => setLessonFor(plan)}><PlusIcon size={14} /> Add lesson</Button>
                    <Button size="sm" variant="primary" onClick={() => openCalendar(plan)}><CalendarIcon size={14} /> Add to calendar</Button>
                    <Button size="sm" onClick={() => focusOnPlan(plan)}><ClockIcon size={14} /> Focus on this</Button>
                    <Button size="sm" variant="danger" onClick={() => removePlan(plan)}>Delete plan</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create-plan modal */}
      <Modal open={showCreate} title="New study plan" onClose={() => setShowCreate(false)}>
        <form onSubmit={createPlan}>
          <div className="field-group">
            <label className="field">Subject name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Biology" />
          </div>
          <div className="field-group">
            <label className="field">Module <span className="muted">(optional)</span></label>
            <input className="input" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} placeholder="e.g. C205 Biology Fundamentals" />
          </div>
          <Button variant="primary" className="btn-block" type="submit">Create plan</Button>
        </form>
      </Modal>

      {/* Add-lesson modal */}
      <Modal open={!!lessonFor} title={`Add a lesson to ${lessonFor?.name || ""}`} onClose={() => setLessonFor(null)}>
        <form onSubmit={addLesson}>
          <div className="field-group">
            <label className="field">Lesson / topic title</label>
            <input className="input" required value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g. CPU scheduling" />
          </div>
          <Button variant="primary" className="btn-block" type="submit">Add lesson</Button>
        </form>
      </Modal>

      {/* Add-to-calendar modal (pick a date + time for this plan) */}
      <Modal open={!!calendarFor} title={`Schedule "${calendarFor?.name || ""}"`} onClose={() => setCalendarFor(null)}>
        <form onSubmit={scheduleToCalendar}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field-group">
              <label className="field">Date</label>
              <input className="input" type="date" required value={calForm.date} onChange={(e) => setCalForm({ ...calForm, date: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field">Time</label>
              <input className="input" type="time" value={calForm.time} onChange={(e) => setCalForm({ ...calForm, time: e.target.value })} />
            </div>
          </div>
          <Button variant="primary" className="btn-block" type="submit"><CalendarIcon size={15} /> Add to calendar</Button>
        </form>
      </Modal>
    </AppShell>
  );
}
