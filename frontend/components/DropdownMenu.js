import React, { useRef, useEffect, useState } from "react";
import { KebabIcon } from "@/lib/icons";

export default function DropdownMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          display: "grid",
          placeItems: "center",
          borderRadius: 6,
          color: "var(--muted)",
          transition: "background .15s ease, color .15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface-3)";
          e.currentTarget.style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--muted)";
        }}
        aria-label="More options"
        title="More options"
      >
        <KebabIcon size={18} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--shadow)",
            zIndex: 100,
            minWidth: 140,
            overflow: "hidden",
          }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "none",
                background: "transparent",
                color: item.variant === "danger" ? "var(--red)" : "var(--text)",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 550,
                transition: "background .12s ease",
                borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.variant === "danger" ? "rgba(220, 38, 38, 0.08)" : "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
