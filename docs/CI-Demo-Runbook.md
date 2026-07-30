# CI demo — exact runbook

What to click, what to say, in order. Total: **6 minutes** (or 2 if you only do
Part 2).

Verified working on 30 July 2026: run
[30505869815](https://github.com/Leon-a11y-alt/NextStep-2.0/actions/runs/30505869815)
— all four jobs green, 1 min 14 s total.

---

## Part 0 — Set up before class (5 min, do this tonight)

**Open these three browser tabs, in this order (left to right):**

1. `https://github.com/Leon-a11y-alt/NextStep-2.0/actions` — the Actions tab
2. `https://github.com/Leon-a11y-alt/NextStep-2.0/blob/feature/cicd/.github/workflows/ci.yml`
3. `https://github.com/Leon-a11y-alt/NextStep-2.0/pulls` — Pull requests

**Open a terminal** in the project folder and leave it on this branch:

```bash
cd "C:\Users\paing\Downloads\NextStep-2.0"
```

```bash
git checkout feature/cicd
```

**Optional (needs repo admin) — makes the red check actually block merging:**
Settings → Branches → Add branch protection rule → branch name pattern `main` →
tick *Require status checks to pass before merging* → select the CI checks →
Create. Without this, GitHub shows red but still lets you merge, so say "with
branch protection on" instead of "it blocks the merge".

**Rehearse Part 3 once tonight.** It's the only part where you type live.

---

## Part 1 — Open (20 s, no clicking yet)

> "My part of the project was the CI pipeline. Instead of us testing by hand,
> GitHub now tests every push automatically. Let me show you it running."

Switch to **Tab 1 (Actions)**.

---

## Part 2 — Walk the passing run (2 min)

### Step 1 — the run list

Click **CI** in the left sidebar. You'll see a list of runs, newest at the top.

> "Every one of these is a push. Each one ran the whole pipeline by itself —
> I didn't start any of them."

### Step 2 — open the newest run

Click the **top run**. You'll see four boxes, all with green ticks.

> "Four stages, and the whole thing takes about a minute and a quarter."

Point at the two middle boxes.

> "Backend tests and Frontend build run at the same time, because neither needs
> the other. That's why it's fast."

### Step 3 — inside the backend tests (the important one)

Click **Backend tests (PostgreSQL)** in the left list. Expand these steps by
clicking their names:

**a. `Initialize containers`**

> "This is a real PostgreSQL 16 database, started just for this run and thrown
> away at the end. Our tests use the real controllers, and those run real SQL —
> so without a database they can't run at all. This is why the tests used to get
> skipped."

**b. `Create the schema and seed data`**

> "It creates every table and loads the demo data from scratch, so every run
> starts from exactly the same state. It never touches our real Supabase
> database."

**c. `Run the API test suite`** ← the money shot

You'll see a list of ticks, ending with `17/17 test(s) passed.`

> "Seventeen tests — login, posts, permissions, voting, admin approval, and the
> gamification level curve. All passing."

**d. `Smoke test — the API starts and answers /api/health`**

You'll see `{"status":"ok","service":"nextstep-api"}`

> "Tests passing doesn't prove the app actually starts. So this launches the
> server and calls the health endpoint. That's the real app answering."

### Step 4 — the artifact and the summary

Click the run name at the top to go back, then scroll to the **bottom** of the
run page.

> "Artifacts — that's the compiled frontend for this exact commit, downloadable.
> And this table is a summary the pipeline writes for itself at the end."

**End of Part 2. If you only have 2 minutes, stop here.**

---

## Part 3 — Break it on purpose (3 min) ← the memorable part

> "That's it passing. But a pipeline is only useful if it catches mistakes. So
> let me break something on purpose."

### Step 1 — make a branch

In your terminal:

```bash
git checkout -b feature/demo-fail
```

> "I'm on a branch called feature/demo-fail, so nothing here touches our real
> code."

*(The name must start with `feature/` — that's what the pipeline watches.)*

### Step 2 — break one test

Open `backend/tests/api.test.js`. **Line 41.** It currently reads:

```js
  assert.strictEqual(res.statusCode, 401);
```

Change `401` to `999` and save.

> "This test logs in with a wrong password and expects the API to reject it with
> a 401. I'm changing it to expect 999, which is not a real status code. So this
> test must now fail."

### Step 3 — push it

```bash
git commit -am "demo: deliberately break a test"
```

```bash
git push -u origin feature/demo-fail
```

### Step 4 — watch it fail

Switch to **Tab 1 (Actions)** and refresh. A new run appears with a **yellow
spinning dot**.

> "It started by itself, the moment I pushed."

**While you wait (about 75 seconds)** — this is your window to talk, so use it:

> "While that runs — the reason this matters for our team is that there are five
> of us on five branches. Before this, 'does the app still work?' depended on
> whoever last ran it on their own laptop, with their own Node version, and no
> record of the result. Now every push gets the same four checks on a clean
> machine, and the result is recorded on the commit."

The dot turns into a **red ✗**.

> "There it is. Red."

Click the failed run → click **Backend tests (PostgreSQL)** → expand **Run the
API test suite**.

You'll see the failing test named, with the expected/actual mismatch, and
`16/17 test(s) passed.`

> "It tells me exactly which test broke and what the values were. And because
> the job exited non-zero, the whole pipeline is marked failed."

### Step 5 — show what that blocks

Go to **Tab 3 (Pull requests)** → **New pull request** → base `main`, compare
`feature/demo-fail`.

> "If I try to merge this, the pull request shows the red check right here on the
> merge box. With branch protection switched on, GitHub refuses to merge it at
> all — so broken code can't get into main. That is the whole point of CI."

**Do not merge it.** Close the pull request.

---

## Part 4 — Clean up (30 s, do it right after)

```bash
git checkout feature/cicd
```

```bash
git branch -D feature/demo-fail
```

```bash
git push origin --delete feature/demo-fail
```

> "And I'll delete that branch — the pipeline did its job, the bad code never
> got in."

---

## Part 5 — Optional: show the code behind it (30 s, only if asked "how?")

Switch to **Tab 2 (ci.yml)**. Show exactly two things — don't scroll the whole
file:

**1. The `services: postgres:` block (about line 82)**

> "This is what creates the test database. GitHub starts the container, waits
> until it's actually ready to accept connections, then runs my steps."

**2. `DATABASE_SSL: disable` (about line 101)**

> "This was the one thing I had to change in our code. Our real database is on
> Supabase, which requires SSL, so SSL was hard-coded on. A plain test container
> has no SSL at all, so it refused to connect. I turned it into a setting: on for
> Supabase, off for the test database. That one change is what made automated
> testing possible."

---

## Part 6 — If something goes wrong

| Problem | What to do |
| --- | --- |
| No internet | Use the screenshots you took last night (take them tonight — the run page, the 17/17 output, and a red failed run). |
| Run stuck on "queued" | Keep talking through Part 5 (the ci.yml walkthrough) — it fills exactly that gap. |
| You forgot to revert the broken test | Harmless, it's on its own branch. Run Part 4. |
| Lecturer asks to see it fail but there's no time | Open the failed run you created while rehearsing tonight — it stays in the Actions history permanently. |
| Yellow warning triangle on a green run | See the Q&A below — it's a deprecation notice, not a failure. |

---

## Part 7 — Questions you'll probably get

**"What are those warnings on the run?"**
> "Deprecation notices from GitHub, not test failures — they're telling me some
> of the actions I use will move to a newer Node runtime. The run is still green.
> Fixing it means bumping the action versions, which Dependabot is already set up
> to do automatically."

**"How long does it take?"**
> "About a minute and a quarter. Quality checks four seconds, backend tests
> thirty-one, frontend build forty-eight, Docker images eighteen — and the middle
> two overlap."

**"Why a real database instead of fake data?"**
> "Because our controllers run actual SQL. If we faked the database, a broken
> query would still pass the test, and we'd only find out in the demo."

**"What was the hardest part?"**
> "The SSL problem in Part 5. The tests were unrunnable in CI until I made SSL a
> setting instead of hard-coding it on."

**"Does it cost money?"**
> "No — GitHub Actions is free on public repositories."

**"What's missing?"**
> "Frontend tests. Only the backend is covered right now. And no lint stage — I
> left it out on purpose, because our frontend has no ESLint config yet and a
> check that passes without checking anything is worse than no check."

**"Is this CD as well?"**
> "No — this is CI, proving the code is correct. Getting it onto a server for
> users is CD, and that's the next phase."
