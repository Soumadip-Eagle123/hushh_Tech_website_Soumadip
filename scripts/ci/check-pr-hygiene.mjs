import fs from "node:fs";
import path from "node:path";

const allowNonPr = process.argv.includes("--allow-non-pr");
const eventName = process.env.GITHUB_EVENT_NAME || "";
const eventPath = process.env.GITHUB_EVENT_PATH || "";
const reportPath =
  process.env.PR_HYGIENE_REPORT_PATH || path.join("tmp", "ci", "pr-hygiene-report.json");

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

if (!["pull_request", "pull_request_target"].includes(eventName)) {
  if (allowNonPr) {
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          skipped: true,
          reason: `event ${eventName || "unknown"} does not provide pull request metadata`
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.error("PR hygiene check only supports pull_request or pull_request_target events.");
  process.exit(1);
}

if (!eventPath || !fs.existsSync(eventPath)) {
  console.error("GITHUB_EVENT_PATH is required for PR hygiene validation.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const pullRequest = payload.pull_request || {};
const title = String(pullRequest.title || "").trim();
const body = String(pullRequest.body || "");

const errors = [];
const warnings = [];
const conventionalTitlePattern =
  /^(?:\[(?:codex|hotfix|release|security|docs|infra)\]\s+.+|(?:feat|fix|chore|docs|refactor|test|build|ci|perf|security)(?:\([^)]+\))?:\s+.+)$/i;
const bannedTitles = [/^wip$/i, /^draft$/i, /^update$/i, /^fix$/i, /^changes$/i, /^misc$/i];
const allowedRiskAreas = new Set(["ui", "api", "auth", "deploy", "security", "docs", "data", "infra", "ci"]);

function getSectionContent(markdown, heading) {
  const lines = markdown.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) {
    return "";
  }

  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      break;
    }
    sectionLines.push(lines[index]);
  }

  return sectionLines.join("\n").trim();
}

function getMeaningfulBullets(section, ignoredPhrases) {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .filter((line) => !/^- \[[ xX]\]/.test(line))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^[^:]+:\s*$/.test(line))
    .filter((line) => !ignoredPhrases.includes(line.toLowerCase()));
}

function getKeyedBullets(section) {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .filter((line) => !/^- \[[ xX]\]/.test(line))
    .reduce((accumulator, line) => {
      const match = line.match(/^- ([^:]+):\s*(.*)$/);
      if (!match) {
        return accumulator;
      }

      accumulator[match[1].trim().toLowerCase()] = match[2].trim();
      return accumulator;
    }, {});
}

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized.length === 0 ||
    ["tbd", "todo", "n/a", "na", "none", "-", "same as title", "same as above"].includes(normalized)
  );
}

function hasConcreteText(value, minimumLength = 10) {
  return String(value || "").trim().length >= minimumLength && !isPlaceholderValue(value);
}

function hasTraceabilityReference(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  return (
    /#\d+/.test(normalized) ||
    /\b[A-Z]{2,}-\d+\b/.test(normalized) ||
    /https?:\/\/\S+/.test(normalized)
  );
}

function hasExplicitNoIssueReason(value) {
  return /\b(?:none|n\/a|not applicable)\b/i.test(String(value || "")) && String(value || "").trim().length >= 12;
}

function parseRiskAreas(value) {
  return String(value || "")
    .split(/[|,/]/)
    .map((entry) => entry.replace(/`/g, "").trim().toLowerCase())
    .filter(Boolean);
}

if (title.length < 15) {
  errors.push("Pull request title must be descriptive and at least 15 characters long.");
}

if (bannedTitles.some((pattern) => pattern.test(title))) {
  errors.push("Pull request title is too vague. Use a specific, reviewer-friendly title.");
}

if (!conventionalTitlePattern.test(title)) {
  errors.push(
    'Pull request title must follow a professional format such as "fix(auth): handle refresh" or "[codex] govern CI/CD".'
  );
}

for (const heading of ["## Summary", "## Validation", "## Notes"]) {
  if (!new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "im").test(body)) {
    errors.push(`Pull request body must include the heading "${heading}".`);
  }
}

const summarySection = getSectionContent(body, "## Summary");
const validationSection = getSectionContent(body, "## Validation");
const notesSection = getSectionContent(body, "## Notes");

const summaryBullets = getMeaningfulBullets(summarySection, [
  "what changed",
  "why it changed",
  "linked issue: `#123` | `none - reason`",
  "acceptance criteria covered",
  "risk area touched: `ui` | `api` | `auth` | `deploy` | `security` | `docs` | `data` | `infra` | `ci`",
  "reviewer focus",
]);
const notesBullets = getMeaningfulBullets(notesSection, [
  "deployment impact",
  "migration or env requirements",
  "rollback or release notes",
  "follow-up work if any",
  "reviewer callouts or codeowners you expect to review this",
]);
const summaryFields = getKeyedBullets(summarySection);
const validationFields = getKeyedBullets(validationSection);
const validationChecklistItems = validationSection
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^- \[[ xX]\]/.test(line));

if (summaryBullets.length < 2) {
  errors.push("Summary section must include at least two meaningful bullet points.");
}

if (notesBullets.length < 1) {
  errors.push("Notes section must include at least one meaningful bullet point.");
}

if (validationChecklistItems.length < 3) {
  errors.push("Validation section must include at least three checklist items.");
}

if (!validationChecklistItems.some((line) => /^- \[[xX]\]/.test(line))) {
  errors.push("Validation section must mark at least one checklist item as completed.");
}

for (const [label, minimumLength] of [
  ["what changed", 10],
  ["why it changed", 10],
  ["linked issue", 4],
  ["acceptance criteria covered", 10],
  ["risk area touched", 2],
]) {
  if (!hasConcreteText(summaryFields[label], minimumLength)) {
    errors.push(`Summary section must fill "${label}" with reviewer-usable detail.`);
  }
}

if (!hasTraceabilityReference(summaryFields["linked issue"])) {
  if (hasExplicitNoIssueReason(summaryFields["linked issue"])) {
    warnings.push(
      'Linked issue is explicitly marked as not applicable. That is allowed, but issue traceability is preferred when the change maps to an open task.'
    );
  } else {
    errors.push(
      'Summary "linked issue" should reference an issue, ticket, or URL, or explicitly say why no linked issue exists.'
    );
  }
}

const riskAreas = parseRiskAreas(summaryFields["risk area touched"]);
if (riskAreas.length === 0 || riskAreas.some((entry) => !allowedRiskAreas.has(entry))) {
  errors.push(
    'Summary "risk area touched" must use one or more supported values: ui, api, auth, deploy, security, docs, data, infra, ci.'
  );
}

if (!hasConcreteText(summaryFields["reviewer focus"], 10)) {
  warnings.push('Summary "reviewer focus" is blank or vague. Add the first thing a reviewer should verify.');
}

for (const [label, minimumLength] of [
  ["ran", 8],
  ["reviewer should verify", 8],
]) {
  if (!hasConcreteText(validationFields[label], minimumLength)) {
    errors.push(`Validation section must fill "${label}" with concrete reviewer guidance.`);
  }
}

if (!hasConcreteText(validationFields["did not run"], 4)) {
  warnings.push('Validation "did not run" is missing. Say "none" if everything relevant was covered.');
}

if (
  hasConcreteText(validationFields["ran"], 8) &&
  !/test|tsc|type|build|lint|env|smoke|security|audit/i.test(validationFields["ran"])
) {
  warnings.push(
    'Validation "ran" does not mention the concrete checks you executed. Include command names or specific proof.'
  );
}

const report = {
  title,
  warnings,
  errors,
  valid: errors.length === 0
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
