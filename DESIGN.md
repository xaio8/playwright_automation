# AI Playwright Tester — Design & Flow

Design proposal for turning the current skeleton (`apps/api`, `apps/worker`, `apps/web`, `packages/{shared,ai,test-engine}`) into a web tool:

**URL in → AI generates test plan + Playwright code → user reviews/copies → user runs it → results.**

---

## 1. High-level flow

```
[web]  user types URL  ──POST /api/generations──▶ [api] ──enqueue "analyze" job──▶ [redis/bullmq]
                                                                                      │
                            ◀── SSE /api/generations/:id/events ── [api] ◀─ progress ─┤
                                                                                      ▼
                                                                                  [worker]
                                                          1. Playwright: open URL, snapshot DOM + screenshot
                                                          2. AiProvider.generateTestPlan(pageContext)
                                                          3. zod-validate (+ repair retry), persist TestPlan
                                                          4. codegen → *.spec.ts text
[web] shows plan (cards) + generated code (copy button)
        │
        └─ "Run tests" ──POST /api/executions {planId, caseIds}──▶ [api] ──enqueue "execute"──▶ [worker]
                                                                            test-engine runs steps,
                                                                            streams per-step status,
                                                                            saves screenshots/traces
[web] live run panel: per-case pass/fail, failing step, screenshot, error, trace download
```

Two job types, one queue pattern, so the UI is the same shape for both phases: `queued → running → succeeded|failed` with a progress stream.

### State machine (per generation)

| state | meaning | UI |
|---|---|---|
| `queued` | job accepted | spinner + "waiting for worker" |
| `exploring` | browser open, snapshotting DOM/screenshot | "analyzing page…" |
| `generating` | AI call in flight | "asking model…" |
| `validating` | zod parse / repair retry | "checking output…" |
| `succeeded` | plan + code ready | plan cards + code viewer + Copy / Run |
| `failed` | with `errorKind` (`unreachable_url`, `provider_error`, `invalid_output`, `timeout`) | error card + Retry |

---

## 2. Packages / responsibilities

| package | responsibility | notes |
|---|---|---|
| `packages/shared` | zod schemas + inferred types for `TestPlan`, `PageContext`, API DTOs, event payloads | single source of truth for web/api/worker |
| `packages/ai` | provider abstraction + implementations, prompt templates, output repair | no Playwright, no DB |
| `packages/browser` (new) | page exploration: DOM snapshot, a11y tree, screenshot | today's commented-out `apps/worker/src/browser/*` moves here |
| `packages/codegen` (new) | `TestPlan → .spec.ts` string | what the user copies |
| `packages/test-engine` | executes a `TestPlan` step-by-step, emits step events, collects artifacts | interpreter, not `playwright test` |
| `apps/api` | Fastify HTTP + SSE, validation, persistence, enqueue | never calls the AI or a browser directly |
| `apps/worker` | BullMQ workers (`analyze`, `execute`), concurrency limits | the only place Playwright runs |
| `apps/web` | React + Vite UI | URL form, plan review, code viewer, run panel |

Why keep the plan as data (JSON) *and* emit code: the engine executes the JSON (fast, streamable, no compile step), and codegen gives the user real Playwright they can paste into their own repo. One model, two renderings — no drift.

---

## 3. Pluggable AI integration

`packages/ai` exposes one interface; OpenRouter is just the first implementation.

```ts
// packages/ai/src/provider.ts
export interface GenerateTestPlanInput {
  page: PageContext;            // dom summary, a11y tree, url, title
  screenshot?: { mimeType: string; base64: string };  // used only if capabilities.vision
  instructions?: string;        // optional user hints ("focus on the login form")
}

export interface AiProvider {
  readonly id: string;                       // "openrouter" | "openai" | "anthropic" | "ollama"
  readonly capabilities: { vision: boolean; jsonSchema: boolean };
  generateTestPlan(input: GenerateTestPlanInput, signal?: AbortSignal): Promise<TestPlan>;
}
```

```ts
// packages/ai/src/registry.ts
type Factory = (cfg: ProviderConfig) => AiProvider;
const registry = new Map<string, Factory>();
export function registerProvider(id: string, f: Factory) { registry.set(id, f); }
export function createProvider(cfg = configFromEnv()): AiProvider { /* lookup + throw on unknown id */ }
```

- Adding a provider = one file + one `registerProvider` call. No changes in api/worker/web.
- Selection: `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `<PROVIDER>_API_KEY`; optionally overridable per-request (model dropdown in the UI) while **keys stay server-side only**.
- Shared plumbing lives in the base class, not per provider: prompt building, `zodToJsonSchema(testPlanSchema)` for structured output when `capabilities.jsonSchema`, markdown-fence stripping, and the **repair loop** — on `ZodError`, re-prompt once with the validation errors appended, then fail with `invalid_output`.
- Because most gateways are OpenAI-wire-compatible, `OpenAiCompatibleProvider` covers OpenRouter/OpenAI/Together/Groq/Ollama via `baseURL`; Anthropic/Gemini get their own thin classes.
- `MockProvider` (fixture plan, no network) so the UI, engine and CI work with no API key.

Vision (your "later I'll add screenshots") needs no interface change: the screenshot is already an optional input, and `capabilities.vision` decides whether it is attached.

---

## 4. API surface

| method | path | body / result |
|---|---|---|
| `POST` | `/api/generations` | `{ url, instructions?, providerId?, model? }` → `{ id, state }` |
| `GET` | `/api/generations/:id` | full record: page context summary, plan, generated code, state |
| `GET` | `/api/generations/:id/events` | **SSE**: `state`, `log`, `done` |
| `POST` | `/api/executions` | `{ generationId, caseIds?, headless? }` → `{ id }` |
| `GET` | `/api/executions/:id/events` | **SSE**: `case-start`, `step`, `case-end`, `done` |
| `GET` | `/api/executions/:id/artifacts/:artifactId` | screenshot / trace download |
| `GET` | `/api/providers` | `[{ id, models, capabilities }]` for the UI selector |

Every payload is a zod schema in `packages/shared`, so the React client and Fastify handlers can't drift.

## 5. Persistence

Postgres + Prisma (SQLite for local dev), Redis for BullMQ + SSE fan-out (pub/sub, so any API instance can serve the stream).

```
Target(id, url, createdAt)
Generation(id, targetId, state, providerId, model, pageContext Json, plan Json, code Text, error Json?, timings)
Execution(id, generationId, state, startedAt, finishedAt)
CaseResult(id, executionId, title, category, status, durationMs, failedStepIndex?, error?)
Artifact(id, caseResultId, kind: screenshot|trace|video, path)
```

Plans are immutable and versioned per generation, so a re-run always executes exactly what the user reviewed and copied.

---

## 6. Frontend (React + Vite + TS)

Three screens, one column, progressive disclosure:

1. **Target** — URL input (+ optional instructions, provider/model selector), `Generate`.
2. **Review** — left: test-case cards grouped by `category` (happy-path / validation / negative / boundary) with expandable steps; right: generated `.spec.ts` in a syntax-highlighted read-only viewer with **Copy** and **Download**. Per-case checkboxes select what to run.
3. **Run** — live list from the SSE stream: per-case status, current step, failure message, screenshot thumbnail, trace link.

Stack: TanStack Query for fetches, native `EventSource` for SSE, Zustand (or a reducer) for run state, shadcn/tailwind for UI, `react-syntax-highlighter`/Shiki for code. Vite dev proxy `/api → :3000`.

---

## 7. Reliability & security (must-haves, since users submit arbitrary URLs)

- **SSRF guard**: resolve the hostname and reject private/loopback/link-local ranges and non-`http(s)` schemes *before* navigating; enforce again on redirects.
- **Sandbox**: browsers only in the worker, in a container with no cloud-metadata access, one context per case, hard `navigationTimeout`/`stepTimeout`/total-run timeout, capped concurrency.
- **Prompt-injection realism**: page content is untrusted data. The model output is *always* re-validated against the schema, and executable actions are restricted to the enum — page text can never introduce a new action type.
- **Secrets**: API keys live only in the API/worker env; `{{VAR}}` in steps resolves from a **server-side allowlist** of credential vars, and values are redacted in logs/events.
- **DOM budget**: truncate/prioritize the snapshot (interactive elements + a11y tree, capped chars) to control token cost and keep prompts stable.

---

## 8. Fixes needed in the current skeleton

Found while reading the initial commit — all small, all done as part of step 0:

1. `packages/test-engine/src/executor/locator.ts` supports `placeholder`/`testId` but the schema (`test-plan.schema.ts`) declares `role`/`label`/`text`/`testid` → `role` throws at runtime and `placeholder` can never be produced. Align both on one enum (`role`, `label`, `text`, `placeholder`, `testid`, `css`) and implement `role` as `getByRole(role, { name })` with a structured target (`{ role, name }`), not the current `"button[name='Login']"` string that the prompt asks for.
2. `execute.step.ts` never handles `expect-visible` / `expect-text` although the schema allows them → generated plans fail with "Unsupported action".
3. `step.target` and `step.value` are optional in the schema but `getLocator`/`resolveValue` assume present → narrow per action with a zod discriminated union on `action`, which also removes the `as any` cast.
4. `tsconfig.base.json` is entirely commented out and no package extends it; `apps/worker` pins `typescript@^7`, `apps/api` `~6.0.3`, `apps/web` `~6.0.2`. Pin one version everywhere (`6.0.3`, since `typescript-eslint` refuses TS 7) and have every package `extends` the base.
5. `.env.example` contains only `OPENROUTER_API_KEY=` with no newline — extend for the provider registry, Redis and DB.
6. `runner.ts` hardcodes `headless: false` (breaks in CI/containers) → config-driven, default headless.
7. `apps/worker/src/browser/{explorer,page.inspector}.ts` are fully commented out while `worker.ts` inlines a weaker `page.evaluate` — restore them as `packages/browser`.
8. No lint/test/CI at the root: add `pnpm lint`/`typecheck` across the workspace, vitest for shared/ai/codegen, and a GitHub Actions workflow.

---

## 9. Suggested build order

| step | outcome |
|---|---|
| 0 | Repo hygiene: tsconfig base, one TS version, root lint/typecheck/test, CI, fixes 1–7 above |
| 1 | `packages/shared` schemas (discriminated-union steps, `PageContext`, API DTOs, event types) |
| 2 | `packages/ai`: `AiProvider` + registry + `OpenAiCompatibleProvider` (OpenRouter) + `MockProvider` + repair loop |
| 3 | `packages/browser` explorer, `packages/codegen` (plan → `.spec.ts`) |
| 4 | `apps/api`: routes above, Prisma, BullMQ producer, SSE via Redis pub/sub |
| 5 | `apps/worker`: `analyze` + `execute` workers, artifacts, SSRF guard, timeouts |
| 6 | `apps/web`: the three screens end-to-end |
| 7 | Screenshot/vision input, provider dropdown, auth + multi-user, scheduled re-runs |

Steps 1–6 are the MVP; each step is independently reviewable as its own PR.
