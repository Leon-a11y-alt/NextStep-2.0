"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { HomeIcon, ForumIcon, TrackerIcon, CalendarIcon, ShieldIcon } from "@/lib/icons";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/forum", label: "Advice Forum", icon: ForumIcon },
  { href: "/tracker", label: "Habit Tracker", icon: TrackerIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="nav-section">Menu</div>
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={"nav-link" + (pathname === href ? " active" : "")}>
          <span className="ico"><Icon size={19} /></span>
          {label}
        </Link>
      ))}

      {/* Admin link only shows for admin accounts. */}
      {user?.role === "admin" && (
        <>
          <div className="nav-section">Moderation</div>
          <Link href="/admin" className={"nav-link" + (pathname === "/admin" ? " active" : "")}>
            <span className="ico"><ShieldIcon size={19} /></span>
            Admin Panel
          </Link>
        </>
      )}
    </aside>
  );
}
