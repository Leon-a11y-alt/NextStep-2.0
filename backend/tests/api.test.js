// Simple API/controller tests using only Node's built-in `assert`.
// No extra test framework is needed, so `npm test` works right after
// `npm install`. These are perfect to wire into Jenkins / GitHub Actions
// in Phase 2 (they must PASS before the pipeline builds the Docker image).
//
// Run with:  npm test   (inside the backend folder)

const assert = require("assert");

// Fake Express res object that records what a controller sends back.
function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  \u2713 " + name);
  } catch (err) {
    console.error("  \u2717 " + name);
    console.error("    " + err.message);
    process.exitCode = 1; // non-zero exit fails the CI build
  }
}

console.log("\nNextStep API tests\n");

// --- Auth: login rejects a wrong password ---
const auth = require("../controllers/auth.controller");
test("login fails with wrong password", () => {
  const res = mockRes();
  auth.login({ body: { email: "alex@rp.edu.sg", password: "WRONG" } }, res);
  assert.strictEqual(res.statusCode, 401);
});

test("login succeeds with correct password", () => {
  const res = mockRes();
  auth.login({ body: { email: "alex@rp.edu.sg", password: "password123" } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token, "expected a token");
});

// --- Posts: cannot create a post with an empty title ---
const postsCtrl = require("../controllers/posts.controller");
test("post cannot be created with empty title", () => {
  const res = mockRes();
  postsCtrl.createPost({ body: { title: "", content: "hello" } }, res);
  assert.strictEqual(res.statusCode, 400);
});

test("post is created when title and content are given", () => {
  const res = mockRes();
  postsCtrl.createPost(
    { body: { title: "Test post", content: "some advice", author: "Tester" } },
    res
  );
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.status, "approved");
});

// --- Habits: a forum suggested action can become a habit ---
const habitsCtrl = require("../controllers/habits.controller");
test("advice can be turned into a habit (add to tracker)", () => {
  const res = mockRes();
  habitsCtrl.createHabit(
    { body: { name: "Build one small project weekly", sourcePostId: 1 } },
    res
  );
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.sourcePostId, 1);
});

// --- Admin: approving a pending post changes its status ---
const adminCtrl = require("../controllers/admin.controller");
test("admin can approve a pending post", () => {
  const res = mockRes();
  adminCtrl.approvePost({ params: { id: "5" } }, res);
  assert.strictEqual(res.body.status, "approved");
});

console.log(`\n${passed} test(s) passed.\n`);
