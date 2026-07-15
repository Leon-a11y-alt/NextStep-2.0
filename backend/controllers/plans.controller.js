// Study Plans CRUD. Backed by the MySQL study_plans + plan_lessons tables.
// Fulfils the PlansAPI contract the frontend already calls (see lib/api.js).
const plansRepo = require("../repositories/plans.repo");

// GET /api/plans?userId=
async function getPlans(req, res) {
  const { userId } = req.query;
  res.json(await plansRepo.find(userId));
}

// POST /api/plans  — { userId, name, module }
async function createPlan(req, res) {
  const { userId, name, module } = req.body;
  if (!name) return res.status(400).json({ error: "Subject name is required." });
  const plan = await plansRepo.create({ userId: userId || 1, name, module });
  res.status(201).json(plan);
}

// DELETE /api/plans/:id
async function deletePlan(req, res) {
  const removed = await plansRepo.remove(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: "Study plan not found." });
  res.json({ message: "Study plan deleted.", plan: removed });
}

// POST /api/plans/:planId/lessons  — { title }
async function addLesson(req, res) {
  const planId = Number(req.params.planId);
  const plan = await plansRepo.findById(planId);
  if (!plan) return res.status(404).json({ error: "Study plan not found." });

  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Lesson title is required." });
  res.status(201).json(await plansRepo.addLesson(planId, title));
}

// PUT /api/plans/:planId/lessons/:lessonId  — { completed }
async function toggleLesson(req, res) {
  const lessonId = Number(req.params.lessonId);
  const lesson = await plansRepo.findLesson(lessonId);
  if (!lesson) return res.status(404).json({ error: "Lesson not found." });

  const { completed } = req.body;
  res.json(await plansRepo.setLessonCompleted(lessonId, !!completed));
}

module.exports = { getPlans, createPlan, deletePlan, addLesson, toggleLesson };
