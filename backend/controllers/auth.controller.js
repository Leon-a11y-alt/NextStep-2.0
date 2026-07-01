// Handles register / login.
// This is intentionally simple for the midpoint prototype.
const { users, getNextUserId } = require("../data/users");

// Remove the password before sending a user object back to the client.
function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// POST /api/auth/register
function register(req, res) {
  const { name, email, password, yearLevel, diploma } = req.body;

  if (!name || !email || !password || !yearLevel || !diploma) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const newUser = {
    id: getNextUserId(),
    name,
    email,
    password, // TODO: hash with bcrypt when we move to a real database.
    yearLevel,
    diploma,
    role: "user",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  users.push(newUser);

  // A fake token so the flow looks like a real app. Swap for JWT later.
  const token = "demo-token-" + newUser.id;
  res.status(201).json({ token, user: safeUser(newUser) });
}

// POST /api/auth/login
function login(req, res) {
  const { email, password } = req.body;

  const user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = "demo-token-" + user.id;
  res.json({ token, user: safeUser(user) });
}

// GET /api/auth/users  (helper for the demo / admin views)
function listUsers(req, res) {
  res.json(users.map(safeUser));
}

module.exports = { register, login, listUsers };
