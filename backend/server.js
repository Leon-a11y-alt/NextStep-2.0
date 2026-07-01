// NextStep API server (Express).
// Clean, layered structure:
//   routes/      -> define URL endpoints
//   controllers/ -> the logic for each endpoint
//   data/        -> in-memory mock "tables" (swap for a real DB later)
//   middleware/  -> shared request logging + error handling
//
// Data is stored in memory for the midpoint prototype. Restarting the
// server resets the data back to the seeded sample content.

const express = require("express");
const cors = require("cors");

const logger = require("./middleware/logger");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Route modules
const authRoutes = require("./routes/auth.routes");
const postsRoutes = require("./routes/posts.routes");
const commentsRoutes = require("./routes/comments.routes");
const habitsRoutes = require("./routes/habits.routes");
const calendarRoutes = require("./routes/calendar.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const PORT = process.env.PORT || 4000;

// --- Global middleware ---
app.use(cors());            // allow the Next.js frontend (port 3000) to call us
app.use(express.json());    // parse JSON request bodies
app.use(logger);            // log every request to the terminal

// --- Health check (useful for Docker / CI later) ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "nextstep-api" });
});

// --- Feature routes ---
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/admin", adminRoutes);

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  NextStep API running at http://localhost:${PORT}`);
  console.log(`  Health check:            http://localhost:${PORT}/api/health\n`);
});
