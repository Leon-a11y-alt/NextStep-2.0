"use client";
// Study Plan Tracker — a plan is a module (e.g. "Biology") that contains
// lessons/topics. Ticking lessons off auto-computes the plan's progress.
//
// BACKEND OWNER TODO:
//   Implement the PlansAPI endpoints (see lib/api.js + TEAM_HANDOFF.md).
//   Until then this page falls back to DEMO_PLANS so the UI is fully
//   clickable — replace nothing here except deleting DEMO_PLANS once
//   the API works (the try/catch below already prefers the real API).
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { PlansAPI } from "@/lib/api";
import { PlusIcon, BookIcon, CheckIcon, ChevronDownIcon } from "@/lib/icons";

// Demo data mirroring what the real API should return.
const DEMO_PLANS = [
  {
    id: 1,
    name: "Biology",
    module: "C205 Biology Fundamentals",
    lessons: [
      { id: 1, title: "Cell structure & organelles", completed: true },
      { id: 2, title: "Photosynthesis", completed: true },
      { id: 3, title: "Cellular respiration", completed: false },
      { id: 4, title: "Genetics & heredity", completed: false },
      { id: 5, title: "Ecosystems", completed: false },
    ],
  },
  {
    id: 2,
    name: "Operating Systems",
    module: "C270 Operating Systems",
    lessons: [
      { id: 6, title: "Processes & threads", completed: true },
      { id: 7, title: "CPU scheduling", completed: false },
      { id: 8, title: "Memory management", completed: false },
    ],
  },
];

function progressOf(plan) {
  if (!plan.lessons.length) return 0;
  return Math.round((plan.lessons.filter((l) => l.completed).length / plan.lessons.length) * 100);
}

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", module: "" });
  const [lessonFor, setLessonFor] = useState(null); // plan we're adding a lesson to
  const [lessonTitle, setLessonTitle] = useState("");

  async function load() {
    if (!user) return;
    setError("");
    try {
      setPlans(await PlansAPI.list(user.id));
      setDemoMode(false);
    } catch {
      // API not implemented yet — show demo data so the UI is reviewable.
      setPlans(DEMO_PLANS);
      setDemoMode(true);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function createPlan(e) {
    e.preventDefault();
    if (demoMode) {
      setPlans((prev) => [...prev, { id: Date.now(), ...form, lessons: [] }]);
      setShowCreate(false); setForm({ name: "", module: "" });
      return;
    }
    try {
      await PlansAPI.create({ userId: user.id, ...form });
      setShowCreate(false); setForm({ name: "", module: "" });
      load();
    } catch (err) { setError(err.message); }
  }

  async function addLesson(e) {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    if (demoMode) {
      setPlans((prev) => prev.map((p) => p.id === lessonFor.id
        ? { ...p, lessons: [...p.lessons, { id: Date.now(), title: lessonTitle, completed: false }] }
        : p));
      setLessonFor(null); setLessonTitle("");
      return;
    }
    try {
      await PlansAPI.addLesson(lessonFor.id, { title: lessonTitle });
      setLessonFor(null); setLessonTitle("");
      load();
    } catch (err) { setError(err.message); }
  }

  async function toggleLesson(plan, lesson) {
    if (demoMode) {
      setPlans((prev) => prev.map((p) => p.id === plan.id
        ? { ...p, lessons: p.lessons.map((l) => l.id === lesson.id ? { ...l, completed: !l.completed } : l) }
        : p));
      return;
    }
    try {
      await PlansAPI.toggleLesson(plan.id, lesson.id, !lesson.completed);
      load();
    } catch (err) { setError(err.message); }
  }

  async function removePlan(plan) {
    if (demoMode) { setPlans((prev) => prev.filter((p) => p.id !== plan.id)); return; }
    try { await PlansAPI.remove(plan.id); load(); } catch (err) { setError(err.message); }
  }

  const totalLessons = plans.reduce((n, p) => n + p.lessons.length, 0);
  const doneLessons = plans.reduce((n, p) => n + p.lessons.filter((l) => l.completed).length, 0);

  return (
    <AppShell
      title="Study Plans"
      subtitle="Break each module into lessons and track exactly where you are."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> New study plan</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {demoMode && (
        <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
          Demo data — the <code>/api/plans</code> endpoints aren&rsquo;t connected yet (see TEAM_HANDOFF.md).
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-3 mb-24">
        <Card className="center"><div className="stat-value" style={{ color: "var(--primary)" }}>{plans.length}</div><div className="stat-label">Study plans</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--green)" }}>{doneLessons}</div><div className="stat-label">Lessons completed</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--violet)" }}>{totalLessons - doneLessons}</div><div className="stat-label">Lessons remaining</div></Card>
      </div>

      {/* Plan cards */}
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
                  <div className="row gap-8 mt-16">
                    <Button size="sm" onClick={() => setLessonFor(plan)}><PlusIcon size={14} /> Add lesson</Button>
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
    </AppShell>
  );
}
