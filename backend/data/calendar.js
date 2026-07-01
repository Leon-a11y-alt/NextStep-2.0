// In-memory calendar tasks "table".
// Scheduled tasks generated from habits/study plans.
let calendarTasks = [
  { id: 1, userId: 1, habitId: 2, title: "Solve one coding problem", date: "2026-07-01", time: "08:00", completed: false },
  { id: 2, userId: 1, habitId: 1, title: "2-minute start on assignment", date: "2026-07-01", time: "14:00", completed: true },
  { id: 3, userId: 1, habitId: null, title: "Build one small project (weekly)", date: "2026-07-03", time: "19:00", completed: false },
  { id: 4, userId: 1, habitId: 4, title: "Recap yesterday's topic", date: "2026-07-02", time: "20:00", completed: false },
  { id: 5, userId: 1, habitId: 2, title: "Solve one coding problem", date: "2026-07-04", time: "08:00", completed: false },
];

let nextTaskId = 6;
const getNextTaskId = () => nextTaskId++;

module.exports = { calendarTasks, getNextTaskId };
