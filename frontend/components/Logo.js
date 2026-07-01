"use client";
import React from "react";

// Unique NextStep brand mark: three ascending "steps" that read as both a
// staircase and a growth chart — reinforcing the "take your next step" idea.
// Rendered inside a gradient tile, paired with a two-tone wordmark.
export default function Logo({ size = 30, showText = true }) {
  const glyph = Math.round(size * 0.56);
  return (
    <>
      <span className="logo" style={{ width: size, height: size }}>
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="2.5" y="13.5" width="5" height="7.5" rx="1.6" opacity="0.65" />
          <rect x="9.5" y="8.5" width="5" height="12.5" rx="1.6" opacity="0.85" />
          <rect x="16.5" y="3" width="5" height="18" rx="1.6" />
        </svg>
      </span>
      {showText && (
        <span className="brand-text">
          Next<span className="brand-accent">Step</span>
        </span>
      )}
    </>
  );
}
