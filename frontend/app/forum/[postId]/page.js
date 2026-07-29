"use client";
// Post detail page — shows a single post with all its comments
// Includes sorting controls for comments
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import DropdownMenu from "@/components/DropdownMenu";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { PostsAPI, CommentsAPI, HabitsAPI, PlansAPI } from "@/lib/api";
import { ArrowLeftIcon, UpIcon, DownIcon, TargetIcon, BookmarkIcon, KebabIcon } from "@/lib/icons";

const FORUM = {
  study: {
    actionLabel: "Add to Study Planner",
    modalTitle: "Add to Study Planner",
    nameLabel: "Study plan name",
    namePlaceholder: "e.g. Practise Python on W3Schools",
    savedMsg: "Added to your study planner!",
  },
  habit: {
    actionLabel: "Add to Habit Tracker",
    modalTitle: "Add to Habit Tracker",
    nameLabel: "Habit name",
    namePlaceholder: "e.g. Play 1 game of chess to de-stress",
    savedMsg: "Added to your habit tracker!",
  },
};

const NAME_MAX = 160;

function VotePill({ up, down, voted, onUp, onDown }) {
  const score = (up || 0) - (down || 0);
  return (
    <span className="vote-group">
      <button className="vote-arrow up" disabled={voted} onClick={onUp} title="Upvote" aria-label="Upvote"><UpIcon size={15} /></button>
      <span className="vote-score">{score}</span>
      <button className="vote-arrow down" disabled={voted} onClick={onDown} title="Downvote" aria-label="Downvote"><DownIcon size={15} /></button>
    </span>
  );
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.postId;
  const { user } = useAuth();
  const { mode } = useMode();
  const forumType = mode === "habit" ? "habit" : "study";
  const copy = FORUM[forumType];

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentSort, setCommentSort] = useState("newest");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // "Add to planner" modal
  const [target, setTarget] = useState(null);
  const [targetForm, setTargetForm] = useState({ name: "", frequency: "Daily" });

  // Report modal
  const [reportTarget, setReportTarget] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: "", details: "" });

  useEffect(() => {
    if (!postId) return;
    load();
    // eslint-disable-next-line
  }, [postId, commentSort]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const postData = await PostsAPI.getById(Number(postId), user?.id);
      setPost(postData);
      const commentsData = await CommentsAPI.list(Number(postId), commentSort);
      setComments(commentsData);
    } catch (err) {
      setError(err.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  }

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  async function votePost(kind) {
    if (!user?.id) {
      setError("Please log in to vote.");
      return;
    }
    try {
      const updated = kind === "up"
        ? await PostsAPI.upvote(post.id, user.id)
        : await PostsAPI.downvote(post.id, user.id);
      setPost(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function voteComment(comment, kind) {
    if (!user?.id) {
      setError("Please log in to vote.");
      return;
    }
    try {
      const updated = kind === "up"
        ? await CommentsAPI.like(comment.id, user.id)
        : await CommentsAPI.dislike(comment.id, user.id);
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitReply(e) {
    e.preventDefault();
    const text = replyDraft.trim();
    if (!text) return;
    setSaving(true);
    try {
      await CommentsAPI.create({
        postId: Number(postId),
        userId: user.id,
        author: user.name,
        authorYear: user.yearLevel,
        text,
      });
      setReplyDraft("");
      flash("Your reply was posted!");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openPlanner({ text, author, authorYear, isReply }) {
    setTarget({ text, author, authorYear, isReply });
    setTargetForm({ name: text.slice(0, 80), frequency: "Daily" });
  }

  async function confirmAddToPlanner(e) {
    e.preventDefault();
    const name = targetForm.name.trim();
    if (!name) {
      setError("Please enter a name before saving.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (forumType === "habit") {
        await HabitsAPI.create({
          userId: user.id,
          name: name.slice(0, NAME_MAX),
          frequency: targetForm.frequency,
          sourcePostId: Number(postId) || null,
        });
      } else {
        await PlansAPI.create({
          userId: user.id,
          name: name.slice(0, NAME_MAX),
          message: target.text,
          frequency: targetForm.frequency,
          sourcePostId: Number(postId) || null,
          lessons: [name.slice(0, 240)],
        });
      }
      flash(copy.savedMsg);
      setTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEditComment(comment) {
    setEditingComment(comment);
    setEditCommentText(comment.text || "");
  }

  async function saveEditedComment(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const updated = await CommentsAPI.update(editingComment.id, { text: editCommentText });
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingComment(null);
      setEditCommentText("");
      flash("Your reply was updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteComment(comment) {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await CommentsAPI.remove(comment.id, user?.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      flash("Your reply was deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReport(e) {
    e.preventDefault();
    if (!reportTarget || saving) return;
    setSaving(true);
    try {
      // In a real app, this would send to a /api/reports endpoint
      flash(`Report submitted for ${reportTarget.type}. Thank you for helping keep the forum safe.`);
      setReportTarget(null);
      setReportForm({ reason: "", details: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const canManageComment = (c) =>
    Boolean(user?.id && (user?.role === "admin" || (c.userId && Number(c.userId) === Number(user.id))));

  if (loading) {
    return (
      <AppShell title="Loading..." subtitle="">
        <div className="empty">Loading post...</div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title="Post not found" subtitle="">
        <Card>
          <p className="empty">This post could not be found.</p>
          <Button variant="primary" onClick={() => router.back()}>
            <ArrowLeftIcon size={16} /> Go back
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={post.title} subtitle={post.category}>
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && (
        <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }} role="status">
          {notice}
        </div>
      )}

      <Button size="sm" variant="ghost" onClick={() => router.back()} style={{ marginBottom: 16 }}>
        <ArrowLeftIcon size={16} /> Back to forum
      </Button>

      {/* The post */}
      <Card className="mb-24">
        <div className="row gap-8" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="row gap-8" style={{ alignItems: "center" }}>
            <Avatar name={post.author} size={32} />
            <div>
              <div className="small" style={{ fontWeight: 700 }}>{post.author}</div>
              <div className="small muted">{post.authorYear}</div>
            </div>
          </div>
          <DropdownMenu items={[
            { label: "Report", onClick: () => setReportTarget({ type: "post", id: post.id, author: post.author, content: post.title }) }
          ]} />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{post.title}</h1>
        <p style={{ marginBottom: 16, lineHeight: 1.5 }}>{post.content}</p>

        <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <VotePill up={post.upvotes} down={post.downvotes}
            onUp={() => votePost("up")} onDown={() => votePost("down")} />
          <span className="small muted">{comments.length} {comments.length === 1 ? "reply" : "replies"}</span>
          <Button size="sm" variant="primary"
            onClick={() => openPlanner({
              text: post.content,
              author: post.author,
              authorYear: post.authorYear,
              isReply: false,
            })}>
            {forumType === "habit" ? <TargetIcon size={14} /> : <BookmarkIcon size={14} />} {copy.actionLabel}
          </Button>
        </div>
      </Card>

      {/* Comments sorting */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <label htmlFor="comment-sort-detail" className="field">Sort replies</label>
        <select id="comment-sort-detail" value={commentSort} onChange={(e) => setCommentSort(e.target.value)} className="select" style={{ width: "auto", minWidth: 140 }}>
          <option value="newest">Newest</option>
          <option value="mostLiked">Most Liked</option>
          <option value="mostDisliked">Most Disliked</option>
        </select>
      </div>

      {/* All comments */}
      {comments.length === 0 ? (
        <Card className="mb-24">
          <p className="empty">No replies yet. Be the first to reply!</p>
        </Card>
      ) : (
        <div className="stack gap-12 mb-24">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <div className="row gap-8" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="row gap-8" style={{ alignItems: "center" }}>
                  <Avatar name={comment.author} size={28} />
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>{comment.author}</div>
                    <div className="small muted">{comment.authorYear}</div>
                  </div>
                </div>
                <DropdownMenu items={[
                  { label: "Report", onClick: () => setReportTarget({ type: "comment", id: comment.id, author: comment.author, content: comment.text }) },
                  ...(canManageComment(comment) ? [
                    { label: "Edit", onClick: () => handleEditComment(comment) },
                    { label: "Delete", variant: "danger", onClick: () => handleDeleteComment(comment) }
                  ] : [])
                ]} />
              </div>

              <p style={{ marginBottom: 12, lineHeight: 1.5 }}>{comment.text}</p>

              <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <VotePill up={comment.likes} down={comment.dislikes}
                  onUp={() => voteComment(comment, "up")} onDown={() => voteComment(comment, "down")} />
                <Button size="sm" variant="primary"
                  onClick={() => openPlanner({
                    text: comment.text,
                    author: comment.author,
                    authorYear: comment.authorYear,
                    isReply: true,
                  })}>
                  {forumType === "habit" ? <TargetIcon size={14} /> : <BookmarkIcon size={14} />} {copy.actionLabel}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply composer */}
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Write a reply</h3>
        <form onSubmit={submitReply} className="row gap-8">
          <textarea className="input" style={{ flex: 1, minHeight: 80, padding: 12 }} placeholder="Share your advice…"
            aria-label="Write a reply"
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)} />
          <Button variant="primary" type="submit" disabled={saving || !replyDraft.trim()} style={{ alignSelf: "flex-start" }}>
            {saving ? "Posting…" : "Reply"}
          </Button>
        </form>
      </Card>

      {/* Add-to-planner modal */}
      <Modal open={!!target} title={copy.modalTitle} onClose={() => setTarget(null)}>
        {target && (
          <form onSubmit={confirmAddToPlanner}>
            <div className="small muted mb-16" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, borderLeft: "3px solid var(--primary)" }}>
              <strong>{target.author}</strong> ({target.authorYear}) {target.isReply ? "replied" : "asked"}:<br />
              &ldquo;{target.text}&rdquo;
            </div>
            <div className="field-group">
              <label className="field" htmlFor="t-name">
                {copy.nameLabel} <span className="muted">(edit it the way you&rsquo;ll actually do it)</span>
              </label>
              <textarea id="t-name" className="textarea" required rows={3} maxLength={NAME_MAX}
                value={targetForm.name}
                onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
                placeholder={copy.namePlaceholder} />
              <p className="small muted mt-8" style={{ marginBottom: 0 }}>{targetForm.name.length}/{NAME_MAX}</p>
            </div>
            <div className="field-group">
              <label className="field" htmlFor="t-frequency">Frequency</label>
              <select id="t-frequency" className="select" value={targetForm.frequency} onChange={(e) => setTargetForm({ ...targetForm, frequency: e.target.value })}>
                {["Daily", "Weekdays", "Weekly", "3x per week", "Monthly"].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <Button variant="primary" className="btn-block" type="submit" disabled={saving || !targetForm.name.trim()}>
              {saving ? "Saving…" : copy.actionLabel}
            </Button>
          </form>
        )}
      </Modal>

      {/* Edit reply modal */}
      <Modal open={!!editingComment} title="Edit reply" onClose={() => { setEditingComment(null); setEditCommentText(""); }}>
        {editingComment && (
          <form onSubmit={saveEditedComment}>
            <div className="field-group">
              <label className="field" htmlFor="e-reply">Reply</label>
              <textarea id="e-reply" className="textarea" required rows={4} value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} />
            </div>
            <Button variant="primary" className="btn-block" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}
      </Modal>

      {/* Report post/comment modal */}
      <Modal open={!!reportTarget} title={`Report this ${reportTarget?.type || "content"}`} onClose={() => setReportTarget(null)}>
        {reportTarget && (
          <form onSubmit={handleReport}>
            <div className="small muted mb-16" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, borderLeft: "3px solid var(--red)" }}>
              <strong>{reportTarget.author}</strong>:<br />
              &ldquo;{reportTarget.content}&rdquo;
            </div>
            <div className="field-group">
              <label className="field" htmlFor="report-reason">Reason for report</label>
              <select id="report-reason" className="select" required value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}>
                <option value="">Select a reason</option>
                <option value="spam">Spam or advertisement</option>
                <option value="abusive">Abusive or harassing language</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="misinformation">Misinformation or false claims</option>
                <option value="off-topic">Off-topic or irrelevant</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field" htmlFor="report-details">Additional details (optional)</label>
              <textarea id="report-details" className="textarea" rows={3} value={reportForm.details} onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })} placeholder="Provide more context if needed…" />
            </div>
            <div className="small muted mb-16">
              Our moderation team will review your report within 24 hours.
            </div>
            <Button variant="primary" className="btn-block" type="submit" disabled={saving || !reportForm.reason}>
              {saving ? "Submitting…" : "Submit report"}
            </Button>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
