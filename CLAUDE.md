# Working in this repo

## The bank page (`bank/`, `src/web/`)

- Read `bank/ROADMAP.md` before planning bank work. It holds the plan, the phase statuses and the open questions. Update it in the same PR when a phase's status changes or a question gets answered.
- Make bugs impossible through static analysis wherever possible. Prefer data models that don't need defensive checks, such as indexed lookups that can miss.
- In `bank/web`, each file exports one component. Names end in `Button`, `Text` or `Pane`, and live under `components/buttons`, `components/texts` or `components/panes`.
- To offer UX alternatives, never stack them on the page. List them in `OPTIONS` in `bank/web/src/devOptions.ts`, read the pick with `useDevOption`, and the user toggles them from the dev-only corner button. Once one is chosen, keep it and remove the option.
- Tests are Gherkin features: `bank/web/features` for the page (vitest), `src/web/features` for the server (vitest, one `<name>.test.ts` per feature).

## Checks before a PR

```
nice -n 10 npx vitest run --coverage --minWorkers=1 --maxWorkers=2
npx tsc --noEmit --skipLibCheck -p . && npm run lint
cd bank/web && nice -n 10 npx vitest run --coverage --minWorkers=1 --maxWorkers=2
cd bank/web && npx tsc --noEmit -p . && npm run lint
```

Keep CPU low: `nice -n 10` and few workers.

## Shipping

- Merging to `main` deploys to production. Production code merges only with the user's go-ahead for that PR (see "Reviewing and merging a PR").
- Production database queries are read-only, inside `begin read only` … `rollback`.
- Never read or print secret values, and never ask the user to paste one.
- Don't commit `.claude/`.

## Reviewing and merging a PR

Every PR gets a review from a fresh agent before anyone asks the user about it, so the user only sees clean PRs.

1. **Open the PR and wait for CI.** Run the checks above first.
2. **Start a fresh agent to review it.** It has none of the author's context: give it only the PR number and these steps. It reads this file, `bank/ROADMAP.md` when the PR touches the bank, and the whole diff, then checks:
   - **Bugs:** wrong behaviour, unhandled cases, broken tests, anything a member would hit.
   - **Reuse:** code that duplicates something the repo already has, or that should reuse an existing helper, component or test step.
   - **Fit:** the rules in this file (one component per file and its naming, UX options in `OPTIONS`, Gherkin features, static analysis over defensive checks), the roadmap updated when a phase or question changed, and code that reads like its neighbours.
3. **The agent posts its findings as a GitHub review** on the PR (a comment review: the PRs are opened from the user's account, which can't approve its own PR). The review names the head commit it read, lists each finding with its file and line, and ends with exactly one verdict line: `Verdict: clean` or `Verdict: changes needed`.
4. **Fix everything it flags,** or reply on the finding with why it's wrong. Then start another fresh agent on the new head commit. Repeat until a review of the current head says `Verdict: clean`.
5. **Merge by tier**, always as a squash pinned to one commit (`gh pr merge N --squash --match-head-commit <sha>`, or the GitHub tool's squash merge with that expected head sha), where `<sha>` is the commit the clean review and green CI ran on:
   - **Docs and tests only:** merge without asking, once every CI check passed on that commit. A PR is in this tier when this prints nothing:
     ```
     git diff --name-only --no-renames origin/main...HEAD | grep -vE '\.md$|^(bank/web/features|src/web/features|bank/web/src/__fixtures__)/|\.test\.tsx?$'
     ```
     That is Markdown anywhere (`CLAUDE.md`, the READMEs, `bank/ROADMAP.md`), the Gherkin features and their step files, the page's test fixtures, and `*.test.ts(x)` files. Test-gap PRs count: the user approved the requirement when they labelled the issue.
   - **Everything else needs the user's go-ahead for that PR:** source, data (`bank/data`, `items.json`, `prisma`), config, coverage thresholds, dependencies, CI (`.github`), and deploy files (`Dockerfile`, `Procfile`, `app.json`, `update-dokku-env*.sh`). Ask once the review is clean and CI is green.
