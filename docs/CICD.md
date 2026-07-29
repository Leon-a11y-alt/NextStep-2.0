# NextStep — CI/CD Pipeline

**Tool:** GitHub Actions · **Registry:** GitHub Container Registry (GHCR) · **Runtime:** Docker

This document explains the pipeline: what it does, why each stage exists, and how
to demonstrate it.

---

## 1. Why we have a pipeline

Five people work on this repo across five feature branches. Before the pipeline,
"does it still work?" was answered by whoever happened to run the app on their
laptop. Three problems followed from that:

1. A merge could break `main` and nobody would notice until the next demo.
2. The backend tests need a seeded PostgreSQL database, so people skipped them.
3. Deployment was a manual sequence of commands — different every time, and
   impossible to roll back reliably.

The pipeline makes verification automatic, identical for everyone, and repeatable.

---

## 2. The two pipelines

| File | Name | Trigger | Purpose |
| --- | --- | --- | --- |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | **CI** | push to `dev` / `feature/**`, any PR into `main` or `dev`, manual | Prove the commit is good |
| [.github/workflows/cd.yml](../.github/workflows/cd.yml) | **CD** | push to `main` (i.e. a merged PR), manual | Package it and release it |

The split matters: **CI answers "is this correct?", CD answers "how does it reach
users?"** CD's first job re-runs the whole of CI as a gate, so nothing that fails
a test can ever be published.

---

## 3. CI pipeline — 4 stages

```
                    ┌──────────────────────┐
                    │ 1. Quality checks    │
                    │  secrets / hygiene   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
   ┌────────────────────────┐      ┌────────────────────────┐
   │ 2. Backend tests       │      │ 3. Frontend build      │
   │  PostgreSQL 16 service │      │  next build (prod)     │
   │  db:init → npm test    │      │  upload artifact       │
   │  → /api/health smoke   │      │                        │
   └───────────┬────────────┘      └───────────┬────────────┘
               └──────────────┬────────────────┘
                              ▼
                  ┌──────────────────────────┐
                  │ 4. Docker images build   │
                  │  backend + frontend      │
                  └──────────────────────────┘
```

### Stage 1 — Quality checks (fails in ~15 seconds)

Three cheap guards that catch the mistakes students actually make:

- **No committed `.env`** — a real Supabase connection string in git history is a
  leaked credential. Only `.env.example` is allowed.
- **No committed `node_modules` / `.next`** — keeps the repo small and proves
  `.gitignore` is doing its job.
- **Lockfiles present** — required for the reproducible installs in stage 2.

### Stage 2 — Backend tests against a real database

This is the most important stage. `backend/tests/api.test.js` imports the real
controllers, which query PostgreSQL — so the tests cannot run without a database.

The workflow starts a **PostgreSQL 16 service container** that exists only for the
duration of the job, with a `pg_isready` health check so our steps don't race it.
Then:

1. `npm ci` — installs *exactly* the lockfile versions (unlike `npm install`,
   which may resolve newer ones). Reproducible builds.
2. `npm run db:init` — runs `db/schema.sql`, creating every table and the seed
   data from scratch.
3. `npm test` — 17 tests covering auth, posts CRUD, ownership permissions,
   vote toggling, advice→habit conversion, admin approval, and the gamification
   XP/level curve. A failure sets a non-zero exit code, which fails the job.
4. **Smoke test** — boots `server.js` and polls `GET /api/health` until it
   answers. Unit tests passing doesn't prove the app *starts*; this does.

Because CI gets a fresh throwaway database every run, tests never touch the
team's shared Supabase data — and results can't be polluted by leftover rows.

**One code change was needed to make this possible:** `config/db.js`,
`db/init.js` and `db/migrate.js` hard-coded SSL on, because Supabase requires it.
A plain Postgres container speaks no SSL at all, so the connection failed. They
now read a `DATABASE_SSL` variable: unset means SSL on (Supabase, unchanged
behaviour), `DATABASE_SSL=disable` means off (CI, local Docker).

### Stage 3 — Frontend build

`npm ci` then a production `next build`. This catches broken imports, bad JSX and
invalid server/client component usage — errors `next dev` tolerates but a real
build rejects. The compiled `standalone` output is uploaded as a downloadable
artifact, so the exact bytes each commit produced can be inspected.

Stages 2 and 3 run **in parallel** — they're independent, so a full CI run takes
about as long as the slower of the two rather than their sum.

### Stage 4 — Docker images build

Only starts once **both** stages 2 and 3 are green (`needs:`). It builds both
`Dockerfile`s to prove the containers still assemble — a broken Dockerfile is
invisible to `npm test`. Nothing is pushed here; publishing is CD's job. Layer
caching (`type=gha`) makes repeat runs much faster.

Also configured: **`concurrency`** cancels a superseded run if you push twice in
a row, and **`actions/setup-node` npm caching** avoids re-downloading packages.

---

## 4. CD pipeline — 3 jobs

```
   merge PR into main
          │
          ▼
   ┌─────────────┐    ┌────────────────────┐    ┌──────────────────────┐
   │ 1. CI gate  │───▶│ 2. Publish to GHCR │───▶│ 3. Deploy            │
   │ (reuses     │    │  :<commit-sha>     │    │  environment:        │
   │  ci.yml)    │    │  :latest           │    │  production          │
   └─────────────┘    └────────────────────┘    └──────────────────────┘
       fail = stop         automatic                 approval gate
```

### Job 1 — CI gate (reusable workflow)

```yaml
jobs:
  ci:
    uses: ./.github/workflows/ci.yml
```

CD *calls* the CI workflow rather than duplicating it, so there is one definition
of "correct". If a test fails, jobs 2 and 3 never start.

### Job 2 — Publish images to GHCR

Both images are built and pushed to GitHub Container Registry with **two tags**:

- `:<commit-sha>` — immutable. This is what makes rollback possible: every commit
  on `main` has a permanently runnable artifact.
- `:latest` — convenience pointer to the newest build.

Authentication uses the automatic `GITHUB_TOKEN` (no secret to configure) with
`permissions: packages: write` — least privilege, rather than a broad personal
access token.

> Note on the frontend: `NEXT_PUBLIC_*` values are compiled *into* the bundle at
> build time, so the API URL is a Docker **build-arg** fed from a repository
> variable — not a runtime environment variable.

### Job 3 — Deploy

Uses a GitHub **Environment** (`production`), which is where an approval gate is
configured: add a required reviewer and the job pauses until a human clicks
Approve. That's the distinction between *continuous delivery* (every commit is
release-ready — jobs 1–2, fully automatic) and *continuous deployment* (it goes
live by itself).

The deploy step copies [docker-compose.prod.yml](../docker-compose.prod.yml) to the
server over SSH, then pulls the images tagged with *this exact commit* and
restarts the stack. Secrets on the server stay in a `.env` file there — never in
the image, never in git. Afterwards it polls `/api/health` and **fails the run if
the deployed app doesn't respond**, so a bad release is visible immediately.

**Current status, stated honestly:** no hosting server has been provisioned yet,
so the deploy job detects the missing `DEPLOY_HOST` secret and skips with an
explanation in the run summary instead of failing. Jobs 1 and 2 are fully live —
every commit on `main` really does produce published, versioned images. Adding
the four secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`)
activates deployment with **no workflow edit**.

**Rollback procedure:** re-run the deploy job on an older commit, or on the
server run `IMAGE_TAG=<older-sha> docker compose -f docker-compose.prod.yml up -d`.

---

## 5. Supporting automation

[.github/dependabot.yml](../.github/dependabot.yml) opens weekly PRs for outdated
npm packages and monthly PRs for outdated GitHub Actions. Each of those PRs is
automatically tested by the CI pipeline, so upgrades arrive pre-verified. This is
the supply-chain/maintenance side of DevOps.

---

## 6. How this changes the team's workflow

| Before | After |
| --- | --- |
| "Works on my machine" | Every commit verified on a clean Ubuntu runner |
| Tests skipped (needed a DB) | CI provisions a seeded PostgreSQL automatically |
| Broken `main` found at demo time | PR shows ✗ before it can be merged |
| Manual, improvised deployment | One command against an immutable image tag |
| Rollback = guesswork | Rollback = redeploy an earlier SHA |
| Secrets could slip into a commit | Pipeline fails if a `.env` is committed |

Branch protection recommendation: on GitHub, require the CI checks to pass before
merging into `main`, which turns the pipeline from advisory into enforced.

---

## 7. Demo script (for a live walkthrough)

1. **Show it working.** Actions tab → open the newest CI run → point out the four
   stages, the parallel middle two, and the green Postgres service container.
2. **Show it catching a bug.** On a branch, break one assertion in
   `backend/tests/api.test.js`, push, and open the PR — the check goes red and the
   merge button is blocked. Revert.
3. **Show delivery.** Merge to `main` → CD runs → open Packages and show the two
   images tagged with the commit SHA.
4. **Show the gate.** Point at the `deploy` job waiting on the `production`
   environment, and explain delivery vs deployment.

## 8. Roadmap (what would come next)

- Add ESLint + a `lint` stage (the frontend has no ESLint config yet, so linting
  is deliberately not in the pipeline rather than silently passing).
- Frontend component tests (React Testing Library) and coverage reporting.
- `npm audit` / Trivy image scanning as a security stage.
- A staging environment deployed on every `dev` push, promoted to production on
  release tags.
