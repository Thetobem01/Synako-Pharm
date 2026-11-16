#!/usr/bin/env bash
# Synako harness dry run: deliberately trigger every barrier and check it blocks,
# then check the valid paths still pass. Works on a throwaway copy; the real repo is untouched.
#   bash evals/harness-dryrun.sh      -> exit 0 if every case behaves
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; failn=0
ok()  { pass=$((pass+1)); printf '  PASS  %s\n' "$1"; }
bad() { failn=$((failn+1)); printf '  FAIL  %s\n' "$1"; }

# Throwaway repo: current working tree, committed on main, receipt gate enabled.
W="$TMP/repo"; mkdir -p "$W"
(cd "$REPO" && tar --exclude=.git --exclude=.agent_worktrees -cf - .) | (cd "$W" && tar xf -)
cd "$W"
git init -q -b main && git config user.email dry@run && git config user.name dryrun && git config commit.gpgsign false
git add -A && git -c core.hooksPath=/dev/null commit -qm baseline
git config core.hooksPath .githooks

# guard <expected-exit> <label> <json>
guard() {
  local want="$1" label="$2" json="$3" got
  printf '%s' "$json" | node "$W/.claude/hooks/guard.mjs" >/dev/null 2>"$TMP/err"; got=$?
  if [ "$got" = "$want" ]; then ok "guard: $label (exit $got)"; else bad "guard: $label (want $want, got $got: $(head -1 "$TMP/err"))"; fi
}
f() { printf '{"tool_name":"%s","tool_input":{"file_path":"%s"},"cwd":"%s"}' "$1" "$2" "$W"; }
b() { node -e 'process.stdout.write(JSON.stringify({tool_name:"Bash",tool_input:{command:process.argv[1]},cwd:process.argv[2]}))' "$1" "$W"; }

echo "== Guard hook: blocked =="
guard 2 "write .env"                       "$(f Write .env)"
guard 2 "edit .env.production"             "$(f Edit "$W/.env.production")"
guard 2 "read .env.local"                  "$(f Read .env.local)"
guard 2 "edit vercel.json"                 "$(f Edit vercel.json)"
guard 2 "edit CI workflow"                 "$(f Edit .github/workflows/ci.yml)"
guard 2 "write package-lock.json"          "$(f Write package-lock.json)"
guard 2 "edit the guard itself"            "$(f Edit .claude/hooks/guard.mjs)"
guard 2 "edit .claude/settings.json"       "$(f Edit .claude/settings.json)"
guard 2 "edit the receipt gate"            "$(f Edit .githooks/check-receipt.mjs)"
guard 2 "write outside the repo"           "$(f Write /etc/synako.txt)"
guard 2 "shell: cat .env"                  "$(b 'cat .env')"
guard 2 "shell: append to vercel.json"     "$(b 'echo x >> vercel.json')"
guard 2 "shell: sed -i vercel.json"        "$(b 'sed -i s/a/b/ vercel.json')"
guard 2 "shell: rm CI workflow"            "$(b 'rm .github/workflows/ci.yml')"
guard 2 "shell: commit --no-verify"        "$(b 'git commit --no-verify -m x')"
guard 2 "shell: commit -n"                 "$(b 'git add -A && git commit -nm x')"
guard 2 "shell: commit while on main"      "$(b 'git commit -m x')"
guard 2 "shell: push origin main"          "$(b 'git push origin main')"
guard 2 "shell: push HEAD:main"            "$(b 'git push origin HEAD:main')"
guard 2 "shell: force push"                "$(b 'git push --force origin agent/x')"
guard 2 "shell: change core.hooksPath"     "$(b 'git config core.hooksPath /dev/null')"
guard 2 "shell: vercel --prod"             "$(b 'npx vercel --prod')"
guard 2 "shell: vercel env pull"           "$(b 'vercel env pull')"
guard 2 "malformed tool call"              "not json"

echo "== Guard hook: allowed =="
guard 0 "edit js/app.js"                   "$(f Edit js/app.js)"
guard 0 "write .env.example"               "$(f Write .env.example)"
guard 0 "write a receipt"                  "$(f Write .claude/receipts/receipt-x.json)"
guard 0 "write in /tmp"                    "$(f Write /tmp/scratch.txt)"
guard 0 "read vercel.json"                 "$(f Read vercel.json)"
guard 0 "shell: npm test"                  "$(b 'npm test')"
guard 0 "shell: cat vercel.json"           "$(b 'cat vercel.json')"
guard 0 "shell: process.env in node -e"    "$(b 'node -e "console.log(process.env.HOME)"')"
guard 0 "shell: preview deploy"            "$(b 'vercel deploy')"

git checkout -qb agent/demo
guard 0 "shell: commit on agent branch"    "$(b 'git commit -m x')"
guard 0 "shell: push agent branch"         "$(b 'git push -u origin agent/demo')"

echo "== Receipt gate =="
R=.claude/receipts/receipt-demo.json
receipt() { # receipt <verdict> [reviewer-verdict]
  local rv="${2:-}"
  node -e '
    const [files, verdict, rv] = [JSON.parse(process.argv[1]), process.argv[2], process.argv[3]];
    const r = { task_id: "demo", verdict, files };
    if (rv) r.reviewer = { verdict: rv, evidence: "dry run" };
    process.stdout.write(JSON.stringify(r, null, 2));' "$(node .githooks/check-receipt.mjs --checksums)" "$1" "$rv" > "$R"
}
commit() { # commit <expect 0|1> <label>
  if git commit -qm "$2" >/dev/null 2>"$TMP/err"; then got=0; else got=1; fi
  if [ "$got" = "$1" ]; then ok "gate: $2"; else bad "gate: $2 (want $1, got $got: $(grep -m1 '  ' "$TMP/err"))"; fi
}

echo "// dry run" >> js/app.js; git add js/app.js
commit 1 "blocks commit with no receipt"
receipt REJECTED; git add "$R"
commit 1 "blocks receipt with verdict REJECTED"
receipt APPROVED; git add "$R"
echo "// sneaky change after receipt" >> js/app.js; git add js/app.js
commit 1 "blocks checksum mismatch (file changed after receipt)"
receipt APPROVED; git add "$R"   # receipt now matches js/app.js exactly...
echo "// extra" >> css/styles.css; git add css/styles.css   # ...but css isn't in it
commit 1 "blocks staged file missing from receipt"
receipt APPROVED; git add "$R"
commit 0 "allows matching APPROVED receipt"

echo "// touch payments" >> api/pay-start.js; git add api/pay-start.js
receipt APPROVED; git add "$R"
commit 1 "blocks high-stakes file without reviewer"
receipt APPROVED REJECTED; git add "$R"
commit 1 "blocks high-stakes file with reviewer REJECTED"
receipt APPROVED APPROVED; git add "$R"
commit 0 "allows high-stakes file with reviewer APPROVED"

git checkout -qb tobe/quick-fix
echo "// Tobe's own edit" >> js/app.js; git add js/app.js
commit 0 "does not gate Tobe's own branches"

echo
echo "Dry run: $pass passed, $failn failed"
[ "$failn" = 0 ]
