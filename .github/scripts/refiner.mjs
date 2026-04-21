import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "fs";

const {
  ISSUE_NUMBER, ISSUE_TITLE, ISSUE_BODY, LABELS,
  GEMINI_API_KEY, GITHUB_TOKEN, REPO,
} = process.env;

const MAX_ITERATIONS = 10;

// ─── Refiner system prompt (embedded) ───────────────────────────────────────

const REFINER_PROMPT = `You are an expert software analyst. Your job is to refine a vague GitHub issue into a precise, actionable specification that an AI developer agent can implement without ambiguity.

## Critical rules

- Write entirely in **functional, non-technical language**. Do not mention: functions, methods, modules, classes, files, variables, return values, APIs, endpoints, imports, or any code construct.
- Describe **what the system should do and why**, never how it should be built.
- A non-technical product manager should be able to read and fully understand the output.
- Only ask for clarification when CRITICAL information is missing and cannot be reasonably inferred from the issue + project context. For simple, clear issues, refine directly.

## Issue quality standards

A good issue must be:
- **Clear**: unambiguous language, no idioms or assumptions
- **Scoped**: focused on a single concern, not a mix of features
- **Testable**: acceptance criteria must be verifiable by observable behavior
- **Self-contained**: all context needed to understand the requirement is in the issue

## Output sections (for finalize_refinement.refined_body)

Produce the following sections in Markdown:

### Improved title
Rewrite the title following the convention: \`<type>: <short imperative description>\`
Types: \`feat\`, \`fix\`, \`docs\`, \`chore\`, \`refactor\`, \`test\`.

### Problem statement
One or two sentences describing the problem or need from the user's perspective.
> As a [role], I need [goal] so that [benefit].

### Acceptance criteria
Testable conditions using Given-When-Then. Describe observable behavior only.
- **AC-001**: Given [context], When [action], Then [observable outcome]

### Examples & edge cases
Concrete scenarios in plain language.

### Constraints & context
Business rules, non-functional requirements, and any restrictions.

## Workflow

You have access to tools. Use them in this order:
1. Call \`search_issues\` to detect duplicates or related work.
2. Call \`list_files\` and \`read_file\` if you need codebase context to refine accurately.
3. If the issue is too vague, call \`ask_clarification\`.
4. If the issue is too large, call \`split_issue\`.
5. Otherwise, call \`finalize_refinement\` with the refined specification.

You MUST always end by calling one of: finalize_refinement, ask_clarification, or split_issue.
`;

// ─── GitHub API helpers ──────────────────────────────────────────────────────

async function githubFetch(path, options = {}) {
  const url = `https://api.github.com/repos/${REPO}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  return res.json().catch(() => null);
}

async function searchIssues(query) {
  const q = encodeURIComponent(`${query} repo:${REPO}`);
  const res = await fetch(
    `https://api.github.com/search/issues?q=${q}&per_page=10`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((i) => ({
    number: i.number,
    title: i.title,
    state: i.state,
    url: i.html_url,
  }));
}

async function readFile(path) {
  if (path.includes("..") || path.startsWith("/")) {
    return { error: "Invalid path: path traversal not allowed" };
  }
  const data = await githubFetch(`/contents/${path}`);
  if (!data || !data.content) return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function listFiles(directory) {
  if (directory.includes("..") || directory.startsWith("/")) {
    return { error: "Invalid path: path traversal not allowed" };
  }
  const data = await githubFetch(`/contents/${directory}`);
  if (!Array.isArray(data)) return [];
  return data.map((e) => ({ name: e.name, type: e.type }));
}

async function askClarification(questions) {
  const body =
    "## Clarification needed\n\n" +
    "Before refining this issue, I need some clarification:\n\n" +
    questions.map((q, i) => `${i + 1}. ${q}`).join("\n") +
    "\n\n*Answer these questions and remove the `needs-clarification` label to trigger a new refinement.*";
  await githubFetch(`/issues/${ISSUE_NUMBER}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  await githubFetch(`/issues/${ISSUE_NUMBER}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels: ["needs-clarification"] }),
  });
}

async function splitIssue(subIssues) {
  const created = [];
  for (const sub of subIssues) {
    const issue = await githubFetch("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: sub.title,
        body: sub.body + `\n\n_Split from #${ISSUE_NUMBER}_`,
      }),
    });
    created.push({ number: issue.number, title: issue.title });
  }
  await githubFetch(`/issues/${ISSUE_NUMBER}`, {
    method: "PATCH",
    body: JSON.stringify({
      body:
        (ISSUE_BODY || "") +
        "\n\n---\n\n_This issue was split into: " +
        created.map((i) => `#${i.number}`).join(", ") +
        "_",
      state: "closed",
    }),
  });
  return created;
}

async function finalizeRefinement(refinedBody, type, size, relatedIssues, duplicateOf) {
  if (duplicateOf) {
    await githubFetch(`/issues/${ISSUE_NUMBER}`, {
      method: "PATCH",
      body: JSON.stringify({
        body:
          (ISSUE_BODY || "") +
          `\n\n---\n\n_Duplicate of #${duplicateOf}_`,
        state: "closed",
      }),
    });
    await githubFetch(`/issues/${ISSUE_NUMBER}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels: ["duplicate"] }),
    });
    return;
  }

  const refs =
    relatedIssues && relatedIssues.length > 0
      ? "\n\n**Related:** " + relatedIssues.map((n) => `#${n}`).join(", ")
      : "";

  const updatedBody =
    (ISSUE_BODY || "") +
    "\n\n---\n\n## Issue Refinement\n\n" +
    refinedBody +
    refs +
    "\n\n---\n*Generated by Issue Refiner agent using Gemini*";

  await githubFetch(`/issues/${ISSUE_NUMBER}`, {
    method: "PATCH",
    body: JSON.stringify({ body: updatedBody }),
  });

  const labels = ["ready", type, `size/S`, `size/M`, `size/L`].filter(
    (l) => l === "ready" || l === type || l === `size/${size}`
  );
  await githubFetch(`/issues/${ISSUE_NUMBER}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels }),
  });
}

// ─── Tool declarations ───────────────────────────────────────────────────────

const toolDeclarations = [
  {
    name: "search_issues",
    description: "Search for existing issues to detect duplicates or related work before refining.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search terms to find similar issues" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_file",
    description: "Read a file from the repository to understand the existing codebase.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to repo root" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory to explore the project structure.",
    parameters: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Directory path relative to repo root" },
      },
      required: ["directory"],
    },
  },
  {
    name: "ask_clarification",
    description:
      "Post a comment asking the author for clarification when the issue is too vague to refine accurately. " +
      "Use this when critical information is missing and cannot be inferred from context.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: { type: "string" },
          description: "Specific questions for the issue author",
        },
      },
      required: ["questions"],
    },
  },
  {
    name: "split_issue",
    description:
      "Split an oversized issue into smaller focused sub-issues when the scope is too broad for a single implementation cycle.",
    parameters: {
      type: "object",
      properties: {
        sub_issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              body: { type: "string" },
            },
            required: ["title", "body"],
          },
        },
      },
      required: ["sub_issues"],
    },
  },
  {
    name: "finalize_refinement",
    description:
      "Update the issue with the refined specification and mark it as ready for development. " +
      "Call this when you have enough context to produce a complete, actionable specification.",
    parameters: {
      type: "object",
      properties: {
        refined_body: {
          type: "string",
          description: "The full refined issue content in Markdown",
        },
        type: {
          type: "string",
          enum: ["feat", "fix", "docs", "chore", "refactor", "test"],
          description: "Issue type label",
        },
        size: {
          type: "string",
          enum: ["S", "M", "L"],
          description: "Complexity: S=1-2 ACs, M=3-5 ACs, L=6+ ACs",
        },
        related_issues: {
          type: "array",
          items: { type: "number" },
          description: "Numbers of related (but not duplicate) issues",
        },
        duplicate_of: {
          type: "number",
          description: "Issue number this duplicates — closes this issue if set",
        },
      },
      required: ["refined_body", "type", "size"],
    },
  },
];

// ─── Tool dispatcher ─────────────────────────────────────────────────────────

const TERMINAL_TOOLS = new Set(["finalize_refinement", "ask_clarification", "split_issue"]);

async function dispatchTool(name, args) {
  switch (name) {
    case "search_issues":
      return searchIssues(args.query);
    case "read_file":
      return readFile(args.path);
    case "list_files":
      return listFiles(args.directory);
    case "ask_clarification":
      await askClarification(args.questions);
      return "Clarification requested. Stopping refinement until author responds.";
    case "split_issue":
      return splitIssue(args.sub_issues);
    case "finalize_refinement":
      await finalizeRefinement(
        args.refined_body,
        args.type,
        args.size,
        args.related_issues || [],
        args.duplicate_of
      );
      return "Issue refined and labeled as ready.";
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Rate limit handling ────────────────────────────────────────────────────

async function sendWithRetry(chat, content, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await chat.sendMessage(content);
    } catch (err) {
      if (err.status === 429 && attempt < maxRetries - 1) {
        const wait = Math.min(15 * Math.pow(2, attempt), 120);
        console.log(`Rate limited. Retrying in ${wait}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw err;
    }
  }
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

async function runAgent(chat) {
  let textRetries = 0;
  const MAX_TEXT_RETRIES = 3;
  let response = await sendWithRetry(chat, { message: "Begin." });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const calls = response.functionCalls;

    if (!calls || calls.length === 0) {
      textRetries++;
      console.log(`Agent responded with text (attempt ${textRetries}/${MAX_TEXT_RETRIES}): ${(response.text || "").slice(0, 200)}`);
      if (textRetries >= MAX_TEXT_RETRIES) {
        throw new Error(
          "Agent produced text responses without calling any tool " +
          `${MAX_TEXT_RETRIES} times in a row. Aborting.`
        );
      }
      response = await sendWithRetry(chat, { message: "You must call a tool. Use finalize_refinement, ask_clarification, or split_issue to finish." });
      continue;
    }

    textRetries = 0;
    let shouldStop = false;
    const results = [];

    for (const call of calls) {
      console.log(`Tool: ${call.name}`);
      const result = await dispatchTool(call.name, call.args);
      results.push({ id: call.id, name: call.name, response: { result: JSON.stringify(result) } });
      if (TERMINAL_TOOLS.has(call.name)) shouldStop = true;
    }

    if (shouldStop) return;
    response = await sendWithRetry(chat, { message: results.map((r) => ({ functionResponse: r })) });
  }

  throw new Error(`Max iterations (${MAX_ITERATIONS}) reached without a terminal tool call.`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  // Guard: already refined
  if (ISSUE_BODY && ISSUE_BODY.includes("## Issue Refinement")) {
    console.log("Issue already refined, skipping.");
    process.exit(0);
  }

  // Guard: awaiting clarification
  const currentLabels = (LABELS || "").split(",").map((l) => l.trim()).filter(Boolean);
  if (currentLabels.includes("needs-clarification")) {
    console.log("Issue awaiting clarification, skipping.");
    process.exit(0);
  }

  // Build prompt: embedded agent prompt + AGENTS.md project context + issue
  const projectContext = existsSync("AGENTS.md")
    ? "\n\n## Project context (from AGENTS.md)\n\n" + readFileSync("AGENTS.md", "utf-8")
    : "";

  const systemPrompt =
    REFINER_PROMPT +
    projectContext +
    `\n\n## Issue to refine\n\n**Title:** ${ISSUE_TITLE || ""}\n**Description:** ${ISSUE_BODY || "No description provided."}`;

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      tools: [{ functionDeclarations: toolDeclarations }],
      systemInstruction: systemPrompt,
    },
  });

  await runAgent(chat);
  console.log("Issue refined successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
