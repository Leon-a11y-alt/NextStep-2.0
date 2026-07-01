// Reusable button. `variant` picks the style, everything else (onClick,
// disabled, type...) is passed straight through.
import React from "react";

export default function Button({ variant = "default", size, className = "", children, ...props }) {
  const variants = {
    default: "btn",
    primary: "btn btn-primary",
    ghost: "btn btn-ghost",
    danger: "btn btn-danger",
    success: "btn btn-success",
  };
  const cls = [variants[variant] || variants.default, size === "sm" ? "btn-sm" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
