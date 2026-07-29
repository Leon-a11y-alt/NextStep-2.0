"use client";
import React, { useEffect, useRef, useState } from "react";
import { SortingAPI } from "@/lib/api";
import { ClockIcon, XIcon, PlusIcon } from "@/lib/icons";

// SpeedPlay — the whole feature, in one file.
//
// The flow:
//   1) You upload your own .txt study notes.
//   2) The backend sends them to Gemini AI, which writes multiple-choice questions.
//   3) You answer as many as you can in 20 seconds.
//   4) You get feedback: how many you got right and wrong.
//
// The screen shows one of four phases, stored in `phase`:
//   "upload"  -> choose your notes file
//   "loading" -> the AI is writing the questions
//   "play"    -> the 20-second quiz
//   "done"    -> your feedback

const ROUND_SECONDS = 20;

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
  const [phase, setPhase] = useState("upload");     // upload | loading | play | done
  const [title, setTitle] = useState("");           // name of the uploaded file
  const [deck, setDeck] = useState([]);             // the questions, shuffled
  const [idx, setIdx] = useState(0);                // which question we are on
  const [correct, setCorrect] = useState(0);        // how many right
  const [wrong, setWrong] = useState(0);            // how many wrong
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [picked, setPicked] = useState(null);       // { option, ok } -> flashes green/red
  const [error, setError] = useState("");

  const fileRef = useRef(null);
  const tickRef = useRef(null);
  const endedRef = useRef(false);

  const current = deck[idx] || null;                // the question on screen

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
    setIdx(0); setCorrect(0); setWrong(0);
    setTimeLeft(ROUND_SECONDS); setPicked(null);
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
    setPhase("done"); // STEP 4: show the feedback
  }

  // Answer the current question by tapping an option.
  function answer(option) {
    if (endedRef.current || !current || picked) return;
    const ok = option === current.answer;   // is this the correct option?
    if (ok) setCorrect((n) => n + 1);
    else setWrong((n) => n + 1);

    setPicked({ option, ok });               // instant green/red feedback
    setTimeout(() => {
      setPicked(null);
      // Move to the next question. When we run out, reshuffle and keep going.
      if (idx + 1 >= deck.length) { setDeck((d) => shuffle(d)); setIdx(0); }
      else setIdx(idx + 1);
    }, 350);
  }

  const timePct = (timeLeft / ROUND_SECONDS) * 100;
  const urgent = timeLeft <= 5;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pg-quiz pg-quiz-arcade pg-sort" onClick={(e) => e.stopPropagation()}>
        <button className="pg-quiz-close" onClick={onClose} aria-label="Close game"><XIcon size={18} /></button>

        {/* PHASE 1 — upload your notes */}
        {phase === "upload" && (
          <div className="pg-sort-pick">
            <h2 className="card-title" style={{ marginBottom: 4 }}>SpeedPlay ⚡</h2>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Upload your notes — the AI turns them into a quiz, then answer as many as you can in 20 seconds.
            </p>
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

        {/* PHASE 3 — the 20-second quiz */}
        {phase === "play" && current && (
          <div className="pg-sort-play">
            <div className="pg-quiz-hud">
              <span className={"badge badge-violet" + (urgent ? " pg-time-urgent" : "")}>
                <ClockIcon size={13} /> {timeLeft}s
              </span>
              <span className="badge badge-green">✓ {correct}</span>
              <span className="badge" style={{ color: "#f87171" }}>✗ {wrong}</span>
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
                  className={"pg-sort-bin" + (picked?.option === opt ? (picked.ok ? " correct" : " wrong") : "")}
                  onClick={() => answer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 4 — your feedback */}
        {phase === "done" && (
          <div className="pg-quiz-done center">
            <h2 className="card-title pg-done-title" style={{ marginBottom: 2 }}>TIME&apos;S UP!</h2>
            <p className="small muted" style={{ marginBottom: 16 }}>{title}</p>
            <div className="pg-quiz-stats">
              <div><div className="stat-value">{correct}</div><div className="stat-label">Correct</div></div>
              <div><div className="stat-value">{wrong}</div><div className="stat-label">Wrong</div></div>
            </div>
            <p className="pg-quiz-growth">You answered {correct + wrong} questions in {ROUND_SECONDS} seconds.</p>
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
