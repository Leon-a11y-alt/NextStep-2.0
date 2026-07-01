"use client";
// Client wrapper so we can use the AuthProvider (which needs the browser)
// inside the root layout, which is a server component by default.
import React from "react";
import { AuthProvider } from "@/lib/auth";

export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
