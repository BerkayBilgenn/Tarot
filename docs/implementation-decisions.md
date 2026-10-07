# Uygulama kararları ve doğrulama kaydı

# SDD ledger — plan: docs/superpowers/plans/2026-10-07-holistic-tarot.md
Baseline: f8b9d7f; 125/125 tests pass with localhost listening enabled.
Pre-flight: Tasks 1→3→4→5 share validated Result and spread position keys; exact shape/order consistent.
Pre-flight: Tasks 2→3 share Store/Config/Ticket contracts; Task 3→4 share signed oracleState; consistent.
Ruling: Use qwen3.8-flash and Singapore prices 150/470 nanodollars per input/output token — user explicitly chose this model — if wrong, budget accounting over/understates charges.
Ruling: Live local testing with provided key is authorized by latest user message; key only in ignored mode-600 .env.local — overrides earlier no-live-call plan scope — tests may incur small token charges within $10.
Ruling: Add a disk-backed store only for explicitly launched loopback preview; production still requires Redis and fails closed — user requests local testing without Redis credentials — local store supports one process only and must never serve production.
Task 1: complete (commits f8b9d7f..2188b05, tests: node --test tests/oracle-result.test.cjs tests/oracle.test.cjs → ℹ duration_ms 163.664167)
Task 2: complete (commits 2188b05..ab54d03, tests: node --test tests/oracle-identity.test.cjs tests/oracle-store.test.cjs → ℹ duration_ms 67.394792)
Task 3: complete (commits ab54d03..2c004f9, tests: node --test tests/closing-api.test.cjs tests/oracle-client.test.cjs → ℹ duration_ms 107.373291)
Task 4: complete (commits 2c004f9..ab8b40f, tests: node --test tests/holistic-storage.test.cjs tests/storage-recovery.test.cjs tests/reading.test.cjs → ℹ duration_ms 295.495375)
Task 5: complete (commits ab8b40f..9c54fb7, tests: node --test tests/reading-presentation.test.cjs tests/ui-helpers.test.cjs → ℹ duration_ms 47.629459)
Ruling: Test the real disk store instead of introducing a separate memory fake — local persistent preview is needed — Redis Lua atomicity still needs a real Redis integration check.
Ruling: Local preview uses a 20/day test quota while production example stays 2/day — four distinct comparison samples need room — do not copy local quota into production.
Ruling: Use bundled accessibility skill after offline ui-skills CLI was unavailable — avoid fetching extra tooling for a small UI change — broader automated accessibility audit remains unperformed.
Task 6: Redis result bodies travel as raw JSON strings through Lua; JavaScript parses them — empty daily connection arrays must stay arrays — focused regression observed RED→GREEN.
Task 6: complete (commits 9c54fb7..eae2eff, tests: npm test → ℹ duration_ms 618.221542)
Final: reviewer found two Important and one Minor, no Critical. Reproduced all three in targeted RED tests.
Final: Ruling: Re-grade empty supplied ticket bypass as Important — an invalid supplied credential must not start a chargeable reading — unexpected token charge if left unfixed.
Final: Ruling: Separate status reads (12/minute) from session/generation (6/minute) — existing five polls must fit without competing with creation — slightly more Redis/status traffic, no extra provider generation.
Final: Ruling: Actual Qwen prose/billing remain unjudged until account activation — upstream denied requests — claiming quality or actual costs now would mislead the user.
Final: Ruling: Actual Redis Lua conformance remains a production prerequisite — no Redis credentials/service provided — multi-instance correctness is unverified on the deployed service.
Final: Ruling: Browser checks cover mobile/desktop, not physical devices or exhaustive assistive technology — only these surfaces available — undiscovered device/accessibility issues remain possible.
Final: Ruling: Provider prices accepted after checking official qwen3.8-flash Singapore page — matches user screenshot — future provider price changes can invalidate accounting.
Final: fixed successful-response storage loss — ticket-save and actual closing UI storage-full tests RED→GREEN, suite 151/151.
Final: fixed pending poll self-throttling — independent status allowance handler test RED→GREEN, suite 151/151.
Final: fixed empty supplied ticket bypass — empty-ticket no-provider test RED→GREEN, suite 151/151.
Final: added actual fillClosing/setClosingText deferred-navigation regression; A persisted, rendered B unchanged, suite 151/151.
Final: minor (deferred): none; the sole initially Minor ticket finding was re-graded Important and fixed.
Final: browser coverage all six spreads, daily fallback and successful fixture Celtic/relationship/career/decision/three; late navigation, history reload, orientation, guide reset, focus and mobile/desktop checks passed.
Final: keeping local/holistic-qwen and explicit loopback preview per user local-only instruction; no merge/push/deploy.
