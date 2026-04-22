import fs from "node:fs";
import path from "node:path";

const eventPath = process.env.GITHUB_EVENT_PATH || "";
const token = process.env.GITHUB_TOKEN || "";
const repository = process.env.GITHUB_REPOSITORY || "";
const mode = (process.env.SEMANTIC_PR_GUARD_MODE || "advisory").toLowerCase();
const reportPath =
  process.env.SEMANTIC_PR_GUARD_REPORT_PATH ||
  path.join("tmp", "ci", "semantic-pr-guard-report.json");

if (!eventPath || !fs.existsSync(eventPath)) {
  console.error("GITHUB_EVENT_PATH is required.");
  process.exit(1);
}

if (!token) {
  console.error("GITHUB_TOKEN is required.");
  process.exit(1);
}

if (!repository.includes("/")) {
  console.error("GITHUB_REPOSITORY must be set as owner/repo.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const pullRequest = payload.pull_request || {};
const prNumber = pullRequest.number;

if (!prNumber) {
  console.error("Semantic PR guard only supports pull request events.");
  process.exit(1);
}

const [owner, repo] = repository.split("/");
const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

function sectionContent(markdown, heading) {
  const lines = String(markdown || "").split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return "";
  }

  const chunk = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      break;
    }
    chunk.push(lines[index]);
  }

  return chunk.join("\n").trim();
}

function extractBullets(section) {
  return String(section || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function checkedItems(section) {
  return String(section || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^- \[[xX]\]/.test(line))
    .map((line) => line.replace(/^- \[[xX]\]\s*/, "").trim());
}

function hasLinkedIssue(text) {
  const value = String(text || "");
  return (
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+\b/i.test(value) ||
    /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+/i.test(value) ||
    /\b(?:linear|jira|ticket|issue)\b/i.test(value)
  );
}

function riskTagsForPath(filePath) {
  const tags = new Set();

  if (
    /^src\/auth\//.test(filePath) ||
    /^src\/services\/authentication\//.test(filePath) ||
    /^src\/resources\/config\//.test(filePath)
  ) {
    tags.add("auth");
    tags.add("security");
  }

  if (/^api\//.test(filePath) || /^server\.js$/.test(filePath) || /^cloud-run\//.test(filePath)) {
    tags.add("api");
    tags.add("runtime");
  }

  if (/^supabase\//.test(filePath)) {
    tags.add("schema");
    tags.add("deploy");
  }

  if (
    /^\.github\/workflows\//.test(filePath) ||
    /^scripts\/ci\//.test(filePath) ||
    /^Dockerfile$/.test(filePath) ||
    /^package(?:-lock)?\.json$/.test(filePath)
  ) {
    tags.add("ci");
    tags.add("deploy");
  }

  if (/^src\/pages\//.test(filePath) || /^src\/components\//.test(filePath)) {
    tags.add("ui");
  }

  return [...tags];
}

async function githubRequest(apiPath) {
  const response = await fetch(`${apiBase}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "hushh-semantic-pr-guard",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

async function paginate(apiPathFactory, maxPages = 10) {
  const results = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const pageData = await githubRequest(apiPathFactory(page));
    if (!Array.isArray(pageData) || pageData.length === 0) {
      break;
    }
    results.push(...pageData);
    if (pageData.length < 100) {
      break;
    }
  }
  return results;
}

function addFinding(findings, level, code, message) {
  findings.push({ level, code, message });
}

const files = await paginate((page) => `/pulls/${prNumber}/files?per_page=100&page=${page}`, 5);
const riskTags = new Set(files.flatMap((file) => riskTagsForPath(file.filename)));
const body = String(pullRequest.body || "");
const summarySection = sectionContent(body, "## Summary");
const validationSection = sectionContent(body, "## Validation");
const notesSection = sectionContent(body, "## Notes");
const notesBullets = extractBullets(notesSection);
const validationChecked = checkedItems(validationSection);
const findings = [];

const riskySurfaceTouched = [...riskTags].some((tag) =>
  ["auth", "security", "api", "runtime", "deploy", "schema", "ci"].includes(tag)
);
const deployDisclosure = notesBullets.some((item) =>
  /deployment|migration|env|rollback|none/i.test(item)
);
const reviewerCallout = notesBullets.some((item) => /@|codeowners|review/i.test(item));
const targetedProof = validationChecked.some((item) =>
  /smoke|route|security|audit|env:check|env check/i.test(item)
);
const securityNarrative = /auth|secret|token|session|consent|identity|security/i.test(
  `${summarySection}\n${notesSection}`
);

if (riskySurfaceTouched && !hasLinkedIssue(body)) {
  addFinding(
    findings,
    "warning",
    "traceability.missing_issue",
    "High-risk paths changed without a clear linked issue or ticket in the PR body."
  );
}

if ((riskTags.has("deploy") || riskTags.has("schema") || riskTags.has("runtime")) && !deployDisclosure) {
  addFinding(
    findings,
    "warning",
    "deploy.missing_disclosure",
    "Runtime, deploy, or schema-sensitive changes need an explicit deployment, env, migration, or rollback note."
  );
}

if ((riskTags.has("auth") || riskTags.has("security")) && !securityNarrative) {
  addFinding(
    findings,
    "warning",
    "security.missing_callout",
    "Auth or secret-sensitive changes need a short auth/security narrative in Summary or Notes."
  );
}

if ((riskTags.has("api") || riskTags.has("runtime") || riskTags.has("deploy")) && !targetedProof) {
  addFinding(
    findings,
    "warning",
    "validation.missing_targeted_proof",
    "Risky API/runtime/deploy changes should mark a targeted smoke, route, env, or security check as completed."
  );
}

if (riskySurfaceTouched && !reviewerCallout) {
  addFinding(
    findings,
    "notice",
    "routing.missing_reviewer_callout",
    "Risky PRs benefit from a reviewer or CODEOWNERS callout in Notes so triage is explicit."
  );
}

const report = {
  mode,
  pr: {
    number: prNumber,
    title: pullRequest.title || "",
  },
  filesChanged: files.length,
  riskTags: [...riskTags].sort(),
  findings,
  valid: mode !== "enforced" || !findings.some((finding) => finding.level === "warning"),
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

for (const finding of findings) {
  const annotation = finding.level === "warning" ? "warning" : "notice";
  console.log(`::${annotation} title=Semantic PR Guard (${finding.code})::${finding.message}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const summaryLines = [
    "# Semantic PR Guard",
    `- Mode: ${mode}`,
    `- Files changed: ${files.length}`,
    `- Risk tags: ${report.riskTags.length > 0 ? report.riskTags.join(", ") : "none"}`,
    "",
    "## Findings",
    ...(findings.length > 0
      ? findings.map((finding) => `- [${finding.level}] ${finding.message}`)
      : ["- No semantic guard findings on this PR."]),
  ];
  fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryLines.join("\n")}\n`);
}

if (mode === "enforced" && findings.some((finding) => finding.level === "warning")) {
  process.exit(1);
}
