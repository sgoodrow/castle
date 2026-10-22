# Working in this repo

## The bank page (`bank/`, `src/web/`)

- Read `bank/ROADMAP.md` before planning bank work. It holds the plan, the phase statuses and the open questions. Update it in the same PR when a phase's status changes or a question gets answered.
- Make bugs impossible through static analysis wherever possible. Prefer data models that don't need defensive checks, such as indexed lookups that can miss.
- In `bank/web`, each file exports one component. Names end in `Button`, `Text` or `Pane`, and live under `components/buttons`, `components/texts` or `components/panes`.
- To offer UX alternatives, never stack them on the page. List them in `OPTIONS` in `bank/web/src/devOptions.ts`, read the pick with `useDevOption`, and the user toggles them from the dev-only corner button. Once one is chosen, keep it and remove the option.
- Tests are Gherkin features: `bank/web/features` for the page (vitest), `src/web/features` for the server (vitest, one `<name>.test.ts` per feature).

## The bot (`src/`)

- Its tests are Gherkin features too, in `src/bot-features` (vitest, one `<name>.test.ts` per feature). They run the bot's code on real Postgres: each feature file gets its own database with every migration applied, on the server at `TEST_DATABASE_URL` (default `postgresql://postgres@localhost:5433/postgres`). Only Discord and Google Sheets are stand-ins.
- Port a test there only when it states what members, officers or the sheets' editors see. Unit tests of parsers and helpers stay beside their code.

## Checks before a PR

```
nice -n 10 npx vitest run --coverage --minWorkers=1 --maxWorkers=2
npx tsc --noEmit --skipLibCheck -p . && npm run lint
cd bank/web && nice -n 10 npx vitest run --coverage --minWorkers=1 --maxWorkers=2
cd bank/web && npx tsc --noEmit -p . && npm run lint
```

Keep CPU low: `nice -n 10` and few workers.

## Shipping

- Merging to `main` deploys to production. Never merge without the user's go-ahead.
- Production database queries are read-only, inside `begin read only` … `rollback`.
- Never read or print secret values, and never ask the user to paste one.
- Don't commit `.claude/`.
