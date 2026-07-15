// Focus Timer sessions. Each finished session is stored, and if it was tied
// to a habit, that habit's progress is bumped (the "advice becomes action"
// loop feeds real progress).
const focusRepo = require("../repositories/focus.repo");
const habitsRepo = require("../repositories/habits.repo");

// GET /api/focus-sessions?userId=1
async function getSessions(req, res) {
  const sessions = await focusRepo.findByUser(req.query.userId);
  res.json(sessions);
}

// POST /api/focus-sessions  { userId, habitId|null, habitName, minutes, date }
async function createSession(req, res) {
  const { userId, habitId, habitName, minutes, date } = req.body;
  if (!userId || !minutes) {
    return res.status(400).json({ error: "userId and minutes are required." });
  }

  const session = await focusRepo.create({
    userId: Number(userId),
    habitId: habitId ? Number(habitId) : null,
    habitName: habitName || "Free focus",
    minutes: Number(minutes),
    date: date || new Date().toISOString().slice(0, 10),
  });

  // A completed session on a habit adds 10% progress (capped at 100%).
  if (habitId) {
    const habit = await habitsRepo.findById(Number(habitId));
    if (habit) {
      const next = Math.min((habit.progress || 0) + 10, 100);
      await habitsRepo.update(Number(habitId), { progress: next });
    }
  }

  res.status(201).json(session);
}

module.exports = { getSessions, createSession };
