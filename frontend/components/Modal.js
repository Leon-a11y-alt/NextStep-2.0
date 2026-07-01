"use client";
import React from "react";
import { XIcon } from "@/lib/icons";

// Small reusable modal for the "create" forms (post / habit / task).
export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row mb-16" style={{ justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close"><XIcon size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
