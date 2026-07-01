"use client";
import React from "react";

// Friendly message shown when the frontend cannot reach the Express API.
// This makes demos less scary: it tells you exactly what to check.
export default function ApiErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="banner mb-16">
      Couldn&apos;t reach the API. Make sure the backend is running on{" "}
      <strong>http://localhost:4000</strong> (run <code>npm run dev</code> from the
      project root to start both servers).{" "}
      {onRetry && (
        <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={onRetry}>Retry</button>
      )}
      <div className="small" style={{ marginTop: 6, opacity: .8 }}>Details: {error}</div>
    </div>
  );
}
