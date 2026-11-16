# Scope and isolation

- Every task of more than a few lines starts with a contract in `.claude/contracts/<task-id>.json`:
  goal, can_read, can_write, never_touch, done_when (commands that must exit 0), budget.
- Work on `agent/<task-id>` (or a `claude/*` branch), never on `main`. For large tasks use a worktree:
  `git worktree add -b agent/<task-id> .agent_worktrees/<task-id> main`
- Stay inside `can_write`. If another file needs changing, stop and ask Tobe, then update the contract.
- Log non-obvious decisions as one JSON line each in `.claude/state/decision_ledger.jsonl`.
- Circuit breaker: 20 turns by default. If checks still fail at the limit, or the same error appears
  3 times, stop, reset the branch to its base commit and report what blocked you.

## Protected (the guard hook blocks these; see `.claude/hooks/protected.mjs`)
- `.env*` files: no reading or writing. Secrets live in the Vercel dashboard.
- Lockfiles, `vercel.json` (CSP/HSTS headers, rewrites, 9am reminder cron), `.github/workflows/`.
- The harness itself: `.claude/settings*.json`, `.claude/hooks/`, `.githooks/`.
- Shell: no commits or pushes to `main`, no `--no-verify`, no force-push, no `core.hooksPath` changes,
  no `vercel --prod` / `vercel env` / promote / rollback / domains.

The shell checks are best effort. Treating them as a fence to climb around is a contract breach.
