// Shared list of protected paths for the Synako harness.
// Used by .claude/hooks/guard.mjs (blocks agent edits) and .githooks/check-receipt.mjs
// (high-stakes files need an independent reviewer verdict in the receipt).

// Agents may never write these. Humans can still edit them by hand.
export const NEVER_WRITE = [
  { re: /(^|\/)\.env($|\.(?!example$)[^/]*$)/, why: "secrets file (.env*). Set secrets in the Vercel dashboard, never in the repo." },
  { re: /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/, why: "lockfile. Change dependencies by hand, not via an agent." },
  { re: /^vercel\.json$/, why: "vercel.json holds the security headers (CSP, HSTS), rewrites and the daily reminder cron." },
  { re: /^\.github\/workflows\//, why: "CI workflow. Agents must not weaken the checks that judge them." },
  { re: /^\.claude\/(settings(\.local)?\.json|hooks\/)/, why: "harness guard itself. Agents must not switch off their own guard rails." },
  { re: /^\.githooks\//, why: "receipt gate itself. Agents must not switch off their own guard rails." }
];

// Money and authentication. Any commit touching these needs reviewer.verdict = APPROVED in the receipt.
export const HIGH_STAKES = [
  /^api\/pay-start\.js$/,
  /^api\/pay-verify\.js$/,
  /^api\/paystack-webhook\.js$/,
  /^api\/_lib\/pos\.js$/,
  /^js\/pos\.js$/,
  /^js\/pricing\.js$/,
  /^api\/_lib\/staff\.js$/,
  /^api\/staff\/login\.js$/,
  /^api\/_lib\/core\.js$/,   // sign-in tokens, password checks, order updates
  /^api\/order\.js$/          // server-side order totals
];

export const isHighStakes = p => HIGH_STAKES.some(re => re.test(p));
export const neverWriteReason = p => (NEVER_WRITE.find(r => r.re.test(p)) || {}).why || null;
