// In-memory user "table".
// NOTE: Passwords are stored in plain text here ONLY because this is a
// midpoint prototype with mock data. Before final submission we will swap
// this for a real database (SQLite/MySQL) and hash passwords with bcrypt.
let users = [
  {
    id: 1,
    name: "Alex Tan",
    email: "alex@rp.edu.sg",
    password: "password123",
    yearLevel: "Year 2",
    diploma: "Diploma in Information Technology",
    role: "user",
    createdAt: "2026-01-05",
  },
  {
    id: 2,
    name: "Priya Nair",
    email: "priya@rp.edu.sg",
    password: "password123",
    yearLevel: "Year 3",
    diploma: "Diploma in Information Technology",
    role: "user",
    createdAt: "2026-01-06",
  },
  {
    id: 3,
    name: "Admin Officer",
    email: "admin@rp.edu.sg",
    password: "admin123",
    yearLevel: "Year 3",
    diploma: "Diploma in Information Technology",
    role: "admin",
    createdAt: "2026-01-02",
  },
];

// Simple auto-increment id helper shared across the module.
let nextUserId = 4;
const getNextUserId = () => nextUserId++;

module.exports = { users, getNextUserId };
