"use client";
// AI Study Help — search a course/module name and get recommended Cisco
// NetAcad modules with a reason for each, plus a one-click way to turn the
// recommendations into a study plan.
//
// BACKEND OWNER TODO:
//   Implement POST /api/help/recommend (see lib/api.js + TEAM_HANDOFF.md).
//   The Express endpoint should call the n8n webhook (which queries the AI /
//   NetAcad catalogue), cache the result in the `recommendations` table, and
//   return the same shape as DEMO_RESULTS below. Keep the cache as fallback
//   so the live demo never depends on n8n being up.
import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HelpAPI, PlansAPI } from "@/lib/api";
import { SearchIcon, SparkIcon, ExternalIcon, PlusIcon } from "@/lib/icons";

// Demo response mirroring what the n8n/AI backend should return.
const DEMO_RESULTS = {
  "operating system": [
    {
      id: 1, module: "Operating Systems Basics", provider: "Cisco Networking Academy", match: 95,
      url: "https://www.netacad.com/courses/operating-systems-basics",
      reason: "Covers processes, memory and file systems from zero — the best starting point if you don't know where to begin.",
      topics: ["Processes & threads", "Memory management", "File systems"],
    },
    {
      id: 2, module: "Linux Essentials", provider: "Cisco Networking Academy", match: 82,
      url: "https://www.netacad.com/courses/linux-essentials",
      reason: "Hands-on practice with a real OS — reinforces the theory with commands you can actually run.",
      topics: ["Linux CLI", "Users & permissions", "Shell basics"],
    },
    {
      id: 3, module: "Linux Unhatched", provider: "Cisco Networking Academy", match: 70,
      url: "https://www.netacad.com/courses/linux-unhatched",
      reason: "A short beginner course — good if you want a quick win before the heavier modules.",
      topics: ["Basic commands", "Installation"],
    },
  ],
  default: [
    {
      id: 4, module: "Introduction to Cybersecurity", provider: "Cisco Networking Academy", match: 75,
      url: "https://www.netacad.com/courses/introduction-to-cybersecurity",
      reason: "A broad foundation course that matches your search keywords.",
      topics: ["Security basics", "Threats & attacks"],
    },
  ],
};

export default function HelpPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  async function search(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const data = await HelpAPI.recommend(query);
      setResults(data);
      setDemoMode(false);
    } catch {
      // Endpoint not built yet — simulate the AI thinking, then demo data.
      await new Promise((r) => setTimeout(r, 900));
      const key = Object.keys(DEMO_RESULTS).find((k) => query.toLowerCase().includes(k));
      setResults(DEMO_RESULTS[key] || DEMO_RESULTS.default);
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }

  async function addAsPlan(rec) {
    try {
      await PlansAPI.create({ userId: user.id, name: rec.module, module: rec.provider });
      flash(`Study plan created from "${rec.module}"`);
    } catch {
      flash(`(Demo) "${rec.module}" would become a study plan once /api/plans exists.`);
    }
  }

  return (
    <AppShell
      title="Study Help"
      subtitle="Tell us what you're struggling with — the AI finds the right Cisco NetAcad modules for it."
    >
      <ApiErrorBanner error={error} onRetry={search} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}

      {/* Search */}
      <Card className="mb-24">
        <form onSubmit={search} className="row gap-12" style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 11, color: "var(--muted)" }}><SearchIcon size={18} /></span>
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder='Try "Operating system" or a module you find difficult…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="primary" type="submit" disabled={loading}>
            <SparkIcon size={16} /> {loading ? "Thinking…" : "Ask AI"}
          </Button>
        </form>
        <p className="small muted mt-8" style={{ marginBottom: 0 }}>
          Powered by an n8n workflow that searches the Cisco Networking Academy catalogue used by RP.
        </p>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="center" style={{ padding: 40 }}>
          <div className="stat-icon mb-16" style={{ background: "var(--violet-050)", color: "var(--violet)", margin: "0 auto 12px" }}><SparkIcon size={22} /></div>
          <p className="muted">Checking the NetAcad catalogue for &ldquo;{query}&rdquo;…</p>
        </Card>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          {demoMode && (
            <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
              Demo data — <code>/api/help/recommend</code> (n8n webhook) isn&rsquo;t connected yet (see TEAM_HANDOFF.md).
            </div>
          )}
          <div className="stack gap-16">
            {results.map((rec) => (
              <Card key={rec.id} hover>
                <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div className="row gap-12">
                    <div className="stat-icon" style={{ background: "var(--violet-050)", color: "var(--violet)", width: 40, height: 40 }}>
                      <SparkIcon size={20} />
                    </div>
                    <div>
                      <div className="card-title">{rec.module}</div>
                      <div className="small muted">{rec.provider}</div>
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ height: "fit-content" }}>{rec.match}% match</span>
                </div>

                <p className="small mt-16" style={{ lineHeight: 1.5 }}>
                  <strong>Why this module:</strong> {rec.reason}
                </p>

                <div className="chip-row mt-8">
                  {rec.topics.map((t) => <span key={t} className="filter-chip" style={{ cursor: "default" }}>{t}</span>)}
                </div>

                <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
                  <a href={rec.url} target="_blank" rel="noreferrer">
                    <Button variant="primary" size="sm"><ExternalIcon size={15} /> Open on NetAcad</Button>
                  </a>
                  <Button size="sm" onClick={() => addAsPlan(rec)}><PlusIcon size={15} /> Turn into a study plan</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Empty state before first search */}
      {!results && !loading && (
        <div className="empty">
          Ask something like <em>&ldquo;I don&rsquo;t know where to start with Operating Systems&rdquo;</em> —
          you&rsquo;ll get recommended modules, why they fit, and a one-click study plan.
        </div>
      )}
    </AppShell>
  );
}
