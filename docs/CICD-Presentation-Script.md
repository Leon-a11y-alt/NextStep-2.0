# CI/CD — 3-slide presentation script

Deck: `docs/NextStep-CICD-Brief.pptx` · Total speaking time: **~2 min 20 s**

The script below is what you say out loud. It's also in the speaker-notes pane
of each slide, so you can read it from Presenter View.

---

## Slide 1 — "CI/CD Pipeline for NextStep"  (~40 s)

> "For this phase of the project, my contribution was the CI/CD pipeline.
>
> The diagram on the right is the whole idea. A commit comes in at the top. It
> gets tested automatically. It gets packaged into a Docker image. And the last
> circle — releasing it onto a server — is greyed out, because that's the part
> that's still waiting, and I'll come back to that.
>
> In total: two pipelines, seven automated jobs, seventeen tests, and two
> container images. All of it runs by itself on GitHub Actions, on every commit.
> Nobody has to remember to run anything."

**If asked "why bother?"**
> "Five of us work on five branches. Before this, 'does the app still work?'
> depended on whose laptop ran it — and the API tests were being skipped,
> because they need a database with data in it. Now the pipeline does that."

---

## Slide 2 — "Seven automated jobs, no manual steps"  (~60 s)

> "The top row is CI — continuous integration. It runs on every single push.
>
> **Quality** checks the repo is clean — no passwords or `.env` files committed.
> **Tests** is the important one: it starts a real PostgreSQL database, creates
> the tables, loads the seed data, and runs seventeen tests against the actual
> API. Then it starts the server and checks the health endpoint answers, because
> passing tests doesn't prove the app actually boots.
> **Build** compiles the frontend the production way.
> **Image** builds both Docker containers — a broken Dockerfile is something no
> unit test can catch.
>
> The bottom row is CD — continuous delivery. It runs when a pull request is
> merged into main.
>
> **Gate** re-runs everything in the top row first, so nothing untested can get
> published. **Publish** pushes both images to GitHub's container registry,
> tagged with the commit ID. **Release** needs a human to click approve.
>
> And the line at the bottom is really the point of all of it: if a test fails,
> the pull request goes red and it cannot be merged."

**If asked "what was the hardest part?"**
> "Getting the tests to run in the pipeline. Our tests import the real
> controllers, and those query PostgreSQL — so with no database, they can't run
> at all. So the pipeline starts a throwaway Postgres container for every run.
> But our database code had SSL hard-coded on, because our real database is on
> Supabase which requires it, and a plain container doesn't support SSL at all.
> So I made it a setting: SSL on for Supabase, off for the CI container. One
> small change, and the tests went from unrunnable to automatic."

**If asked "why tag images with the commit ID?"**
> "So we can roll back. Every commit on main has its own permanent image, so
> undoing a bad release is one command with an older tag, instead of guesswork."

---

## Slide 3 — "Live today — except the last step"  (~40 s)

> "Where it actually stands.
>
> Three things are live and running right now: CI on every push, tests against a
> real database, and container images published on every merge to main.
>
> The fourth one I want to be straight about. We haven't set up a hosting server
> yet, so the deploy job has no target. Rather than let that fail the pipeline, it
> detects the missing setting and skips with an explanation. The diagram shows
> it — two green, one paused. The deploy code is written; what it's waiting on is
> a server, not more work from me. Four secrets and it goes live.
>
> So the one-sentence version: continuous integration and continuous delivery
> are running. Continuous deployment is switched off on purpose, behind an
> approval gate, until we have a server."

**If asked "so is that real CI/CD or not?"**
> "It's CI plus continuous delivery. The difference between delivery and
> deployment is exactly that one approval click — every commit is already
> release-ready, we just choose when it goes out."

**If asked "what's next?"**
> "Branch protection first, so the checks are enforced and not just advisory.
> Then ESLint and frontend tests. I deliberately left lint out rather than add a
> stage that passes without checking anything."

---

## Cheat sheet — numbers and names

| Thing | Value |
| --- | --- |
| CI stages | 4 — quality, backend tests, frontend build, Docker build |
| CD jobs | 3 — CI gate, publish, deploy |
| Tests | 17, in `backend/tests/api.test.js` |
| Database in CI | `postgres:16-alpine` service container, seeded per run |
| Registry | GHCR — `ghcr.io/leon-a11y-alt/nextstep-2.0/backend` and `/frontend` |
| Image tags | commit SHA (immutable) + `latest` |
| Files | `.github/workflows/ci.yml`, `.github/workflows/cd.yml` |
| Parallel? | Yes — backend tests and frontend build run at the same time |

## Live demo, if there's time (2 min)

1. **Actions tab** → open the newest CI run. Point out the four stages and the
   Postgres service container.
2. **Break it on purpose** — change one assertion in `api.test.js`, push, open
   the PR. The check goes red and merging is blocked. Revert it.
3. **Packages** → show both images tagged with the commit SHA.
4. **The deploy job** waiting on the `production` environment — that's delivery,
   not deployment.
