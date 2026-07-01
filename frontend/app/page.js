"use client";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { BookIcon, BookmarkIcon, TargetIcon, CalendarIcon, TrackerIcon, ArrowRightIcon } from "@/lib/icons";

// The five steps of the core NextStep flow. This "flow rail" is the
// product's signature visual and repeats on the dashboard.
const flow = [
  { icon: BookIcon, title: "Read advice", desc: "Browse real tips from other students." },
  { icon: BookmarkIcon, title: "Save solution", desc: "Keep the advice that fits you." },
  { icon: TargetIcon, title: "Create plan", desc: "Turn it into a habit or study goal." },
  { icon: CalendarIcon, title: "Add to calendar", desc: "Schedule it with a date and time." },
  { icon: TrackerIcon, title: "Track progress", desc: "Mark it done and watch it grow." },
];

export default function LandingPage() {
  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section className="container" style={{ padding: "72px 24px 40px", textAlign: "center" }}>
        <span className="badge badge-blue mb-16" style={{ margin: "0 auto 16px" }}>
          For Republic Polytechnic students
        </span>
        <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, maxWidth: 760, margin: "0 auto", letterSpacing: "-0.02em" }}>
          Turn student advice into <span style={{ color: "var(--primary)" }}>real action plans</span>.
        </h1>
        <p className="muted mt-16" style={{ fontSize: 18, maxWidth: 620, margin: "16px auto 0" }}>
          NextStep combines a Reddit-style advice forum, a habit &amp; study tracker,
          and a calendar planner — so good advice actually turns into progress.
        </p>
        <div className="row gap-12 mt-24" style={{ justifyContent: "center" }}>
          <Link href="/login?mode=register"><Button variant="primary">Get started <ArrowRightIcon size={16} /></Button></Link>
          <Link href="/login"><Button>Login</Button></Link>
        </div>
      </section>

      {/* Core flow rail (signature element) */}
      <section className="container" style={{ paddingBottom: 24 }}>
        <Card>
          <div className="center mb-16">
            <h2 className="section-title" style={{ marginBottom: 4 }}>How NextStep works</h2>
            <p className="muted small">The core loop that moves you forward.</p>
          </div>
          <div className="flow-rail">
            {flow.map((s) => (
              <div className="flow-step" key={s.title}>
                <div className="fico"><s.icon size={22} /></div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Feature highlights */}
      <section className="container" style={{ padding: "24px 24px 56px" }}>
        <div className="grid grid-3">
          <Card hover>
            <div className="stat-icon mb-16" style={{ background: "var(--primary-050)", color: "var(--primary-600)" }}><BookIcon size={22} /></div>
            <h3 className="card-title mb-8">Advice forum</h3>
            <p className="muted small">Students share study tips, exam prep, internship-rejection recovery and more. Upvote and comment on what works.</p>
          </Card>
          <Card hover>
            <div className="stat-icon mb-16" style={{ background: "var(--violet-050)", color: "var(--violet)" }}><TargetIcon size={22} /></div>
            <h3 className="card-title mb-8">Habit &amp; study tracker</h3>
            <p className="muted small">One click turns advice into a personal habit. Set a frequency, mark progress, and keep your streak going.</p>
          </Card>
          <Card hover>
            <div className="stat-icon mb-16" style={{ background: "var(--green-050)", color: "var(--green)" }}><CalendarIcon size={22} /></div>
            <h3 className="card-title mb-8">Calendar planner</h3>
            <p className="muted small">Schedule habits and study plans with dates and times, then tick them off as you complete them.</p>
          </Card>
        </div>

        <Card className="mt-24 center" style={{ background: "linear-gradient(135deg, var(--primary-050), var(--violet-050))", border: "none" }}>
          <h2 style={{ fontSize: 24, fontWeight: 750 }}>Ready to take your next step?</h2>
          <p className="muted mt-8">Create an account and start turning advice into action.</p>
          <div className="row gap-12 mt-16" style={{ justifyContent: "center" }}>
            <Link href="/login?mode=register"><Button variant="primary">Get started</Button></Link>
            <Link href="/login"><Button>I already have an account</Button></Link>
          </div>
        </Card>
      </section>

      <footer className="container center muted small" style={{ padding: "24px", borderTop: "1px solid var(--border)" }}>
        NextStep &middot; C270 DevOps Essentials midpoint prototype &middot; Republic Polytechnic
      </footer>
    </div>
  );
}
