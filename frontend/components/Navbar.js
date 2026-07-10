"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

// Initials for the avatar circle, e.g. "Alex Tan" -> "AT".
function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";
}

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <Link href={user ? "/dashboard" : "/"} className="brand">
        <Logo />
      </Link>

      {user ? (
        <div className="row gap-16">
          <div className="row gap-8 small muted" style={{ textAlign: "right" }}>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text)" }}>{user.name}</div>
              <div>{user.yearLevel} &middot; {user.role === "admin" ? "Admin" : "User"}</div>
            </div>
          </div>
          {/* Log out moved into Settings and Privacy (sidebar). */}
          <div className="avatar">{initials(user.name)}</div>
        </div>
      ) : (
        <div className="row gap-8">
          <Link href="/login" className="btn btn-sm">Login</Link>
          <Link href="/login?mode=register" className="btn btn-sm btn-primary">Get started</Link>
        </div>
      )}
    </header>
  );
}
