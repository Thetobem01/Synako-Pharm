# High-stakes files: independent review required

These handle money or sign-in. A commit touching any of them is blocked unless the receipt has
`"reviewer": { "verdict": "APPROVED", ... }`.

| File | Why |
|---|---|
| `api/pay-start.js`, `api/pay-verify.js`, `api/paystack-webhook.js` | Paystack payments and webhook signature checks |
| `api/order.js`, `js/pricing.js` | Order totals the server trusts |
| `api/_lib/pos.js`, `js/pos.js` | The till: cash and card sales at the counter |
| `api/_lib/core.js`, `api/_lib/staff.js`, `api/staff/login.js` | Sign-in tokens, passwords, roles |

## The reviewer
- A separate agent that gets the contract and the diff, **not** the builder's reasoning.
- Told to break it: concurrent orders and double payments, replayed or unsigned webhooks, amount
  mismatches (kobo vs naira), empty/null/huge inputs, Paystack or Redis failing mid-request,
  partially saved orders, role escalation (rider/pos reaching desk routes), files touched out of scope.
- Returns `APPROVED` with evidence (commands run, exit codes) or `REJECTED` with a reproduction.
- Payments are tested with `PAYSTACK_MOCK=1` or `sk_test_` keys only. Never live keys.
