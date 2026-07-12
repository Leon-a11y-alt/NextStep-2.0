"use client";
import React from "react";
import Card from "./Card";
import Badge from "./Badge";
import Button from "./Button";
import { UpIcon, ChatIcon, PlusIcon } from "@/lib/icons";

// Reddit-style advice post card with upvote column, category, author year,
// the suggested action, and an "Add to My Tracker" button.
export default function PostCard({ post, onUpvote, onAddToTracker, onComment, canEdit, onEdit, canDelete, onDelete, isUpvoted }) {
  return (
    <Card hover className="post-card">
      <div className="vote-col">
        <button className="vote-btn" onClick={() => onUpvote && onUpvote(post)} title={isUpvoted ? "Remove upvote" : "Upvote"} style={{ color: isUpvoted ? "var(--primary)" : undefined }}>
          <UpIcon size={18} />
        </button>
        <span className="vote-count">{post.upvotes}</span>
      </div>

      <div className="grow">
        <div className="row gap-8 mb-8" style={{ flexWrap: "wrap" }}>
          <Badge color="blue">{post.category}</Badge>
          <span className="small muted">Posted by {post.author} &middot; {post.authorYear}</span>
        </div>

        <h3 className="card-title mb-8">{post.title}</h3>
        <p className="muted" style={{ fontSize: 14 }}>{post.content}</p>

        {post.suggestedAction && (
          <div className="mt-16" style={{
            background: "var(--surface-2)", border: "1px dashed var(--border)",
            borderRadius: 10, padding: "10px 12px", fontSize: 13.5,
          }}>
            <strong>Suggested action:</strong> {post.suggestedAction}
          </div>
        )}

        <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
          <Button size="sm" variant="primary" onClick={() => onAddToTracker && onAddToTracker(post)}>
            <PlusIcon size={15} /> Add to My Tracker
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onComment && onComment(post)}>
            <ChatIcon size={15} /> Comment
          </Button>
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => onEdit && onEdit(post)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" onClick={() => onDelete && onDelete(post)}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
