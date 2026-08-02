"use client";
import React, { useEffect, useRef, useState } from "react";
import { SortingAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ClockIcon, XIcon, PlusIcon } from "@/lib/icons";

// SpeedPlay — the whole feature, in one file.
//
// The flow:
//   1) You upload your own .txt study notes.
//   2) The backend sends them to Gemini AI, which writes multiple-choice questions.
//   3) You answer as many as you can in 20 seconds.
//   4) You get your SCORE, next to your previous score and your all-time best.
//
// The screen shows one of four phases, stored in `phase`:
//   "upload"  -> choose your notes file (and see your best so far)
//   "loading" -> the AI is writing the questions
//   "play"    -> the 20-second round, with a running score
//   "done"    -> this score vs. your previous score vs. your best
//
// WHY A SCORE INSTEAD OF RIGHT/WRONG
//   Flashing a question green or red tells you about one question and then it is
//   gone. A score you can beat tells you about YOU, and it gives the round a
//   reason to be replayed. So the game never reveals which option was correct —
//   it just moves the number, and the end screen turns that number into the only
//   comparison that matters: better or worse than last time.

const ROUND_SECONDS = 20;

// Scoring. Deliberately simple so a player can work it out in their head:
// every correct answer is worth 10, and answering several in a row adds a
// small bonus that tops out quickly — enough to reward a hot streak, never
// enough to make one lucky run unbeatable.
const POINTS_PER_CORRECT = 10;
const STREAK_BONUS = 2;
const MAX_STREAK_BONUS = 10;

// Scores live in the browser, per user. This mirrors the convention documented
// in lib/playground.js: numbers that must be *true* come from the backend, and
// purely local game state degrades gracefully until a real API exists. Swapping
// this for a server call later means changing only loadRecord/saveRecord.
const STORAGE_PREFIX = "nextstep_speedplay_v1_";
const EMPTY_RECORD = { best: 0, last: null, plays: 0 };

function loadRecord(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + (userId ?? "guest"));
    if (!raw) return EMPTY_RECORD;
    return { ...EMPTY_RECORD, ...JSON.parse(raw) };
  } catch {
    return EMPTY_RECORD; // corrupt or unavailable storage must never break the game
  }
}

function saveRecord(userId, record) {
  try {
    localStorage.setItem(STORAGE_PREFIX + (userId ?? "guest"), JSON.stringify(record));
  } catch {
    /* private mode / quota — the round still works, it just isn't remembered */
  }
}

// Shuffle an array so the questions come in a random order each game.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SpeedPlay({ onClose }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [phase, setPhase] = useState("upload");     // upload | loading | play | done
  const [title, setTitle] = useState("");           // name of the uploaded file
  const [deck, setDeck] = useState([]);             // the questions, shuffled
  const [idx, setIdx] = useState(0);                // which question we are on
  const [score, setScore] = useState(0);            // this round's running score
  const [streak, setStreak] = useState(0);          // consecutive correct (drives the bonus)
  const [answered, setAnswered] = useState(0);      // how many questions were attempted
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [picked, setPicked] = useState(null);       // the option tapped — highlighted, never judged
  const [error, setError] = useState("");

  // record  = what we have stored (best / last / plays)
  // result  = this round frozen at the moment it ended, so the end screen can
  //           show "previous" without it being overwritten by this round's save.
  const [record, setRecord] = useState(EMPTY_RECORD);
  const [result, setResult] = useState(null);

  const fileRef = useRef(null);
  const tickRef = useRef(null);
  const endedRef = useRef(false);

  const current = deck[idx] || null;                // the question on screen

  // Load the stored scores once the user is known.
  useEffect(() => {
    setRecord(loadRecord(userId));
  }, [userId]);

  // STEP 1 + 2: read the .txt file, send the text to the backend (which asks
  // Gemini for questions), then start the quiz.
  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPhase("loading");
    try {
      const content = await file.text();                                      // read the notes
      const quiz = await SortingAPI.upload({ filename: file.name, content }); // backend -> Gemini
      setTitle(quiz.title);
      startGame(quiz.questions);
    } catch (err) {
      setError(err.message || "Could not read that file.");
      setPhase("upload");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // STEP 3: begin the 20-second round.
  function startGame(questions) {
    setDeck(shuffle(questions));
    setIdx(0); setScore(0); setStreak(0); setAnswered(0);
    setTimeLeft(ROUND_SECONDS); setPicked(null); setResult(null);
    endedRef.current = false;
    setPhase("play");
  }

  // Count down one second at a time; stop the game at 0.
  useEffect(() => {
    if (phase !== "play") return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(tickRef.current); endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function endGame() {
    if (endedRef.current) return;
    endedRef.current = true;
    setPhase("done"); // STEP 4: show the score
  }

  // Bank the round the moment we land on "done". This runs as an effect rather
  // than inside endGame() because endGame is called from the timer's closure,
  // where `score` would still be whatever it was when the timer started.
  useEffect(() => {
    if (phase !== "done" || result) return;
    const previous = record.last;                  // the round before this one
    const isBest = score > record.best && score > 0;
    const next = { best: Math.max(record.best, score), last: score, plays: record.plays + 1 };
    saveRecord(userId, next);
    setRecord(next);
    setResult({ score, previous, best: next.best, isBest });
  }, [phase, result, record, score, userId]);

  // Answer the current question by tapping an option.
  //
  // Note what this deliberately does NOT do: it never marks the option green or
  // red. The only signal is the score moving, which keeps the pressure on the
  // clock rather than on being told off for a wrong tap.
  function answer(option) {
    if (endedRef.current || !current || picked) return;
    const ok = option === current.answer;

    if (ok) {
      const bonus = Math.min(streak * STREAK_BONUS, MAX_STREAK_BONUS);
      setScore((n) => n + POINTS_PER_CORRECT + bonus);
      setStreak((n) => n + 1);
    } else {
      setStreak(0);                                 // the bonus resets, the score never drops
    }
    setAnswered((n) => n + 1);

    setPicked({ option });                          // neutral highlight only
    setTimeout(() => {
      setPicked(null);
      // Move to the next question. When we run out, reshuffle and keep going.
      if (idx + 1 >= deck.length) { setDeck((d) => shuffle(d)); setIdx(0); }
      else setIdx(idx + 1);
    }, 200);
  }

  const timePct = (timeLeft / ROUND_SECONDS) * 100;
  const urgent = timeLeft <= 5;

  // How this round compares to the last one — the sentence under the stats.
  function verdict(r) {
    if (r.previous === null) return "First round banked. Play again and you'll have something to beat.";
    if (r.isBest) return `New personal best — ${r.score - r.previous > 0 ? `${r.score - r.previous} better than` : "ahead of"} your last round.`;
    if (r.score > r.previous) return `Up ${r.score - r.previous} on your last round. Your best is still ${r.best}.`;
    if (r.score === r.previous) return `Exactly the same as last round. Your best is ${r.best}.`;
    return `Down ${r.previous - r.score} on your last round. Your best is ${r.best}.`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pg-quiz pg-quiz-arcade pg-sort" onClick={(e) => e.stopPropagation()}>
        <button className="pg-quiz-close" onClick={onClose} aria-label="Close game"><XIcon size={18} /></button>

        {/* PHASE 1 — upload your notes */}
        {phase === "upload" && (
          <div className="pg-sort-pick">
            <h2 className="card-title" style={{ marginBottom: 4 }}>SpeedPlay ⚡</h2>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Upload your notes — the AI turns them into a quiz, then score as many points as you can in 20 seconds.
            </p>

            {/* Your standing scores, so there is a target before you even start. */}
            {record.plays > 0 && (
              <div className="pg-quiz-stats" style={{ marginBottom: 16 }}>
                <div>
                  <div className="stat-value">{record.best}</div>
                  <div className="stat-label">Best score</div>
                </div>
                <div>
                  <div className="stat-value">{record.last ?? "—"}</div>
                  <div className="stat-label">Last score</div>
                </div>
                <div>
                  <div className="stat-value">{record.plays}</div>
                  <div className="stat-label">Rounds played</div>
                </div>
              </div>
            )}

            <div className="pg-upload">
              <div className="pg-upload-head">
                <strong>Upload your notes (.txt)</strong>
                <span className="small muted">Any study notes work — the AI writes the questions for you.</span>
              </div>
              <div className="row gap-8" style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                  <PlusIcon size={14} /> Upload notes
                </button>
                <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={onFile} />
              </div>
              {error && <p className="small" style={{ color: "#f87171", marginTop: 8 }}>{error}</p>}
            </div>
          </div>
        )}

        {/* PHASE 2 — the AI is writing the questions */}
        {phase === "loading" && (
          <div className="pg-quiz-done center">
            <h2 className="card-title" style={{ marginBottom: 6 }}>Reading your notes…</h2>
            <p className="small muted">The AI is writing your quiz questions.</p>
          </div>
        )}

        {/* PHASE 3 — the 20-second round */}
        {phase === "play" && current && (
          <div className="pg-sort-play">
            <div className="pg-quiz-hud">
              <span className={"badge badge-violet" + (urgent ? " pg-time-urgent" : "")}>
                <ClockIcon size={13} /> {timeLeft}s
              </span>
              {/* The score is the only feedback — no tally of right and wrong. */}
              <span className="badge badge-green pg-score-badge" key={score}>⚡ {score}</span>
              {record.best > 0 && (
                <span className="badge muted">Best {record.best}</span>
              )}
            </div>
            <div className={"pg-quiz-timerbar" + (urgent ? " urgent" : "")}><span style={{ width: `${timePct}%` }} /></div>

            <div className="pg-sort-stage">
              <div className="pg-sort-prompt small muted">Question</div>
              <div className="pg-sort-current" style={{ fontSize: 18, lineHeight: 1.35, padding: "0 8px" }}>
                {current.question}
              </div>
            </div>

            <div className={"pg-sort-bins bins-" + current.options.length}>
              {current.options.map((opt) => (
                <button
                  key={opt}
                  className={"pg-sort-bin" + (picked?.option === opt ? " picked" : "")}
                  onClick={() => answer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 4 — your score, against your own history */}
        {phase === "done" && result && (
          <div className="pg-quiz-done center">
            <h2 className="card-title pg-done-title" style={{ marginBottom: 2 }}>TIME&apos;S UP!</h2>
            <p className="small muted" style={{ marginBottom: 16 }}>{title}</p>

            {result.isBest && <p className="pg-praise-static">🏆 New best score!</p>}

            <div className="pg-quiz-stats">
              <div>
                <div className="stat-value pg-score-now">{result.score}</div>
                <div className="stat-label">This round</div>
              </div>
              <div>
                <div className="stat-value">{result.previous ?? "—"}</div>
                <div className="stat-label">Previous</div>
              </div>
              <div>
                <div className="stat-value">{result.best}</div>
                <div className="stat-label">Best</div>
              </div>
            </div>

            <p className="pg-quiz-growth">{verdict(result)}</p>
            <p className="small muted" style={{ marginTop: 6 }}>
              {answered} question{answered === 1 ? "" : "s"} answered in {ROUND_SECONDS} seconds.
            </p>

            <div className="row gap-8" style={{ justifyContent: "center", marginTop: 18 }}>
              <button className="btn" onClick={() => setPhase("upload")}>Try another file</button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
