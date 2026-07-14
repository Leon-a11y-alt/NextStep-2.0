// Study Plans: a plan (module) that contains lessons you tick off.
// Backed by the study_plans + lessons tables.
const plansRepo = require("../repositories/plans.repo");

// GET /api/plans?userId=1  -> plans with nested lessons
async function getPlans(req, res) {
  const plans = await plansRepo.findByUser(req.query.userId);
  res.json(plans);
}

// POST /api/plans  { userId, name, module, frequency?, sourcePostId?, lessons? }
// lessons is an optional array of bullet-point titles (used by the forum's
// "Add to my study planner" flow).
async function createPlan(req, res) {
  const { userId, name, module, frequency, sourcePostId, lessons } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: "userId and name are required." });
  }
  const plan = await plansRepo.createPlan({
    userId: Number(userId),
    name,
    module: module || null,
    frequency: frequency || null,
    sourcePostId: sourcePostId ? Number(sourcePostId) : null,
    lessons: Array.isArray(lessons) ? lessons : [],
    createdAt: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(plan);
}

// DELETE /api/plans/:id
async function deletePlan(req, res) {
  const removed = await plansRepo.removePlan(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: "Plan not found." });
  res.json({ message: "Plan deleted.", id: Number(req.params.id) });
}

// POST /api/plans/:id/lessons  { title }
async function addLesson(req, res) {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required." });
  const lesson = await plansRepo.addLesson(Number(req.params.id), title);
  res.status(201).json(lesson);
}

// PUT /api/plans/:id/lessons/:lessonId  { completed }
async function updateLesson(req, res) {
  const lesson = await plansRepo.setLessonCompleted(
    Number(req.params.lessonId),
    Boolean(req.body.completed)
  );
  if (!lesson) return res.status(404).json({ error: "Lesson not found." });
  res.json(lesson);
}

module.exports = { getPlans, createPlan, deletePlan, addLesson, updateLesson };
