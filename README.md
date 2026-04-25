# my-investments

Investment portfolio tracker — track purchases, categories and custom labels

## AI Agents

This project uses AI agents to automate development workflows.

### Issue Refiner

When a new issue is created, the **Refiner** agent automatically analyzes it and adds:
- Acceptance criteria
- Implementation tasks
- Technical context

Once refined, the issue is labeled as `ready` for development.

### Developer

Run `nw dev` locally to start the **Developer** agent. It watches for issues labeled `ready`, then:
1. Creates a branch
2. Implements the issue using Gemini CLI
3. Opens a pull request

## Getting Started

1. Create an issue describing what you need
2. Wait for the Refiner to analyze it
3. Run `nw dev` to start the Developer agent

## Local database

The local development database (Postgres + auth) is provided by the Supabase CLI.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) running on your machine.

- `npm run db:start` — boots the local Postgres + auth server. The first run pulls Docker images and may take a few minutes; subsequent runs are fast. The CLI prints the local API URL, the Studio URL (default `http://127.0.0.1:54323`), and the database connection string.
- `npm run db:stop` — shuts the local stack down cleanly so it stops consuming resources.

---

*Powered by [new-wai](https://github.com/aarongutierrez08/new-wai)*
