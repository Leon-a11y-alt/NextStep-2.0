"use client";
// Dashboard — two different dashboards, one per app mode:
//   Study mode: study plans, focus time, study help.
//   Habit mode: habits, streaks, advice saved.
// Both share the calendar + forum data; the study widgets read the same
// endpoints as their feature pages (PlansAPI / FocusAPI) and fall back to
// demo data until those backends exist (see TEAM_HANDOFF.md).
import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import DashboardStatCard from "@/components/DashboardStatCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import GamificationStrip from "@/components/gamification/GamificationStrip";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { HabitsAPI, CalendarAPI, PostsAPI, PlansAPI, FocusAPI } from "@/lib/api";
import {
  TargetIcon, CheckIcon, CalendarIcon, BookmarkIcon, ArrowRightIcon,
  BookIcon, ClockIcon, SparkIcon,
} from "@/lib/icons";

// Demo fallbacks mirroring the feature pages' demo data.
const DEMO_PLANS = [
  { id: 1, name: "Biology", lessons: [{ completed: true }, { completed: true }, { completed: false }, { completed: false }, { completed: false }] },
  { id: 2, name: "Operating Systems", lessons: [{ completed: true }, { completed: false }, { completed: false }] },
];
const DEMO_SESSIONS = [
  { id: 1, habitName: "Solve one coding problem each weekday", minutes: 25, date: new Date().toISOString().slice(0, 10) },
  { id: 2, habitName: "Recap yesterday's topic for 20 minutes", minutes: 45, date: new Date().toISOString().slice(0, 10) },
  { id: 3, habitName: "Solve one coding problem each weekday", minutes: 25, date: "2026-07-06" },
];

const planProgress = (p) =>
  p.lessons.length ? Math.round((p.lessons.filter((l) => l.completed).length / p.lessons.length) * 100) : 0;

export default function DashboardPage() {
  const { user } = useAuth();
  const { mode } = useMode();
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    setError("");
    try {
      const [h, t, p] = await Promise.all([
        HabitsAPI.list(user.id),
        CalendarAPI.list(user.id),
        PostsAPI.list(),
      ]);
      setHabits(h); setTasks(t); setPosts(p);
    } catch (err) {
      setError(err.message);
    }
    // Study widgets: real API first, demo data until the backend exists.
    try { setPlans(await PlansAPI.list(user.id)); } catch { setPlans(DEMO_PLANS); }
    try { setSessions(await FocusAPI.list(user.id)); } catch { setSessions(DEMO_SESSIONS); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Shared numbers.
  const completedTasks = tasks.filter((t) => t.completed).length;
  const upcoming = tasks.filter((t) => !t.completed);
  const savedAdvice = habits.filter((h) => h.sourcePostId).length;
  const activeHabits = habits.filter((h) => h.status === "active");
  const avgProgress = activeHabits.length
    ? Math.round(activeHabits.reduce((s, h) => s + h.progress, 0) / activeHabits.length)
    : 0;

  // Study numbers.
  const today = new Date().toISOString().slice(0, 10);
  const lessonsDone = plans.reduce((n, p) => n + p.lessons.filter((l) => l.completed).length, 0);
  const focusToday = sessions.filter((s) => s.date === today).reduce((n, s) => n + s.minutes, 0);

  const firstName = user?.name?.split(" ")[0] || "student";

  return (
    <AppShell
      title={`Welcome back, ${firstName} 👋`}
      subtitle={mode === "study"
        ? "Here's where your studying stands today."
        : "Here's how your habits are coming along."}
    >
      <ApiErrorBanner error={error} onRetry={load} />

      {/* Gamification: a compact progress strip linking to the full page. */}
      <GamificationStrip />

      {mode === "study" ? (
        <>
          {/* ---- STUDY DASHBOARD ---- */}
          <div className="grid grid-4 mb-24">
            <DashboardStatCard icon={BookIcon} tone="violet" value={plans.length} label="Study plans" />
            <DashboardStatCard icon={CheckIcon} tone="green" value={lessonsDone} label="Lessons completed" />
            <DashboardStatCard icon={ClockIcon} tone="blue" value={`${focusToday}m`} label="Focused today" />
            <DashboardStatCard icon={CalendarIcon} tone="amber" value={upcoming.length} label="Upcoming plans" />
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            {/* Left column */}
            <div className="stack gap-24">
              {/* Study plan progress */}
              <Card>
                <div className="row mb-16" style={{ justifyContent: "space-between" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Study plan progress</h2>
                  <Link href="/plans"><Button size="sm" variant="ghost">View plans <ArrowRightIcon size={14} /></Button></Link>
                </div>
                <div className="stack gap-12">
                  {plans.length === 0 && <p className="muted small">No study plans yet. Create one for a module you&rsquo;re taking.</p>}
                  {plans.slice(0, 4).map((p) => (
                    <div key={p.id} className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{p.name}</span>
                      <div className="row gap-12" style={{ minWidth: 160 }}>
                        <div className="progress grow" style={{ width: 120 }}><span style={{ width: `${planProgress(p)}%` }} /></div>
                        <span className="small muted" style={{ width: 34, textAlign: "right" }}>{planProgress(p)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Focus sessions */}
              <Card>
                <div className="row mb-16" style={{ justifyContent: "space-between" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Recent focus sessions</h2>
                  <Link href="/timer"><Button size="sm" variant="ghost">Start a session <ArrowRightIcon size={14} /></Button></Link>
                </div>
                <div className="stack gap-12">
                  {sessions.length === 0 && <p className="muted small">No sessions yet — try a 25-minute focus session.</p>}
                  {sessions.slice(0, 4).map((s) => (
                    <div key={s.id} className="row" style={{ justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontWeight: 650, fontSize: 14 }}>{s.habitName}</div>
                        <div className="small muted">{s.date}</div>
                      </div>
                      <Badge color="blue">{s.minutes} min</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div className="stack gap-24" style={{ alignSelf: "flex-start" }}>
              <Card>
                <div className="row mb-16" style={{ justifyContent: "space-between" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Upcoming plans</h2>
                  <Link href="/calendar"><Button size="sm" variant="ghost">Calendar <ArrowRightIcon size={14} /></Button></Link>
                </div>
                <div className="stack gap-12">
                  {upcoming.slice(0, 4).map((t) => (
                    <div key={t.id} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
                      <div className="stat-icon" style={{ width: 36, height: 36, background: "var(--primary-050)", color: "var(--primary-600)" }}>
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                        <div className="small muted">{t.date} at {t.time}</div>
                      </div>
                    </div>
                  ))}
                  {upcoming.length === 0 && <p className="muted small">Nothing scheduled. Add a plan from the calendar.</p>}
                </div>
              </Card>

              {/* Study help CTA */}
              <Card className="center" style={{ background: "var(--brand-grad-soft)", border: "none" }}>
                <div className="stat-icon mb-8" style={{ background: "var(--violet-050)", color: "var(--violet)", margin: "0 auto 10px" }}>
                  <SparkIcon size={20} />
                </div>
                <h3 className="card-title mb-8">Stuck on a module?</h3>
                <p className="muted small mb-16">Ask the AI and get the right NetAcad modules for it.</p>
                <Link href="/help"><Button variant="primary" size="sm">Get study help</Button></Link>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ---- HABIT DASHBOARD ---- */}
          <div className="grid grid-4 mb-24">
            <DashboardStatCard icon={TargetIcon} tone="blue" value={habits.length} label="Total habits" />
            <DashboardStatCard icon={CheckIcon} tone="green" value={completedTasks} label="Completed tasks" />
            <DashboardStatCard icon={CalendarIcon} tone="violet" value={upcoming.length} label="Upcoming plans" />
            <DashboardStatCard icon={BookmarkIcon} tone="amber" value={savedAdvice} label="Saved from advice" />
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            {/* Left column */}
            <div className="stack gap-24">
              {/* Progress overview */}
              <Card>
                <div className="row mb-16" style={{ justifyContent: "space-between" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Habit progress</h2>
                  <Link href="/tracker"><Button size="sm" variant="ghost">View tracker <ArrowRightIcon size={14} /></Button></Link>
                </div>
                <div className="row mb-8" style={{ justifyContent: "space-between" }}>
                  <span className="small muted">Average progress across active habits</span>
                  <span className="small" style={{ fontWeight: 700 }}>{avgProgress}%</span>
                </div>
                <div className="progress mb-16"><span style={{ width: `${avgProgress}%` }} /></div>

                <div className="stack gap-12">
                  {activeHabits.length === 0 && <p className="muted small">No active habits yet. Add one from the forum or tracker.</p>}
                  {activeHabits.slice(0, 3).map((h) => (
                    <div key={h.id} className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{h.name}</span>
                      <div className="row gap-12" style={{ minWidth: 160 }}>
                        <div className="progress grow" style={{ width: 120 }}><span style={{ width: `${h.progress}%` }} /></div>
                        <span className="small muted" style={{ width: 34, textAlign: "right" }}>{h.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent forum posts */}
              <Card>
                <div className="row mb-16" style={{ justifyContent: "space-between" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Recent advice</h2>
                  <Link href="/forum"><Button size="sm" variant="ghost">Open forum <ArrowRightIcon size={14} /></Button></Link>
                </div>
                <div className="stack gap-12">
                  {posts.slice(0, 4).map((p) => (
                    <Link key={p.id} href="/forum" className="row" style={{ justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontWeight: 650, fontSize: 14 }}>{p.title}</div>
                        <div className="small muted">{p.author} &middot; {p.authorYear}</div>
                      </div>
                      <Badge color="blue">▲ {p.upvotes}</Badge>
                    </Link>
                  ))}
                  {posts.length === 0 && <p className="muted small">No posts to show.</p>}
                </div>
              </Card>
            </div>

            {/* Right column: upcoming plans */}
            <Card style={{ alignSelf: "flex-start" }}>
              <div className="row mb-16" style={{ justifyContent: "space-between" }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Upcoming plans</h2>
                <Link href="/calendar"><Button size="sm" variant="ghost">Calendar <ArrowRightIcon size={14} /></Button></Link>
              </div>
              <div className="stack gap-12">
                {upcoming.slice(0, 6).map((t) => (
                  <div key={t.id} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
                    <div className="stat-icon" style={{ width: 36, height: 36, background: "var(--primary-050)", color: "var(--primary-600)" }}>
                      <CalendarIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                      <div className="small muted">{t.date} at {t.time}</div>
                    </div>
                  </div>
                ))}
                {upcoming.length === 0 && <p className="muted small">Nothing scheduled. Add a plan from the calendar.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
