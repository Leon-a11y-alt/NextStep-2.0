// Study Help — recommends Cisco NetAcad courses for whatever the student is
// struggling with. Done by Khaing Khant Zaw.
//
// How it works, in order:
//   1) Cache   — if we answered this exact question before, return that.
//   2) n8n/AI  — if N8N_WEBHOOK_URL is set in .env, ask the n8n workflow
//                (which uses an AI model) to rank the courses.
//   3) Keyword — otherwise match the question's words against each course's
//                name, description and topics. Simple and always works.
// Every answer is cached, so the demo works even if n8n/AI is offline.
const helpRepo = require("../repositories/help.repo");

// Common filler words that appear in any sentence — ignoring them keeps the
// matching focused on the actual subject (e.g. "networking", "python").
const STOP_WORDS = [
  "the", "and", "with", "that", "this", "have", "has", "had", "was", "are",
  "dont", "don", "doesnt", "know", "where", "what", "when", "how", "why",
  "for", "from", "about", "too", "much", "many", "things", "thing", "stuff",
  "start", "starting", "started", "need", "want", "help", "please", "really",
  "very", "just", "like", "some", "any", "can", "cant", "could", "should",
  "would", "there", "here", "which", "them", "they", "you", "your", "our",
  "struggling", "struggle", "hard", "difficult", "module", "course", "learn",
];

// Turn the student's question into simple lowercase keywords.
// e.g. "I don't know where to start with Networking!" -> ["networking"]
function toKeywords(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.includes(word));
}

// POST /api/help/recommend   body: { query }
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

  // 2) Optional AI step: forward the question + our catalogue to n8n.
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, courses }),
      });
      if (response.ok) {
        const results = await response.json();
        await helpRepo.saveCache(query, results);
        return res.json(results);
      }
    } catch (err) {
      console.log("  n8n unavailable, falling back to keyword matching.");
    }
  }

  // 3) Keyword matching: count how many words from the question appear in
  //    each course, then rank the courses by that score.
  const words = toKeywords(query);
  const scored = [];
  for (const course of courses) {
    const haystack = (course.name + " " + course.description + " " + course.topics).toLowerCase();
    let score = 0;
    const matched = [];
    for (const word of words) {
      if (haystack.includes(word)) {
        score = score + 1;
        matched.push(word);
      }
    }
    scored.push({ course, score, matched });
  }
  scored.sort((a, b) => b.score - a.score);

  // Take the best 3 matches; if nothing matched, still suggest 2 beginner-
  // friendly courses so the student never gets an empty answer.
  let top = scored.filter((s) => s.score > 0).slice(0, 3);
  const nothingMatched = top.length === 0;
  if (nothingMatched) top = scored.slice(0, 2);

  const bestScore = nothingMatched ? 1 : top[0].score;
  const results = top.map((s) => ({
    id: s.course.id,
    module: s.course.name,
    provider: s.course.provider,
    level: s.course.level,
    format: s.course.format,
    hours: s.course.hours,
    description: s.course.description,
    // Best match gets 95%; the others scale down from there.
    match: nothingMatched ? 40 : Math.round(60 + 35 * (s.score / bestScore)),
    url: s.course.url,
    reason: nothingMatched
      ? `A good ${s.course.level.toLowerCase()} starting point if you are not sure where to begin.`
      : `Matches what you asked about: ${s.matched.join(", ")}.`,
    topics: s.course.topics.split(",").map((t) => t.trim()).slice(0, 4),
  }));

  await helpRepo.saveCache(query, results);
  res.json(results);
}

module.exports = { recommend };
