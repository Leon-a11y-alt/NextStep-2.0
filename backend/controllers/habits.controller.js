// Habit / study tracker CRUD.
const { habits, getNextHabitId } = require("../data/habits");

// GET /api/habits?userId=
function getHabits(req, res) {
  const { userId } = req.query;
  let result = habits;
  if (userId) {
    result = habits.filter((h) => h.userId === Number(userId));
  }
  res.json([...result].sort((a, b) => b.id - a.id));
}

// POST /api/habits
// Used both by the "Create habit" form and the forum "Add to My Tracker"
// button (which passes a sourcePostId).
function createHabit(req, res) {
  const { userId, name, frequency, sourcePostId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Habit name is required." });
  }

  const newHabit = {
    id: getNextHabitId(),
    userId: userId || 1,
    sourcePostId: sourcePostId || null,
    name,
    frequency: frequency || "Daily",
    status: "active",
    progress: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  habits.unshift(newHabit);
  res.status(201).json(newHabit);
}

// PUT /api/habits/:id  — update status / progress / mark complete.
function updateHabit(req, res) {
  const habit = habits.find((h) => h.id === Number(req.params.id));
  if (!habit) return res.status(404).json({ error: "Habit not found." });

  const { status, progress, name, frequency } = req.body;
  if (status !== undefined) habit.status = status;
  if (progress !== undefined) habit.progress = progress;
  if (name !== undefined) habit.name = name;
  if (frequency !== undefined) habit.frequency = frequency;

  // Convenience: marking complete also fills progress to 100%.
  if (status === "completed") habit.progress = 100;

  res.json(habit);
}

// DELETE /api/habits/:id
function deleteHabit(req, res) {
  const index = habits.findIndex((h) => h.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Habit not found." });
  const [removed] = habits.splice(index, 1);
  res.json({ message: "Habit deleted.", habit: removed });
}

module.exports = { getHabits, createHabit, updateHabit, deleteHabit };
