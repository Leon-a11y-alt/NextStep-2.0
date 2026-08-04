// Study Help — recommends Cisco NetAcad courses for whatever the student is
// struggling with. Done by Khaing Khant Zaw.
//
// How it works, in order:
//   1) Cache   — if we answered this exact question before, return that.
//   2) n8n/AI  — if N8N_WEBHOOK_URL is set in .env, ask the n8n workflow
//                (which uses an AI model) to rank the courses.
//   3) Keyword — otherwise score the question's words against each course's
//                name, description and topics. Simple and always works.
// Every answer is cached, so the demo works even if n8n/AI is offline.
const helpRepo = require("../repositories/help.repo");

// How many courses a single answer may contain.
const MAX_RESULTS = 4;

// Below this match %, we don't really have an answer — the student asked
// something our catalogue doesn't cover ("our team is presenting, what should
// we do"). Rather than dress up an unrelated course as a recommendation, we
// mark the whole answer `weak` and the page says so. Works for both engines:
// the keyword matcher scores 40 when nothing matched, and the AI is told to
// return a low match when nothing fits.
const WEAK_BELOW = 50;

// Tag every card so the page can be honest about a poor answer.
function tagWeak(results) {
  const weak = !results.length || results[0].match < WEAK_BELOW;
  return results.map((r) => ({ ...r, weak }));
}

// Common filler words that appear in any sentence — ignoring them keeps the
// matching focused on the actual subject (e.g. "networking", "python").
//
// The short ones matter more than they look: we deliberately keep 2-letter
// words so "ip" and "os" still match, which means "to" and "in" would sail
// through too — and "to" alone scores every "Introduction to ..." course on
// the list. Anything here is a word no course should ever be picked for.
const STOP_WORDS = new Set([
  // function words (the reason "to" must be here)
  "to", "in", "on", "at", "of", "or", "as", "is", "it", "be", "by", "an", "am",
  "so", "no", "if", "we", "us", "up", "me", "my", "he", "she", "his", "her",
  "was", "were", "been", "will", "shall", "may", "might", "must", "does",
  "all", "out", "over", "than", "then", "now", "get", "got", "make", "makes",
  "made", "sense", "head", "around", "lately", "keep", "keeps", "cannot",
  "the", "and", "with", "that", "this", "have", "has", "had", "was", "are",
  "dont", "don", "doesnt", "do", "does", "did", "know", "where", "what", "when",
  "how", "why", "for", "from", "about", "too", "much", "many", "things",
  "thing", "stuff", "start", "starting", "started", "need", "needs", "want",
  "wants", "help", "helping", "please", "really", "very", "just", "like",
  "some", "any", "can", "cant", "could", "should", "would", "there", "here",
  "which", "them", "they", "you", "your", "our", "not", "but", "get", "getting",
  "struggling", "struggle", "struggles", "hard", "difficult", "difficulty",
  "module", "modules", "course", "courses", "learn", "learning", "understand",
  "understanding", "confused", "confusing", "trouble", "problem", "problems",
  "using", "use", "make", "made", "take", "taking", "still", "also", "into",
]);

// Crude stemmer so a student's wording still matches our keywords:
//   "addresses" -> "address"   "loops" -> "loop"   "securing" -> "secur"
// It only has to be good enough to line two English words up.
function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

// Turn the student's question into meaningful stemmed keywords.
// "I don't know where to start with Networking!" -> ["network"]
function toKeywords(query) {
  const seen = new Set();
  for (const raw of query.toLowerCase().split(/[^a-z0-9]+/)) {
    // Keep 2-letter words like "ip" and "os" — they carry real meaning here.
    if (raw.length < 2 || STOP_WORDS.has(raw)) continue;
    seen.add(stem(raw));
  }
  return [...seen];
}

// Every distinct stemmed word attached to a course, split into the two places
// it can come from. A hit in `topics` counts for more than a passing mention
// in the description, which is what makes "linux commands" rank Linux
// Essentials (topics: commands) above Linux Unhatched (topics: introduction).
function courseIndex(course) {
  const split = (text) => new Set(
    String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem)
  );
  return {
    strong: split(`${course.name} ${course.topics}`),   // title + keywords
    weak: split(course.description),                    // description only
  };
}

// Does this course keyword line up with the student's word?
// Exact match, or a prefix either way — so "secur" (from "securing") reaches
// "security". BOTH sides must be >= 4 characters before we allow a prefix
// match: otherwise a stray one-letter word like the "a" in "in a live
// environment" prefix-matches "address", and every course looks relevant.
const MIN_PREFIX = 4;

function hits(set, word) {
  if (set.has(word)) return true;                 // "ip" still matches "ip" exactly
  if (word.length < MIN_PREFIX) return false;
  for (const k of set) {
    if (k.length < MIN_PREFIX) continue;
    if (k.startsWith(word) || word.startsWith(k)) return true;
  }
  return false;
}

function scoreCourse(course, words) {
  const { strong, weak } = courseIndex(course);
  let score = 0;
  const matched = [];
  const evidence = []; // exactly where each of the student's words hit
  for (const word of words) {
    if (hits(strong, word)) { score += 3; matched.push(word); evidence.push({ word, where: "title/keywords", points: 3 }); }
    else if (hits(weak, word)) { score += 1; matched.push(word); evidence.push({ word, where: "description", points: 1 }); }
  }
  return { course, score, matched, evidence };
}

// The per-course breakdown behind each card's "Why this course" dropdown.
// Nothing here is generated text-from-thin-air: every line is computed from
// the real match — which words hit, where, and what the course actually is.
function explainMatch(course, query) {
  const words = toKeywords(query);
  const { score, evidence } = scoreCourse(course, words);
  const strongHits = evidence.filter((e) => e.where === "title/keywords").map((e) => e.word);
  const weakHits = evidence.filter((e) => e.where === "description").map((e) => e.word);

  const lines = [];
  if (strongHits.length) {
    lines.push(`"${strongHits.join('", "')}" ${strongHits.length === 1 ? "appears" : "appear"} in this course's title or keyword list — the strongest signal (3 points each).`);
  }
  if (weakHits.length) {
    lines.push(`"${weakHits.join('", "')}" ${weakHits.length === 1 ? "appears" : "appear"} in the course description (1 point each).`);
  }
  if (!evidence.length) {
    lines.push("None of your words match this course directly — it is suggested as a beginner-friendly place to start instead.");
  }
  const topics = String(course.topics || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
  lines.push(`The course itself: ${course.level || "Beginner"} level, ${course.hours ? `about ${course.hours} hours` : "self-paced"}, covering ${topics.join(", ")}.`);

  return { terms: evidence, score, lines };
}

// Attach an `explain` breakdown to every result card, whichever engine made it.
function withExplanations(results, courses, query) {
  const byId = new Map(courses.map((c) => [Number(c.id), c]));
  return results.map((r) => {
    const course = byId.get(Number(r.id));
    return course ? { ...r, explain: explainMatch(course, query) } : r;
  });
}

// The one place a course row becomes the JSON the Study Help page renders.
// Every field except `match` and `reason` comes straight from our database —
// which is why the AI can never invent a course title, price or link.
function shape(course, match, reason) {
  return {
    id: course.id,
    module: course.name,
    provider: course.provider,
    level: course.level,
    format: course.format,
    hours: course.hours,
    description: course.description,
    match,
    url: course.url,
    image: course.image || null,
    cost: course.cost || "Free",
    reason,
    topics: String(course.topics || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
  };
}

// Shape a course row + its keyword score into a result.
function toResult(s, bestScore, nothingMatched) {
  return shape(
    s.course,
    // Best match gets 95%; the rest scale down from there.
    nothingMatched ? 40 : Math.round(60 + 35 * (s.score / bestScore)),
    nothingMatched
      ? `A good ${String(s.course.level || "beginner").toLowerCase()} starting point if you are not sure where to begin.`
      : `Matches what you asked about: ${s.matched.join(", ")}.`
  );
}

// ---- The AI step (n8n) ---------------------------------------------------
// The workflow is asked to return only [{ id, match, reason }] — it ranks our
// catalogue, it does not describe courses. Everything below assumes the model
// may still get the formatting wrong, so nothing here throws: if the answer is
// unusable we return null and the caller falls back to keyword matching.

// How long to wait for n8n + the model. Gemini's free tier is genuinely
// variable (measured 5s-37s on the same question), so this is deliberately
// generous: the answer is cached afterwards, so only the FIRST person to ask a
// given question ever waits. Override with N8N_TIMEOUT_MS in .env.
const AI_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS) || 25000;

// Gemini gets a much shorter leash than the n8n path above. Measured, it either
// answers in about a second or it is having a bad day (503 "high demand", or the
// request never comes back at all). Waiting the full n8n budget for that just
// leaves the student watching a spinner before we fall back to keyword matching
// anyway — so fail fast and give them an instant answer instead.
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 12000;

// Pull a JSON array out of one string, ignoring ```json fences and any chatter
// the model wrapped around it.
function arrayFromString(value) {
  let text = String(value).trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const array = text.match(/\[[\s\S]*\]/);
  if (!array) return null;
  try {
    const parsed = JSON.parse(array[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Hunt for the picks array anywhere in what the AI sent. We can't rely on one
// field name: an LLM Chain says `text`, other nodes say `output` or `content`,
// a "Respond With: JSON" node may nest the lot, and Gemini's own envelope is
// candidates -> content -> parts -> text (5 levels deep before the string we
// actually need). So walk the whole payload and take the first array that
// actually looks like picks.
function deepFindPicks(value, depth = 0) {
  if (value == null || depth > 8) return null;

  if (Array.isArray(value)) {
    if (value.some((v) => v && typeof v === "object" && "id" in v)) return value;
    for (const item of value) {
      const found = deepFindPicks(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "string") return arrayFromString(value);

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = deepFindPicks(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Dig the array out of whatever came back, then keep only usable picks.
function parseAiPicks(payload) {
  const raw = deepFindPicks(payload);
  if (!Array.isArray(raw)) return null;

  const picks = raw
    .map((p) => ({
      id: Number(p && p.id),
      match: Number(p && p.match),
      reason: typeof (p && p.reason) === "string" ? p.reason.trim() : "",
    }))
    .filter((p) => Number.isInteger(p.id));

  return picks.length ? picks : null;
}

// Turn the AI's picks into results, using OUR course rows for every fact.
// Unknown ids (a hallucinated course) and duplicates are dropped.
function mergePicks(picks, courses) {
  const byId = new Map(courses.map((c) => [Number(c.id), c]));
  const out = [];
  for (const p of picks) {
    const course = byId.get(p.id);
    if (!course || out.some((r) => r.id === course.id)) continue;
    const match = Number.isFinite(p.match) ? Math.max(1, Math.min(100, Math.round(p.match))) : 80;
    out.push(shape(course, match, p.reason || "Recommended for what you asked about."));
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

// The instruction we give the model. It ranks OUR catalogue and returns ids
// only — never course names, prices or links — so it cannot invent a course.
function rankingPrompt(query, lean) {
  return [
    `The student said: ${query}`,
    "",
    "Only recommend from this catalogue:",
    JSON.stringify(lean),
    "",
    "Pick the 3-4 courses that best match what the student is struggling with.",
    'Return ONLY a JSON array, no markdown, no explanation:',
    '[{"id": <id from the catalogue>, "match": <0-100>, "reason": "<one sentence to the student saying why this fits>"}]',
    "",
    "Rules:",
    "- Only use ids that appear in the catalogue above.",
    "- Best first; the best gets the highest match.",
    "- If nothing fits well, return the 2 most beginner-friendly ones with a lower match.",
  ].join("\n");
}

// Ask Google Gemini directly. This is the preferred path: one less moving part
// than routing through n8n, and nothing to expire. Same contract — the model
// returns [{id, match, reason}] and every fact on the card still comes from
// our own database. Returns null on any problem so the caller falls back.
async function askGemini(query, courses, lean, tell) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  // Measured against the real catalogue-sized prompt, flash-lite answers in
  // about a second where plain flash returns 503 "high demand". Free-tier
  // capacity moves around, so GEMINI_MODEL overrides this without a rebuild.
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: rankingPrompt(query, lean) }] }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: abort.signal,
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      tell(`Gemini replied ${res.status}${body ? " — " + body.replace(/\s+/g, " ").slice(0, 120) : ""}`);
      return null;
    }
    const data = await res.json();
    const picks = parseAiPicks(data);      // walks the whole response for the array
    if (!picks) {
      tell("Gemini's answer wasn't the expected [{id,match,reason}] shape");
      return null;
    }
    const results = mergePicks(picks, courses);
    if (!results.length) {
      tell("Gemini picked no course we actually have (all ids were unknown)");
      return null;
    }
    return results;
  } catch (err) {
    const why = err.name === "AbortError" ? `no reply in ${GEMINI_TIMEOUT_MS}ms` : err.message;
    tell(`Gemini unavailable (${why})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Ask the n8n workflow to rank the catalogue. Returns null on any problem
// (not configured, timeout, HTTP error, unparseable answer, no usable ids).
//
// `notify` is optional: the live "thinking process" stream passes a callback
// here so the student can SEE why the AI step failed, instead of that reason
// only appearing in the server console.
async function askAi(query, courses, notify) {
  const tell = (msg) => { console.log("  " + msg); if (notify) notify(msg); };

  // Send only what the model needs to RANK: the id, title, level and keywords.
  const lean = courses.map((c) => ({ id: c.id, name: c.name, level: c.level, topics: c.topics }));

  // 1st choice: straight to Gemini. No workflow host in between.
  const direct = await askGemini(query, courses, lean, tell);
  if (direct) return direct;

  // 2nd choice: an n8n workflow, if one is configured.
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return null;

  // (`lean` is built once above and reused here — descriptions would nearly
  // double the prompt, and the model only ever replies with ids.)

  // Without a timeout a hanging workflow would hang the page mid-demo.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, courses: lean }),
      signal: abort.signal,
    });
    if (!response.ok) {
      tell(`n8n replied ${response.status}; using keyword matching.`);
      return null;
    }

    // The workflow may answer with JSON or plain text — read it either way.
    const body = await response.text();
    let payload;
    try { payload = JSON.parse(body); } catch { payload = body; }

    const picks = parseAiPicks(payload);
    if (!picks) {
      // Show what actually came back — usually an n8n error object, which is
      // far more useful than "unexpected answer".
      const snippet = body.replace(/\s+/g, " ").slice(0, 160);
      tell("the AI answer wasn't the expected [{id,match,reason}] shape" + (snippet ? ` — it replied: ${snippet}` : " — the reply was empty"));
      return null;
    }

    const results = mergePicks(picks, courses);
    if (!results.length) {
      tell("the AI picked no course we actually have (all ids were unknown)");
      return null;
    }
    return results;
  } catch (err) {
    const why = err.name === "AbortError" ? `no reply in ${AI_TIMEOUT_MS}ms` : err.message;
    tell(`n8n unavailable (${why}); using keyword matching.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The keyword engine as one function: score every course, best first.
// If nothing matched at all, still suggest two beginner-friendly courses so
// the student never gets an empty answer. Used by BOTH endpoints below.
function keywordResults(query, courses) {
  const words = toKeywords(query);
  const scored = courses.map((course) => scoreCourse(course, words)).sort((a, b) => b.score - a.score);

  let top = scored.filter((s) => s.score > 0).slice(0, MAX_RESULTS);
  const nothingMatched = top.length === 0;
  if (nothingMatched) {
    top = scored.filter((s) => String(s.course.level).toLowerCase() === "beginner").slice(0, 2);
    if (!top.length) top = scored.slice(0, 2);
  }

  const bestScore = nothingMatched ? 1 : top[0].score;
  return withExplanations(tagWeak(top.map((s) => toResult(s, bestScore, nothingMatched))), courses, query);
}

// POST /api/help/recommend   body: { query }
// The plain one-shot answer (used by tests and as the page's fallback).
async function recommend(req, res) {
  const query = (req.body.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Please tell us what you need help with." });
  }

  // 1) Answered before? Return the cached answer.
  const cached = await helpRepo.findCached(query);
  if (cached) {
    return res.json(JSON.parse(cached.results));
  }

  const courses = await helpRepo.listCourses();

  // 2) AI step: let the n8n workflow rank our catalogue. Anything wrong with
  //    it (down, slow, bad answer) returns null and we quietly fall through to
  //    keyword matching, so the page always answers.
  const aiResults = await askAi(query, courses);
  if (aiResults) {
    const tagged = withExplanations(tagWeak(aiResults), courses, query);
    await helpRepo.saveCache(query, tagged);
    return res.json(tagged);
  }

  // 3) Keyword matching.
  const results = keywordResults(query, courses);
  await helpRepo.saveCache(query, results);
  res.json(results);
}

// POST /api/help/recommend-stream   body: { query }
//
// Same brain as recommend(), but it NARRATES: each real decision is written to
// the response the moment it happens, as one JSON object per line (NDJSON).
// The page shows these lines live, so the student watches the actual
// cache -> AI -> keyword pipeline think — nothing here is staged.
//
//   { type: "step", label, detail, t }   t = ms since the request started
//   { type: "result", results: [...] }   the same array recommend() returns
async function recommendStream(req, res) {
  const query = (req.body.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Please tell us what you need help with." });
  }

  // Headers first — after this we're streaming, not sending one JSON body.
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  const t0 = Date.now();
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");
  const step = (label, detail) => send({ type: "step", label, detail: detail || null, t: Date.now() - t0 });

  try {
    const words = toKeywords(query);
    step("Reading your question", words.length ? `Key terms found: ${words.join(", ")}` : "No usable key terms — this may be outside the catalogue");

    // 1) Cache
    step("Checking past answers", "Looking for this exact question in the recommendations table");
    const cached = await helpRepo.findCached(query);
    if (cached) {
      step("Found a saved answer", `Answered before — served from the cache in ${Date.now() - t0}ms, no AI call needed`);
      send({ type: "result", results: JSON.parse(cached.results) });
      return res.end();
    }
    step("New question", "Nothing cached — working it out from scratch");

    const courses = await helpRepo.listCourses();

    // 2) AI
    let results = null;
    const engine = process.env.GEMINI_API_KEY ? "Gemini" : (process.env.N8N_WEBHOOK_URL ? "an n8n workflow" : null);
    if (engine) {
      step("Asking the AI", `Sending your question + our ${courses.length}-course NetAcad catalogue to ${engine}. It returns only course ids — every fact on a card comes from our own database`);
      const tAi = Date.now();
      results = await askAi(query, courses, (why) => step("AI problem", why));
      if (results) {
        // Same finishing touches the plain endpoint applies: weak-answer flag
        // + the per-course "why exactly" breakdown for each card's dropdown.
        results = withExplanations(tagWeak(results), courses, query);
        step("AI answered", `Ranked ${results.length} course(s) in ${((Date.now() - tAi) / 1000).toFixed(1)}s — every id matched a real row in our catalogue`);
      } else {
        step("Switching engines", "No usable AI answer — falling back to keyword matching so you still get a result");
      }
    } else {
      step("AI not configured", "No GEMINI_API_KEY (or n8n webhook) set — using keyword matching");
    }

    // 3) Keywords
    if (!results) {
      step("Scoring the catalogue", `Comparing your key terms against all ${courses.length} courses — a hit in the title/keywords scores 3, in the description 1`);
      results = keywordResults(query, courses);
      step("Ranked", `Best match: ${results[0].module} at ${results[0].match}%`);
    }

    if (results[0] && results[0].weak) {
      step("Being honest", "The best match is weak — telling you nothing really covers this instead of bluffing");
    }

    await helpRepo.saveCache(query, results);
    step("Saving the answer", "Cached — asking this exact question again will take ~30ms");
    send({ type: "result", results });
  } catch (err) {
    // Headers are already sent, so report the failure inside the stream.
    step("Something went wrong", err.message);
    send({ type: "error", error: err.message });
  }
  res.end();
}

module.exports = { recommend, recommendStream, toKeywords, scoreCourse, parseAiPicks, mergePicks, tagWeak };
