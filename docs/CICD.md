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

## 3. CI pipeline — 6 stages

```
                    ┌──────────────────────┐
                    │ 1. Quality checks    │
                    │  secrets / hygiene   │
                    │  every .js parses    │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│ 2. Backend tests │ │ 3. Frontend build│ │ 4. Trivy FS scan       │
│ PostgreSQL 16    │ │ next build (prod)│ │  vuln + secret +       │
│ db:init→npm test │ │ upload artifact  │ │  misconfig, SARIF      │
│ → /api/health    │ │                  │ │  CRITICAL = fail       │
└────────┬─────────┘ └────────┬─────────┘ └───────────┬────────────┘
         └─────────┬──────────┘                       │
                   ▼                                  │
   ┌───────────────────────────────────┐              │
   │ 5. Docker build + Trivy IMAGE scan│              │
   │  backend + frontend images        │              │
   │  CRITICAL (fixable) = fail        │              │
   └───────────────┬───────────────────┘              │
                   └──────────────┬───────────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │ 6. CI result             │
                    │  one required check      │
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

### Stage 4 — Trivy filesystem scan (security)

Scans the repository three ways in one pass:

| Scanner | Finds |
| --- | --- |
| `vuln` | known CVEs in the backend and frontend dependency trees, read from the lockfiles |
| `secret` | credentials committed by accident — API keys, tokens, private keys |
| `misconfig` | insecure settings in the Dockerfiles, compose files and Kubernetes manifests |

Two passes, deliberately. The **report** pass prints everything, uploads SARIF to
the repository's **Security tab**, and attaches the raw report as an artifact —
nothing is hidden. The **gate** pass then fails the build only on `CRITICAL`
findings that have a fix available (`--ignore-unfixed`), because a gate nobody
can act on just teaches the team to ignore the pipeline.

### Stage 5 — Docker images build + Trivy image scan

Only starts once **both** stages 2 and 3 are green (`needs:`). It builds both
`Dockerfile`s to prove the containers still assemble — a broken Dockerfile is
invisible to `npm test` — and then scans the built images.

The image scan sees what the filesystem scan cannot: the OS packages inside the
layers (Alpine/Debian CVEs) and anything a build step pulled in. Images are built
with `load: true` so Trivy scans the exact artifact this commit produced. Same
two-pass rule: report + SARIF for everything, fail on fixable `CRITICAL`.

Nothing is pushed here; publishing is CD's job — and CD re-scans what it pushed.
Layer caching (`type=gha`) makes repeat runs much faster.

### Stage 6 — CI result

One job that `needs:` all the others, runs even when they fail (`if: always()`),
publishes the per-stage table, and exits non-zero if anything upstream failed.
**Point branch protection at this single check** — then adding a stage later
never means reconfiguring the protected-branch rules.

### A note on `concurrency`

The group is `${{ github.workflow }}-${{ github.ref }}`, and the workflow name
must be in it. CD calls this file as a reusable workflow, and a called workflow
re-evaluates its own `concurrency` block: with a hard-coded `ci-` prefix, the
CD-invoked run and the standalone run landed in the *same* group on `main` and
cancelled each other on every push — CI runs #19, #22 and #23 were all cancelled
for exactly this reason, which made the CI badge read "failing" while the
pipeline was in fact passing inside CD. Including `github.workflow` (which
resolves to the *caller's* name) separates them.

---

## 4. CD pipeline — 4 stages, 2 deploy targets

```
   merge PR into main
          │
          ▼
   ┌─────────────┐   ┌──────────────────┐   ┌────────────────────┐
   │ 1. CI gate  │──▶│ 2. Publish GHCR  │──▶│ 3. Trivy scan the  │
   │ (reuses     │   │  :<commit-sha>   │   │    PUBLISHED images│
   │  ci.yml)    │   │  :latest         │   │  CRITICAL = stop   │
   └─────────────┘   └──────────────────┘   └─────────┬──────────┘
       fail = stop        automatic                   │
                                       ┌──────────────┴──────────────┐
                                       ▼                             ▼
                          ┌────────────────────────┐   ┌────────────────────────┐
                          │ 4a. Deploy to AWS EC2  │   │ 4b. Deploy to k3s      │
                          │  docker compose / SSH  │   │  kubectl set image     │
                          │  + /api/health check   │   │  + rollout status      │
                          └────────────────────────┘   └────────────────────────┘
                              environment: production      environment: production
```

Each deploy target activates **only when its own secrets exist**, so the pipeline
stays green while an environment is still being set up, and the team can run
either target (or both) without editing the workflow.

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

### Job 3 — Scan the published images (Trivy)

CI scanned the images it *built*; this scans them again by their GHCR tag — the
byte-identical artifact a server is about to pull. A fixable `CRITICAL` here
stops the release before it reaches any environment. It has a second use: re-run
this job weeks later and it re-checks an already-released image against a *newer*
vulnerability database, which is how you learn that last month's release became
vulnerable overnight.

### Job 4a — Deploy to AWS EC2 (cloud deployment)

The cloud target. The EC2 instance never builds anything: it pulls the exact
images this commit published to GHCR, so what was tested and scanned is literally
what runs.

1. `scp` [docker-compose.prod.yml](../docker-compose.prod.yml) from this commit to the instance
2. `docker login ghcr.io` with the run's own `GITHUB_TOKEN`
3. `docker compose pull` + `up -d --remove-orphans` with `IMAGE_TAG=<commit-sha>`
4. poll `/api/health` on the box for up to 150 s — **a release that starts but
   does not serve fails the pipeline**, and the job prints the backend logs
5. prune old images

Secrets on the instance stay in `$APP_DIR/.env` — never in the image, never in
git. The job fails with a clear message if that file is missing.

| Secret / variable | Meaning |
| --- | --- |
| `AWS_HOST` | EC2 public IPv4 or DNS name |
| `AWS_USER` | SSH user (`ubuntu` on Ubuntu AMIs, `ec2-user` on Amazon Linux) |
| `AWS_SSH_KEY` | contents of the EC2 key pair `.pem` |
| `AWS_APP_DIR` *(variable, optional)* | deploy directory, defaults to `/opt/nextstep` |

The instance itself is provisioned by the team's Ansible playbook
(`ansible/site.yml` on the `feature/ansible` branch); this job only performs the
release onto it.

### Job 4b — Deploy to the k3s cluster

The Kubernetes target, unchanged: SSH to the cluster VM, `kubectl apply` the
committed manifests, then `kubectl set image` both Deployments to this commit's
tags and wait on `rollout status`. Secrets: `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY`.

Both deploy jobs use the `production` GitHub **Environment**, which is where an
approval gate lives: add a required reviewer and the job pauses until a human
clicks Approve. That is the distinction between *continuous delivery* (every
commit is release-ready — jobs 1–3, fully automatic) and *continuous deployment*
(it goes live by itself).

**Each target is a no-op until its own secrets exist** — it detects the missing
secret and skips with an explanation in the run summary instead of failing, so
the pipeline stays green while an environment is being set up and no workflow
edit is needed to switch it on.

**Rollback procedure:** re-run the deploy job on an older commit (the image tag
*is* the commit SHA), or on the instance run
`IMAGE_TAG=<older-sha> docker compose -f docker-compose.prod.yml up -d`.

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

Delivered since the first version of this document: **Trivy filesystem and image
scanning as gating security stages** (CI stages 4 and 5, CD job 3), the
**aggregate `CI result` check**, a **JavaScript parse gate**, and **AWS EC2 as a
deploy target** alongside k3s.

Still open, and honest about why:

- **ESLint + a `lint` stage.** Neither app has an ESLint config or the
  dependency, so adding the stage means adding devDependencies and regenerating
  both lockfiles — a change that must be made by someone who can run `npm` and
  commit the resulting `package-lock.json`. Until then, CI's parse gate
  (`node --check` on every JS file) is the stand-in: it catches syntax errors,
  not style. To close this properly:

  ```bash
  cd frontend && npm i -D eslint eslint-config-next   # regenerates the lockfile
  cd ../backend && npm i -D eslint
  # then add a `lint` job to ci.yml mirroring the parse-gate job
  ```

- **Coverage reporting.** `backend/tests/api.test.js` uses a hand-rolled runner
  (`require("assert")` + a collected list), not `node:test`, so Node's built-in
  `--experimental-test-coverage` does not apply and a coverage tool (c8/nyc)
  would again mean a new devDependency. Migrating the file to `node:test` would
  unlock coverage with no dependency at all.

- **Frontend tests.** All 17 tests are backend; the frontend is built by CI but
  never tested.

- A staging environment deployed on every `dev` push, promoted to production on
  release tags.
