# AI Playwright Tester

Web tool that turns a URL into a reviewable Playwright test suite:

1. user enters a URL
2. the page is explored with Playwright (DOM snapshot + optional screenshot)
3. an AI provider generates a validated test plan
4. the user reviews and copies the generated tests
5. the user runs them and watches the results

See [DESIGN.md](./DESIGN.md) for the architecture, API surface and build order.

## Layout

| path | role |
| --- | --- |
| `apps/web` | React + Vite UI |
| `apps/api` | Fastify HTTP + SSE |
| `apps/worker` | Playwright exploration and test execution |
| `packages/shared` | zod schemas shared by web/api/worker |
| `packages/ai` | pluggable AI providers |
| `packages/browser` | page exploration + SSRF guard |
| `packages/test-engine` | executes a test plan step by step |

## Getting started

Requires Node 22+ and pnpm 11.

```bash
pnpm install
cp .env.example .env      # then set AI_PROVIDER and the matching API key
pnpm dev:web              # UI on http://localhost:5173
pnpm dev:api              # API on http://localhost:3000
pnpm dev:worker <url>     # explore a URL, generate a plan and run it
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## Choosing an AI provider

Providers are looked up in a registry, so switching is configuration only:

```bash
AI_PROVIDER=openrouter   # openrouter | openai | ollama | mock
AI_MODEL=google/gemini-2.5-flash
OPENROUTER_API_KEY=...   # key env var is <PROVIDER_ID>_API_KEY
```

`mock` returns a deterministic plan with no network access, which is what CI and
UI development use.

### Adding a provider

Any OpenAI-wire-compatible gateway is a few lines — reuse
`OpenAiCompatibleProvider` and register the factory:

```ts
registerProvider("together", (config) =>
  new OpenAiCompatibleProvider({
    id: "together",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    capabilities: { vision: false, jsonSchema: true },
    config: { ...config, baseUrl: "https://api.together.xyz/v1" },
  }),
);
```

For a different wire format, implement `ChatClient` (or `AiProvider` directly).
Nothing outside `packages/ai` changes: prompt assembly, JSON-schema-constrained
output and the repair retry are shared.
