"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import DashboardStatCard from "@/components/DashboardStatCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HabitsAPI, CalendarAPI, PostsAPI } from "@/lib/api";
import { TargetIcon, CheckIcon, CalendarIcon, BookmarkIcon, ArrowRightIcon } from "@/lib/icons";

export default function DashboardPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [posts, setPosts] = useState([]);
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
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Derived numbers for the widgets.
  const totalHabits = habits.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const upcoming = tasks.filter((t) => !t.completed);
  const savedAdvice = habits.filter((h) => h.sourcePostId).length;
  const activeHabits = habits.filter((h) => h.status === "active");
  const avgProgress = activeHabits.length
    ? Math.round(activeHabits.reduce((s, h) => s + h.progress, 0) / activeHabits.length)
    : 0;

  return (
    <AppShell
      title={`Welcome back, ${user?.name?.split(" ")[0] || "student"} 👋`}
      subtitle="Here's your progress and what's coming up next."
    >
      <ApiErrorBanner error={error} onRetry={load} />

      {/* Stat widgets */}
      <div className="grid grid-4 mb-24">
        <DashboardStatCard icon={TargetIcon} tone="blue" value={totalHabits} label="Total habits" />
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
              <h2 className="section-title" style={{ marginBottom: 0 }}>Progress overview</h2>
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
    </AppShell>
  );
}
