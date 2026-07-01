// Calendar planner CRUD.
const { calendarTasks, getNextTaskId } = require("../data/calendar");

// GET /api/calendar?userId=
function getTasks(req, res) {
  const { userId } = req.query;
  let result = calendarTasks;
  if (userId) {
    result = calendarTasks.filter((t) => t.userId === Number(userId));
  }
  res.json(result);
}

// POST /api/calendar
function createTask(req, res) {
  const { userId, habitId, title, date, time } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: "Task title and date are required." });
  }

  const newTask = {
    id: getNextTaskId(),
    userId: userId || 1,
    habitId: habitId || null,
    title,
    date,
    time: time || "09:00",
    completed: false,
  };
  calendarTasks.push(newTask);
  res.status(201).json(newTask);
}

// PUT /api/calendar/:id  — toggle / set completion.
function updateTask(req, res) {
  const task = calendarTasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found." });

  const { completed, title, date, time } = req.body;
  if (completed !== undefined) task.completed = completed;
  if (title !== undefined) task.title = title;
  if (date !== undefined) task.date = date;
  if (time !== undefined) task.time = time;

  res.json(task);
}

// DELETE /api/calendar/:id
function deleteTask(req, res) {
  const index = calendarTasks.findIndex((t) => t.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Task not found." });
  const [removed] = calendarTasks.splice(index, 1);
  res.json({ message: "Task deleted.", task: removed });
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
