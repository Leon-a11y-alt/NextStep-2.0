// Simple surface container used everywhere.
import React from "react";

export default function Card({ hover = false, className = "", children, ...props }) {
  const cls = ["card", hover ? "card-hover" : "", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
