"use client";
// App mode: "study" or "habit". The mode decides which sidebar features are
// visible and which theme the app wears (indigo for study, warm orange for
// habit — see the html[data-mode="habit"] overrides in globals.css).
import React, { createContext, useContext, useEffect, useState } from "react";

const ModeContext = createContext({ mode: "study", setMode: () => {} });

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState("study");

  // Restore the last-used mode after refresh.
  useEffect(() => {
    const saved = localStorage.getItem("nextstep_mode");
    if (saved === "habit" || saved === "study") {
      setModeState(saved);
      document.documentElement.dataset.mode = saved;
    }
  }, []);

  // Persist + flip the theme only on explicit switches — writing from an
  // effect would clobber the saved value on mount (StrictMode runs effects
  // twice in dev). CSS reads <html data-mode="...">.
  function setMode(next) {
    setModeState(next);
    localStorage.setItem("nextstep_mode", next);
    document.documentElement.dataset.mode = next;
  }

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);
