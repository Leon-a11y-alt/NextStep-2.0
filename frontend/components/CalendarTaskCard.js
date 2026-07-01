"use client";
import React from "react";
import Card from "./Card";
import Button from "./Button";
import { ClockIcon, CheckIcon } from "@/lib/icons";

// A scheduled calendar task shown in the "upcoming" list.
export default function CalendarTaskCard({ task, onToggle, onDelete }) {
  return (
    <Card className="row" style={{ justifyContent: "space-between", gap: 12 }}>
      <div className="row gap-12">
        <div className="stat-icon" style={{
          width: 40, height: 40,
          background: task.completed ? "var(--green-050)" : "var(--primary-050)",
          color: task.completed ? "var(--green)" : "var(--primary-600)",
        }}>
          <ClockIcon size={20} />
        </div>
        <div>
          <div className="card-title" style={{ textDecoration: task.completed ? "line-through" : "none", fontSize: 15 }}>
            {task.title}
          </div>
          <div className="small muted">{task.date} at {task.time}</div>
        </div>
      </div>
      <div className="row gap-8">
        <Button size="sm" variant={task.completed ? "default" : "success"} onClick={() => onToggle && onToggle(task)}>
          <CheckIcon size={15} /> {task.completed ? "Undo" : "Done"}
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete && onDelete(task)}>Remove</Button>
      </div>
    </Card>
  );
}
