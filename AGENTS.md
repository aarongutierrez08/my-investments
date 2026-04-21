# my-investments

This file is the canonical source of project context for AI agents (refiner, developer, reviewer). It is also understood by Claude Code, Cursor, Codex, and other AI coding tools that follow the AGENTS.md convention.

## What this project does

Investment portfolio tracker — track purchases, categories and custom labels

## Tech stack

- **Language:** TypeScript
- **Framework:** Next.js
- **Test runner:** Vitest

## Commands

- `npm test` — run tests
- `npm run build` — build the project (if applicable)

## Development workflow

This project follows **TDD** (Test-Driven Development). For every change:

1. Write a failing test that captures the expected behavior.
2. Run the test and confirm it fails for the right reason.
3. Implement the minimum code needed to make the test pass.
4. Refactor if needed, keeping tests green.

The developer agent MUST follow this flow. Do not call `submit_pr` until the new tests existed and failed before the implementation.


## Users

<!-- Who uses this system? Describe each type of user and their goals. -->
<!-- Example: **Customer**: places orders and tracks their status. -->
<!-- Example: **Administrator**: manages the catalog and monitors activity. -->

## Domain concepts

<!-- List and define the key concepts of this domain. -->
<!-- Example: **Order**: a request made by a user for one or more items. -->
<!-- Example: **Status**: the current state of an order (pending, confirmed, delivered). -->

## Business rules

<!-- List the non-negotiable rules that govern the system's behavior. -->
<!-- Example: An order cannot be modified once it has been confirmed. -->

## Code conventions

<!-- Optional: add project-specific conventions here. -->
<!-- Example: - Prefer function components over classes -->
<!-- Example: - Tests live next to the file they test -->

## Agent overrides

<!-- Optional: instructions that override the default agent behavior for this project. -->

<!-- ### Developer -->
<!-- - Never use class components -->
<!-- - Prefer async/await over promise chains -->

<!-- ### Refiner -->
<!-- - Always split issues with more than 5 acceptance criteria -->
