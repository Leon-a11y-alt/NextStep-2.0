// In-memory habits / study plans "table".
// status: "active" | "completed" | "paused"
// sourcePostId links a habit back to the forum advice it came from (if any).
let habits = [
  { id: 1, userId: 1, sourcePostId: 3, name: "Start hard tasks with 2 focused minutes", frequency: "Daily", status: "active", progress: 60, createdAt: "2026-02-19" },
  { id: 2, userId: 1, sourcePostId: 4, name: "Solve one coding problem each weekday", frequency: "Weekdays", status: "active", progress: 40, createdAt: "2026-02-21" },
  { id: 3, userId: 1, sourcePostId: null, name: "Read 10 pages of a textbook", frequency: "Daily", status: "paused", progress: 25, createdAt: "2026-02-22" },
  { id: 4, userId: 1, sourcePostId: 2, name: "Recap yesterday's topic for 20 minutes", frequency: "Daily", status: "completed", progress: 100, createdAt: "2026-02-16" },
];

let nextHabitId = 5;
const getNextHabitId = () => nextHabitId++;

module.exports = { habits, getNextHabitId };
