"use client";
// Lightweight client-side auth for the prototype.
// Stores the logged-in user in React context + localStorage so a refresh
// keeps you signed in. (Real JWT/session handling comes later.)
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "nextstep_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Load any saved user once, on first mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch (e) { /* ignore */ }
    setReady(true);
  }, []);

  const login = (userObj) => {
    setUser(userObj);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj)); } catch (e) {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
