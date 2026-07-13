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
import { SearchIcon, SparkIcon, ExternalIcon, PlusIcon, BookIcon, ClockIcon } from "@/lib/icons";

// Demo response mirroring what the backend returns (used only if the API is down).
const DEMO_RESULTS = {
  default: [
    {
      id: 1, module: "Networking Basics", provider: "Cisco Networking Academy",
      level: "Beginner", format: "Self-paced", hours: 22, match: 95,
      url: "https://www.netacad.com/courses/networking-basics",
      description: "Start learning the basics of computer networking and discover how networks work.",
      reason: "A good beginner starting point if you are not sure where to begin.",
      topics: ["networking", "network", "ip address"],
    },
  ],
};

// Banner backgrounds for the course cards (NetAcad-style thumbnails,
// drawn with CSS so no external images are needed).
const BANNERS = [
  "linear-gradient(135deg, #0f2b46 0%, #12766f 100%)",
  "linear-gradient(135deg, #1e2a5a 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #123b2f 0%, #16a34a 100%)",
  "linear-gradient(135deg, #3b2d5e 0%, #7c3aed 100%)",
];

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
      // Backend unreachable — show demo data so the page still works.
      await new Promise((r) => setTimeout(r, 900));
      setResults(DEMO_RESULTS.default);
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
          {/* NetAcad-style course cards */}
          <div className="nc-grid">
            {results.map((rec, i) => (
              <div className="nc-card" key={rec.id}>
                {/* Banner (CSS thumbnail) with level + match badges */}
                <div className="nc-banner" style={{ background: BANNERS[i % BANNERS.length] }}>
                  <SparkIcon size={36} />
                  <span className="nc-level">{rec.level || "Beginner"}</span>
                  <span className="nc-match">{rec.match}% match</span>
                </div>

                <div className="nc-body">
                  <div className="nc-provider">{rec.provider}</div>
                  <div className="nc-meta"><BookIcon size={14} /> Course&nbsp; | &nbsp;{rec.format || "Self-paced"}</div>
                  <div className="nc-title">{rec.module}</div>
                  <p className="nc-desc">{rec.description}</p>
                  <div className="nc-why"><strong>Why this course:</strong> {rec.reason}</div>

                  <div className="nc-foot">
                    <span className="row gap-8"><ClockIcon size={14} /> {rec.hours ? `${rec.hours} Hours` : "Self-paced"}</span>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>Free</span>
                  </div>

                  <div className="row gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                    <a href={rec.url} target="_blank" rel="noreferrer" className="grow">
                      <Button variant="primary" size="sm" className="btn-block"><ExternalIcon size={15} /> Open on NetAcad</Button>
                    </a>
                    <Button size="sm" onClick={() => addAsPlan(rec)}><PlusIcon size={15} /> Study plan</Button>
                  </div>
                </div>
              </div>
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
