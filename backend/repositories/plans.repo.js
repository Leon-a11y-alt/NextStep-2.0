// Study Plans data-access layer (MySQL). A plan (a subject/module) has many
// lessons; the controller returns each plan with its lessons nested, matching
// the shape the frontend PlansAPI already expects.
const { pool } = require("../config/db");

// All plans (optionally for one user), each with its lessons nested.
async function find(userId) {
  const params = [];
  let where = "";
  if (userId !== undefined && userId !== null && userId !== "") {
    where = "WHERE userId = ?";
    params.push(Number(userId));
  }
  const [plans] = await pool.query(`SELECT * FROM study_plans ${where} ORDER BY id ASC`, params);
  if (!plans.length) return [];

  const ids = plans.map((p) => p.id);
  const [lessons] = await pool.query(
    `SELECT * FROM plan_lessons WHERE planId IN (${ids.map(() => "?").join(",")}) ORDER BY id ASC`,
    ids
  );
  const byPlan = {};
  for (const l of lessons) {
    (byPlan[l.planId] ||= []).push({ id: l.id, title: l.title, completed: !!l.completed });
  }
  return plans.map((p) => ({ ...p, lessons: byPlan[p.id] || [] }));
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM study_plans WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    "INSERT INTO study_plans (userId, name, module, createdAt) VALUES (?, ?, ?, CURRENT_DATE)",
    [Number(data.userId), data.name, data.module || null]
  );
  const plan = await findById(result.insertId);
  return { ...plan, lessons: [] };
}

async function remove(id) {
  const plan = await findById(id);
  if (!plan) return null;
  await pool.query("DELETE FROM plan_lessons WHERE planId = ?", [id]);
  await pool.query("DELETE FROM study_plans WHERE id = ?", [id]);
  return plan;
}

async function findLesson(id) {
  const [rows] = await pool.query("SELECT * FROM plan_lessons WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function addLesson(planId, title) {
  const [result] = await pool.query(
    "INSERT INTO plan_lessons (planId, title, completed) VALUES (?, ?, 0)",
    [Number(planId), title]
  );
  const l = await findLesson(result.insertId);
  return { id: l.id, title: l.title, completed: !!l.completed };
}

async function setLessonCompleted(lessonId, completed) {
  await pool.query("UPDATE plan_lessons SET completed = ? WHERE id = ?", [completed ? 1 : 0, Number(lessonId)]);
  const l = await findLesson(lessonId);
  return { id: l.id, title: l.title, completed: !!l.completed };
}

module.exports = { find, findById, create, remove, findLesson, addLesson, setLessonCompleted };
