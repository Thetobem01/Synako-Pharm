# Synako Pharmacy: agent guide

Online shop for a PCN-registered pharmacy in Nigeria: catalogue, checkout (Paystack), prescriptions,
live tracking, Pharmacist Desk (`/pharmacist`), till (`/pos`). Static site + Vercel serverless API,
orders in Upstash Redis. No build step, no dependencies. Full detail in `README.md`.

## Map
| Path | What |
|---|---|
| `index.html`, `css/styles.css`, `js/app.js` | The whole front end (single-page app) |
| `js/config.js` | Business details, hours, delivery rules, fees. Real licence data only, never invented |
| `js/data.js` | Products, prices, departments |
| `js/pricing.js` | Delivery and totals, shared by site and server |
| `js/pos.js`, `api/_lib/pos.js` | Till rules and storage |
| `api/` | Serverless functions (Hobby plan: 12-function limit, so routes are grouped) |
| `api/_lib/core.js` | Redis, auth tokens, order updates, `log()` audit trail |
| `dev/server.mjs` | Local server: `npm run dev` (mock Paystack, test passwords) |
| `tests/` | `node --test`, no framework |

## Commands (all must exit 0 before any commit)
```
npm run check   # node --check on every source file
npm test        # all tests in tests/*.test.mjs
```
CI runs both on every PR. Never claim they pass without running them in this session.

## Rules
- `.claude/rules/scope.md`: contract, branch, write list, protected files, circuit breaker
- `.claude/rules/high-stakes.md`: payments and sign-in need an independent reviewer
- `.claude/rules/compliance.md`: PCN 2026 rules the code must keep (no controlled drugs online, POMs need a prescription, Nigeria only, adults only, audit trail)

## Process for every non-trivial task
1. **Contract** in `.claude/contracts/<task-id>.json`. Show it to Tobe before building.
2. **Isolate** on `agent/<task-id>`. Never on `main`.
3. **Build** inside the write list only.
4. **Verify**: run every `done_when` command, record real exit codes, check `git diff --name-only` against the write list.
5. **Review** (high-stakes files): separate reviewer agent tries to break it.
6. **Receipt** in `.claude/receipts/receipt-<task-id>.json` (see the example from `harness-setup`).
   Get the checksums with `node .githooks/check-receipt.mjs --checksums` after staging.
7. **Commit** only when Tobe asks. Open a PR; Tobe merges.
8. **Learn**: when something broke or Tobe corrected the work, offer a rule, check or regression test.

## Guard rails (installed)
- `.claude/settings.json` → `.claude/hooks/guard.mjs` blocks protected edits and risky commands (exit 2).
- `.githooks/pre-commit` blocks commits on `agent/*` and `claude/*` without a matching APPROVED receipt.
  Enable once per clone: `git config core.hooksPath .githooks`
- `bash evals/harness-dryrun.sh` proves every barrier still blocks.

## Gotchas
- `vercel.json` has the CSP: new third-party scripts/fonts/APIs won't load until Tobe adds them there.
- Money is in Naira in the app; Paystack wants kobo (×100). Check every boundary.
- Test payments with `PAYSTACK_MOCK=1` or `sk_test_` keys only.
