# DeepSearch

A research assistant built with Next.js that combines an LLM agent with web search and page scraping. Ask questions, get answers backed by live sources, and browse your conversation history — all in a streaming chat UI.

## Features

### Research agent

- **Agentic deep search** — Powered by Google Gemini 2.5 Flash via the [AI SDK v6](https://sdk.vercel.ai). The agent decides when to search the web, scrape pages, or answer from its own knowledge.
- **Web search** — Tavily integration returns titles, snippets, links, and published dates for up-to-date queries.
- **Web scraping** — Full-page content extraction with Cheerio and Turndown (HTML → markdown). Respects `robots.txt`, uses exponential backoff on failures, and caches results in Redis.
- **Date-aware prompts** — The system prompt injects the current date and time so “latest” or “recent” questions produce appropriately scoped search queries.
- **Source citations** — Answers cite sources as markdown links `[title](url)` rather than bare URLs.

### Chat experience

- **Streaming responses** — Real-time token streaming with visible tool calls (e.g. search in progress).
- **Markdown rendering** — Rich formatting for lists, code blocks, and clickable source links.
- **Chat persistence** — Conversations saved to PostgreSQL (Drizzle ORM). Message text and reasoning-step annotations are persisted so chats survive page refreshes.
- **New chat flow** — Stable chat IDs, URL updates after the first message, and clean state resets without interrupting active streams.
- **Auto-scroll** — Messages stick to the bottom while streaming; a scroll-to-bottom button appears when you scroll up.
- **Copy messages** — One-click copy on user and assistant messages.
- **Empty-state polish** — Animated particle background (empty chats only), rotating greetings keyed to time of day and chat ID, and a sign-in prompt for guests.

### Authentication & access control

- **OAuth sign-in** — GitHub and Discord via NextAuth v5, with sessions stored in PostgreSQL (Drizzle adapter).
- **Per-user daily rate limit** — Configurable request cap per user per day (`DAILY_REQUEST_LIMIT`, default 6). Admins bypass the limit.
- **Global LLM rate limit** — Redis-backed sliding-window limiter shared across all serverless instances. When the cap is hit, requests wait for the window to reset instead of failing immediately.

### Observability & quality

- **Langfuse tracing** — OpenTelemetry instrumentation via `@vercel/otel` and `langfuse-vercel`. Traces include session ID, user ID, and spans for DB operations.
- **Evalite evals** — Run the agent against fixed test cases with a local UI for side-by-side comparison. Includes a deterministic **Contains Links** scorer that checks outputs for markdown link syntax.

### Infrastructure

- **PostgreSQL** — Users, sessions, chats, messages, and request tracking.
- **Redis** — Global rate limiting and crawl-result caching (6-hour TTL).
- **Type-safe environment** — Validated env vars with `@t3-oss/env-nextjs` and Zod.

## Tech stack

| Layer | Tools |
| --- | --- |
| Framework | Next.js 16, React 19 |
| AI | AI SDK v6, Google Gemini, Tavily |
| Auth | NextAuth v5, Drizzle adapter |
| Database | PostgreSQL, Drizzle ORM |
| Cache / limits | Redis (ioredis) |
| Observability | Langfuse, OpenTelemetry |
| Evals | Evalite, Vitest |
| UI | shadcn/ui, Tailwind CSS v4, Lucide icons |
| Package manager | [Bun](https://bun.sh) |

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL database
- Redis instance
- API keys: Google Generative AI, Tavily, OAuth providers (GitHub, Discord)

### Install and run

```bash
bun install
bun run db:push   # apply schema to your database
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=

# Auth
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=

# AI & search
GOOGLE_GENERATIVE_AI_API_KEY=
TAVILY_API_KEY=

# Redis
REDIS_URL=

# Rate limiting (optional)
DAILY_REQUEST_LIMIT=6

# Langfuse (optional in development, required in production)
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | TypeScript check |
| `bun run check` | Lint + typecheck |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run evals` | Run Evalite evals in watch mode (UI at http://localhost:3006) |

## Project structure

```
app/                  # Next.js App Router (pages, API routes)
components/           # UI components (chat, sidebar, shadcn)
server/
  deep-search.ts      # Agent logic, tools, prompts
  search/             # Tavily search & web scraping
  redis/              # Redis client, caching, global rate limit
  auth/               # NextAuth configuration
  db/                 # Drizzle schema and client
evals/                # Evalite evaluation suites
```
