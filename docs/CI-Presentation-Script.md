# CI Pipeline — 3-slide script + demo

Deck: `docs/NextStep-CI-Brief.pptx` · Speaking time: **~2 minutes**
Scope: **continuous integration only.** Deployment is a later phase, not my task.

The same script is in the speaker notes of each slide, so Presenter View shows
it while you talk.

---

## Before you present (5 minutes, do it tonight)

1. Open the repo → **Actions** tab → confirm the newest **CI** run has a green
   tick. It was passing when this was written.
2. Keep two browser tabs ready:
   - the passing CI run page
   - `.github/workflows/ci.yml` in the repo
3. Optional but strong — **turn on branch protection** so a red check really
   does block merging: repo **Settings → Branches → Add rule** → branch name
   `main` → tick *Require status checks to pass before merging* → pick the CI
   checks → Save. (Needs admin on the repo. If you can't, just say "with branch
   protection switched on, GitHub blocks the merge" — the slide is worded to
   match either case.)

---

## Slide 1 — "CI Pipeline for NextStep"  (~35 s)

> "My part of this project was the CI pipeline — continuous integration.
>
> The picture on the right is what it does: four checks, running one after
> another, every time anyone pushes code.
>
> One pipeline, four stages, seventeen tests, and zero manual steps. Once I push,
> GitHub Actions does all of it by itself.
>
> Before this, testing was manual. And the API tests were actually being skipped,
> because they need a database with data in it — which nobody wanted to set up by
> hand."

---

## Slide 2 — "Four checks run on every push"  (~55 s)

> "These are the four checks, in order.
>
> **One, Quality.** It makes sure nobody committed a password file or a `.env`
> file. Those are real credentials, and once they're in Git history they're
> leaked.
>
> **Two, Tests.** This is the main one. Our tests use the real code, and the real
> code talks to PostgreSQL — so the pipeline starts a fresh PostgreSQL database,
> creates all the tables, loads the seed data, and runs seventeen tests. Then it
> starts the server and checks the health endpoint replies, because tests passing
> doesn't prove the app actually starts.
>
> **Three, Build.** It builds the frontend the same way as the real production
> build, which catches errors that don't show up while you're developing.
>
> **Four, Package.** It builds both Docker containers, because a broken
> Dockerfile is something no test can catch.
>
> And then the two boxes at the bottom. If all four pass, the code is safe to
> merge. If even one fails, the pull request turns red — and with branch
> protection on, GitHub refuses to merge it at all. So broken code can't get into
> the main branch."

---

## Slide 3 — "It is running now"  (~30 s)

> "Where it stands today. It runs on every push and every pull request. The tests
> run against a real database. It checks the app actually starts. Both containers
> build. Seventeen out of seventeen tests pass, and it's green right now — I can
> show you in the Actions tab.
>
> The one thing I'd add next is tests for the frontend. At the moment only the
> backend is tested, so that's the honest gap.
>
> In one sentence: continuous integration is working — every push is tested
> automatically on a real database, and a failing test marks the pull request red
> so it doesn't get merged."

---

# The demo

Pick **Demo A** if you have 2 minutes. Do **A then B** if you have 5 and want
the strongest possible impression. B is the one that actually proves the
pipeline has teeth.

## Demo A — the passing run (2 min, nothing to change)

1. **Actions tab** → click the newest **CI** run.
   > "Every push triggers this automatically. Four jobs, all green."
2. Point out that **Backend tests** and **Frontend build** ran at the **same
   time** — they don't depend on each other, so the run is faster.
3. Click **Backend tests (PostgreSQL)** and expand these steps:
   - *Initialize containers* → the `postgres:16-alpine` database starting up.
     > "This database is created just for this run, and thrown away after. It
     > never touches our real Supabase data."
   - *Create the schema and seed data* → tables being created.
   - *Run the API test suite* → the list of ticks and `17/17 test(s) passed.`
   - *Smoke test* → `{"status":"ok","service":"nextstep-api"}`
     > "That's the app actually running and answering."
4. Scroll to the bottom of the run page → **Artifacts** → the frontend build.
   > "The compiled frontend for this exact commit, downloadable."
5. Scroll to the run **Summary** → the results table the pipeline writes itself.

## Demo B — break it on purpose (3 min, the memorable one)

This shows the pipeline catching a real failure. Do it on a throwaway branch.

```bash
git checkout -b demo/failing-test
```

Open `backend/tests/api.test.js`, find the first test (`login fails with wrong
password`) and change the expected status code from `401` to `999`:

```bash
git commit -am "demo: deliberately break a test"
```

```bash
git push -u origin demo/failing-test
```

Then on GitHub: **Compare & pull request** into `main`. Watch the check go
yellow, then **red**.

> "I've broken one test on purpose. The pipeline catches it in about a minute,
> the pull request goes red, and it tells me exactly which test failed. This is
> what stops a broken commit from reaching main."

Click the failed run → **Backend tests** → the failing assertion is printed with
the test name.

Clean up afterwards:

```bash
git checkout feature/cicd
```

```bash
git push origin --delete demo/failing-test
```

## Demo C — the workflow file (30 s, if they ask "how?")

Open `.github/workflows/ci.yml` and show two things only:

- the `services: postgres:` block → "this is what creates the database"
- `DATABASE_SSL: disable` → "our real database needs SSL, this test one has
  none, so I made it a setting instead of hard-coded"

---

# Likely questions

**"What was the hardest part?"**
> "Getting the tests to run at all. They query PostgreSQL, so with no database
> they can't run. The pipeline now creates one for every run. But our database
> code had SSL hard-coded on, because Supabase requires it — and a plain
> database container has no SSL at all, so it wouldn't connect. I changed it to a
> setting: SSL on for Supabase, off for the test database. That one change is
> what made automated testing possible."

**"Why a real database instead of fake data?"**
> "Because the tests would be testing something that isn't the real app. Our
> controllers run actual SQL — if we faked that, a broken query would still
> pass."

**"What is the difference between this and CD?"**
> "CI is about proving the code is correct — that's my part. CD is about getting
> it onto a server for users. That's the next phase."

**"Does it cost anything?"**
> "No. GitHub Actions is free for public repositories, and each run takes a
> couple of minutes."

**"What would you improve?"**
> "Frontend tests, and a lint stage. I left lint out on purpose — the frontend
> has no ESLint config yet, and a check that passes without actually checking
> anything is worse than no check."

---

# Numbers to remember

| Thing | Value |
| --- | --- |
| Stages | 4 — Quality, Tests, Build, Package |
| Tests | 17, in `backend/tests/api.test.js` |
| Test database | `postgres:16-alpine`, created and seeded per run |
| Runs on | every push to `main` / `dev` / `feature/**`, and every pull request |
| Parallel | Tests and Build run at the same time |
| File | `.github/workflows/ci.yml` |
