// SpeedPlay — backend logic.
//
// One job: take the notes the student uploaded and ask Google Gemini to write
// multiple-choice revision questions from them. No database.
//
//   POST /api/sorting/upload   body: { content, filename }
//   returns: { title, questions: [{ question, options:[...], answer }] }
//
// The API key comes from GEMINI_API_KEY in backend/.env.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

// The instruction we send to the AI.
function buildPrompt(notes) {
  return (
    "Create 8 multiple-choice revision questions from the STUDY NOTES.\n" +
    'Each question must have 4 different, realistic plain-text options (no "a." prefixes),\n' +
    'and "answer" must be the exact full text of the correct option.\n' +
    'Reply ONLY with JSON: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":"..."}]}\n\n' +
    "STUDY NOTES:\n" + notes
  );
}

// ---- Ask Google Gemini for the questions ---------------------------------
async function askGemini(notes) {
  // The key goes in a header (not the URL) — this is what Google recommends and
  // it keeps the secret out of URLs/logs.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    signal: AbortSignal.timeout(20000), // give up after 20s
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(notes) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status} ${detail.slice(0, 200)}`);
  }

  // Gemini's reply is nested — dig out the JSON text it generated.
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  let parsed;
  try { parsed = JSON.parse(text); } catch { return []; }
  return (Array.isArray(parsed.questions) ? parsed.questions : []).map(cleanQuestion).filter(Boolean);
}

// A junk option is empty, a single letter, or a leftover placeholder like "o1".
const isJunk = (o) => !o || o.length < 2 || /^[a-d]$/i.test(o) || /^(o|opt|option|choice|answer)\s*\d+$/i.test(o);

// Tidy one AI question. Returns a clean question, or null if it can't be used.
function cleanQuestion(q) {
  if (!q || typeof q.question !== "string") return null;

  // Clean options: strip "a." prefixes, trim, drop junk, remove duplicates.
  const options = [];
  for (const raw of Array.isArray(q.options) ? q.options : []) {
    const opt = String(raw).replace(/^[a-dA-D][.)]\s*/, "").trim();
    if (!isJunk(opt) && !options.some((o) => o.toLowerCase() === opt.toLowerCase())) options.push(opt);
  }
  if (options.length < 3) return null; // need a real choice

  // Find the correct answer and make sure it matches one of the options.
  let answer = String(q.answer ?? "").replace(/^[a-dA-D][.)]\s*/, "").trim();
  const letter = String(q.answer ?? "").trim().toLowerCase();
  if (["a", "b", "c", "d"].includes(letter)) answer = options[["a", "b", "c", "d"].indexOf(letter)] || "";

  let match = options.find((o) => o.toLowerCase() === answer.toLowerCase());
  if (!match) match = options.find((o) => o.toLowerCase().includes(answer.toLowerCase()) || answer.toLowerCase().includes(o.toLowerCase()));
  if (!match) return null;

  return { question: q.question.trim(), options: options.slice(0, 4), answer: match };
}

// POST /api/sorting/upload — build the quiz from the uploaded notes.
async function uploadNotes(req, res) {
  const { content, filename } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "The file is empty." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "No Gemini API key. Add GEMINI_API_KEY to backend/.env." });
  }

  // Only send the first part of very long notes so the request stays fast.
  let questions;
  try {
    questions = await askGemini(content.slice(0, 8000));
  } catch (err) {
    console.error("Gemini failed:", err.message);
    return res.status(502).json({ error: "Could not reach the AI. Please try again." });
  }

  if (questions.length === 0) {
    return res.status(422).json({ error: "The AI couldn't make questions from these notes. Try adding more detail." });
  }

  const title = (filename || "My notes").replace(/\.[^.]+$/, "").trim() || "My notes";
  res.status(201).json({ title, questions });
}

module.exports = { uploadNotes };
