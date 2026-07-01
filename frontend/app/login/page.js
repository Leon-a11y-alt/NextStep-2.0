"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { AuthAPI } from "@/lib/api";

const YEARS = ["Year 1", "Year 2", "Year 3"];
const DIPLOMAS = [
  "Diploma in Information Technology",
  "Diploma in Applied AI & Analytics",
  "Diploma in Cybersecurity & Digital Forensics",
  "Diploma in Business",
  "Diploma in Engineering",
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState("alex@rp.edu.sg");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState("Year 1");
  const [diploma, setDiploma] = useState(DIPLOMAS[0]);

  // Start in register mode if the URL says ?mode=register.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") setMode("register");
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await AuthAPI.login(email, password);
      } else {
        data = await AuthAPI.register({ name, email, password, yearLevel, diploma });
      }
      login(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick-fill helpers so the demo is friction-free.
  function fillDemo(kind) {
    setMode("login");
    if (kind === "admin") { setEmail("admin@rp.edu.sg"); setPassword("admin123"); }
    else { setEmail("alex@rp.edu.sg"); setPassword("password123"); }
  }

  return (
    <div className="auth-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Link href="/" className="brand mb-24" style={{ justifyContent: "center", display: "flex", fontSize: 22 }}>
          <Logo size={38} />
        </Link>

        <Card>
          <h1 style={{ fontSize: 22, fontWeight: 750 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="muted small mt-8 mb-16">
            {mode === "login"
              ? "Log in to continue turning advice into action."
              : "Join NextStep and start building better study habits."}
          </p>

          {error && <div className="banner mb-16" style={{ background: "var(--red-050)", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="field-group">
                <label className="field">Full name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Tan" required />
              </div>
            )}

            <div className="field-group">
              <label className="field">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@rp.edu.sg" required />
            </div>

            <div className="field-group">
              <label className="field">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            {mode === "register" && (
              <>
                <div className="field-group">
                  <label className="field">Year level</label>
                  <div className="chip-row">
                    {YEARS.map((y) => (
                      <button type="button" key={y}
                        className={"filter-chip" + (yearLevel === y ? " active" : "")}
                        onClick={() => setYearLevel(y)}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label className="field">Diploma</label>
                  <select className="select" value={diploma} onChange={(e) => setDiploma(e.target.value)}>
                    {DIPLOMAS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field">Role</label>
                  <input className="input" value="User" disabled />
                  <p className="small muted mt-8">New accounts are created as <strong>User</strong>. Admin access is granted by a moderator.</p>
                </div>
              </>
            )}

            <Button variant="primary" className="btn-block" type="submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <div className="divider" />

          <div className="center small muted">
            {mode === "login" ? (
              <>New here? <button className="btn btn-sm btn-ghost" onClick={() => { setMode("register"); setError(""); }}>Create an account</button></>
            ) : (
              <>Already have an account? <button className="btn btn-sm btn-ghost" onClick={() => { setMode("login"); setError(""); }}>Log in</button></>
            )}
          </div>
        </Card>

        {/* Demo credentials — handy during the presentation */}
        <Card className="mt-16" style={{ background: "var(--surface-2)" }}>
          <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>Demo accounts</div>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            <Button size="sm" onClick={() => fillDemo("user")}>Student: alex@rp.edu.sg</Button>
            <Button size="sm" onClick={() => fillDemo("admin")}>Admin: admin@rp.edu.sg</Button>
          </div>
          <p className="small muted mt-8">Passwords: <code>password123</code> (student) &middot; <code>admin123</code> (admin)</p>
        </Card>
      </div>
    </div>
  );
}
