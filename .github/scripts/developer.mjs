import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { dirname } from "path";

const {
  ISSUE_NUMBER, ISSUE_TITLE, ISSUE_BODY, LABELS,
  GEMINI_API_KEY, GITHUB_TOKEN, REPO,
} = process.env;

const MAX_ITERATIONS = 25;
const ISSUE_TYPES = new Set(["feat", "fix", "docs", "chore", "refactor", "test"]);

function getIssueType() {
  const labels = (LABELS || "").split(",").map((l) => l.trim()).filter(Boolean);
  const type = labels.find((l) => ISSUE_TYPES.has(l));
  return type || "feat";
}

function slugify(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

const ALLOWED_COMMANDS = new Set([
  "npm", "npx", "node", "tsc", "cat", "ls", "pwd", "echo",
]);

// ─── Developer system prompt (embedded) ─────────────────────────────────────

const DEVELOPER_PROMPT = `You are a senior developer agent. Your job is to implement a GitHub issue in a repository, write tests for your implementation, and submit a pull request.

## Rules

- Read the codebase to understand structure and conventions before writing code.
- Follow existing code style. Do not introduce new libraries unless necessary.
- Write tests alongside the implementation.
- Do NOT commit manually — the \`submit_pr\` tool handles git operations.

## Workflow

You have access to tools. Follow this workflow:
1. Use \`list_files\` and \`read_file\` to understand the project structure and relevant code.
2. Use \`search_code\` to find related code, patterns, and conventions.
3. Use \`write_file\` and \`edit_file\` to implement the feature/fix.
4. Use \`run_command\` with \`npm test\` to verify your implementation passes all tests.
5. If tests fail, read the errors, fix the code, and re-run tests.
6. When all tests pass, call \`submit_pr\` to create the pull request.
7. If you cannot complete the task, call \`ask_help\` explaining why.

You MUST always end by calling one of: submit_pr or ask_help.
Do NOT call submit_pr until tests pass.
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeTitle(title) {
  return (title || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function validatePath(p) {
  if (p.includes("..") || p.startsWith("/")) {
    throw new Error("Invalid path: path traversal not allowed");
  }
}

// ─── Tool implementations ───────────────────────────────────────────────────

function toolListFiles(directory) {
  validatePath(directory);
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    type: e.isDirectory() ? "directory" : "file",
  }));
}

function toolReadFile(path) {
  validatePath(path);
  if (!existsSync(path)) return { error: `File not found: ${path}` };
  return readFileSync(path, "utf-8");
}

function toolSearchCode(pattern, directory) {
  const dir = directory || ".";
  validatePath(dir);
  try {
    const result = execFileSync(
      "grep", ["-r", "-n", "--include=*.ts", "--include=*.js", "--include=*.json",
               "--include=*.tsx", "--include=*.jsx", "--include=*.md",
               "-l", pattern, dir],
      { encoding: "utf-8", timeout: 10000 }
    );
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function toolWriteFile(path, content) {
  validatePath(path);
  const dir = dirname(path);
  if (dir && dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, "utf-8");
  return `File written: ${path}`;
}

function toolEditFile(path, oldStr, newStr) {
  validatePath(path);
  if (!existsSync(path)) return { error: `File not found: ${path}` };
  const content = readFileSync(path, "utf-8");
  if (!content.includes(oldStr)) {
    return { error: "old_string not found in file" };
  }
  writeFileSync(path, content.replace(oldStr, newStr), "utf-8");
  return `File edited: ${path}`;
}

function toolRunCommand(command, args) {
  if (!ALLOWED_COMMANDS.has(command)) {
    return { error: `Command not allowed: ${command}. Allowed: ${[...ALLOWED_COMMANDS].join(", ")}` };
  }
  try {
    const output = execFileSync(command, args || [], {
      encoding: "utf-8",
      timeout: 120000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, output };
  } catch (err) {
    return { exitCode: err.status || 1, output: (err.stdout || "") + (err.stderr || "") };
  }
}

async function toolSubmitPr(commitMessage) {
  const cleanTitle = normalizeTitle(ISSUE_TITLE);
  const issueType = getIssueType();
  const branchName = `${issueType}/${ISSUE_NUMBER}-${slugify(cleanTitle)}`;

  // Run lint and format if available
  try { execFileSync("npm", ["run", "lint", "--if-present"], { encoding: "utf-8" }); } catch { /* lint not configured */ }
  try { execFileSync("npm", ["run", "format", "--if-present"], { encoding: "utf-8" }); } catch { /* format not configured */ }

  // Stage all changes
  execFileSync("git", ["add", "-A"]);

  // Unstage forbidden files (build artifacts, secrets, etc.)
  const FORBIDDEN_PATTERNS = [
    "node_modules/", "dist/", "build/", ".next/", ".nuxt/", ".svelte-kit/",
    "out/", "coverage/", ".cache/", ".turbo/", ".vercel/",
    ".env", ".env.local", ".env.production",
    "package-lock.json", ".DS_Store",
  ];
  const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf-8" }).trim();
  const forbidden = stagedFiles.split("\n").filter((f) => FORBIDDEN_PATTERNS.some((p) => f.startsWith(p) || f === p));
  for (const f of forbidden) {
    try { execFileSync("git", ["reset", "HEAD", f], { encoding: "utf-8" }); } catch { /* ignore */ }
  }
  if (forbidden.length > 0) {
    console.log(`Unstaged forbidden files: ${forbidden.join(", ")}`);
  }

  const diff = execFileSync("git", ["diff", "--cached", "--stat"], { encoding: "utf-8" });
  if (!diff.trim()) {
    return { error: "No changes detected. Nothing to commit." };
  }

  // Check file count limit
  const fileCount = diff.trim().split("\n").length - 1; // last line is summary
  if (fileCount > 15) {
    return { error: `Too many files changed (${fileCount}). This likely indicates a problem. Aborting.` };
  }

  // Commit and push
  execFileSync("git", ["commit", "-m", commitMessage || `${issueType}: implement issue #${ISSUE_NUMBER}`]);
  execFileSync("git", ["push", "-u", "origin", branchName]);

  // Create PR with summary of changes
  const diffStat = diff.trim();
  const prBody = [
    `Closes #${ISSUE_NUMBER}`,
    "",
    `## ${cleanTitle}`,
    "",
    "### Changes",
    "```",
    diffStat,
    "```",
    "",
    "---",
    "*Implemented by Developer Agent.*",
  ].join("\n");

  execFileSync(
    "gh",
    ["pr", "create",
     "--repo", REPO,
     "--head", branchName,
     "--title", `${issueType}: ${cleanTitle}`,
     "--body", prBody],
    { encoding: "utf-8" }
  );

  // Update label: in-progress → in-review
  execFileSync(
    "gh",
    ["issue", "edit", ISSUE_NUMBER, "--repo", REPO,
     "--remove-label", "in-progress", "--add-label", "in-review"],
    { encoding: "utf-8" }
  );

  return `PR created for issue #${ISSUE_NUMBER}`;
}

async function toolAskHelp(reason) {
  await fetch(`https://api.github.com/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      body: "## Developer Agent needs help\n\n" + reason +
        "\n\n*The developer agent could not complete this issue automatically. Please review and implement manually.*",
    }),
  });
  process.exit(1);
}

// ─── Tool declarations ──────────────────────────────────────────────────────

const toolDeclarations = [
  {
    name: "list_files",
    description: "List files and directories in a given directory to explore the project structure.",
    parameters: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Directory path relative to repo root" },
      },
      required: ["directory"],
    },
  },
  {
    name: "read_file",
    description: "Read the full content of a file to understand existing code.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to repo root" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_code",
    description: "Search for a pattern across the codebase using grep. Returns matching file paths.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Search pattern (string or regex)" },
        directory: { type: "string", description: "Directory to search in (default: root)" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "write_file",
    description: "Create a new file or overwrite an existing file with the given content. Parent directories are created automatically.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to repo root" },
        content: { type: "string", description: "Full file content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Edit a file by replacing an exact string match with new content. Use this for targeted changes instead of rewriting the entire file.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to repo root" },
        old_string: { type: "string", description: "Exact string to find and replace" },
        new_string: { type: "string", description: "Replacement string" },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "run_command",
    description: "Run a shell command. Only allowed commands: npm, npx, node, tsc, cat, ls, pwd, echo. Use this to run tests, build, or inspect output.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run (e.g. npm)" },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Command arguments (e.g. [\"test\", \"--\", \"--run\"])",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "submit_pr",
    description:
      "Stage all changes, commit, push, and create a pull request. This is a TERMINAL tool — call it only when the implementation is complete and tests pass.",
    parameters: {
      type: "object",
      properties: {
        commit_message: {
          type: "string",
          description: "Commit message (default: feat: implement issue #N)",
        },
      },
    },
  },
  {
    name: "ask_help",
    description:
      "Post a comment on the issue asking for human help. This is a TERMINAL tool — call it when you cannot complete the implementation and need human assistance.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Explanation of why help is needed" },
      },
      required: ["reason"],
    },
  },
];

// ─── Tool dispatcher ────────────────────────────────────────────────────────

const TERMINAL_TOOLS = new Set(["submit_pr", "ask_help"]);

async function dispatchTool(name, args) {
  switch (name) {
    case "list_files":
      return toolListFiles(args.directory);
    case "read_file":
      return toolReadFile(args.path);
    case "search_code":
      return toolSearchCode(args.pattern, args.directory);
    case "write_file":
      return toolWriteFile(args.path, args.content);
    case "edit_file":
      return toolEditFile(args.path, args.old_string, args.new_string);
    case "run_command":
      return toolRunCommand(args.command, args.args);
    case "submit_pr":
      return toolSubmitPr(args.commit_message);
    case "ask_help":
      await toolAskHelp(args.reason);
      return "Help requested.";
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

// ─── Agentic loop ───────────────────────────────────────────────────────────

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
      response = await sendWithRetry(chat, { message: "You must call a tool. Use submit_pr when done or ask_help if stuck." });
      continue;
    }

    textRetries = 0;
    let shouldStop = false;
    const results = [];

    for (const call of calls) {
      console.log(`Tool: ${call.name}`);
      try {
        const result = await dispatchTool(call.name, call.args);
        results.push({ id: call.id, name: call.name, response: { result: JSON.stringify(result) } });
      } catch (err) {
        results.push({ id: call.id, name: call.name, response: { result: JSON.stringify({ error: err.message }) } });
      }
      if (TERMINAL_TOOLS.has(call.name)) shouldStop = true;
    }

    if (shouldStop) return;
    response = await sendWithRetry(chat, { message: results.map((r) => ({ functionResponse: r })) });
  }

  throw new Error(`Max iterations (${MAX_ITERATIONS}) reached without a terminal tool call.`);
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main() {
  const cleanTitle = normalizeTitle(ISSUE_TITLE);
  const issueType = getIssueType();
  const branchName = `${issueType}/${ISSUE_NUMBER}-${slugify(cleanTitle)}`;

  // Update label: ready → in-progress
  execFileSync(
    "gh",
    ["issue", "edit", ISSUE_NUMBER, "--repo", REPO,
     "--remove-label", "ready", "--add-label", "in-progress"],
    { encoding: "utf-8" }
  );

  // Create or reuse branch
  try {
    execFileSync("git", ["checkout", "-b", branchName]);
  } catch {
    execFileSync("git", ["checkout", branchName]);
  }

  // Build prompt: embedded agent prompt + AGENTS.md + issue details
  const projectContext = existsSync("AGENTS.md")
    ? "\n\n## Project context (from AGENTS.md)\n\n" + readFileSync("AGENTS.md", "utf-8")
    : "";

  const prompt =
    DEVELOPER_PROMPT +
    projectContext +
    `\n\n## Issue to implement\n\n**Issue #${ISSUE_NUMBER}:** ${cleanTitle}\n\n${ISSUE_BODY || "No description provided."}`;

  console.log("\nStarting Developer Agent...\n");

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const chat = ai.chats.create({
    model: "gemini-2.5-flash-lite",
    config: {
      tools: [{ functionDeclarations: toolDeclarations }],
      systemInstruction: prompt,
    },
  });

  await runAgent(chat);
  console.log(`Developer agent completed for issue #${ISSUE_NUMBER}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
