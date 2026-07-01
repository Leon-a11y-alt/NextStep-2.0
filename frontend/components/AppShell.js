"use client";
// Wraps all logged-in pages with the navbar + sidebar, and guards the
// route: if nobody is logged in, send them to /login.
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppShell({ title, subtitle, actions, children, adminOnly = false }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (adminOnly && user.role !== "admin") router.replace("/dashboard");
  }, [ready, user, adminOnly, router]);

  // While auth is resolving (or redirecting), show a light placeholder.
  if (!ready || !user || (adminOnly && user.role !== "admin")) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="main"><p className="muted">Loading…</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="shell-body">
        <Sidebar />
        <main className="main">
          <div className="page-head row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-sub">{subtitle}</p>}
            </div>
            {actions && <div className="row gap-8">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
