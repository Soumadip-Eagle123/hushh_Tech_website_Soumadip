#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_AUTHOR_LOGINS = [
  "github-actions[bot]",
  "qodo-code-review[bot]",
  "qodo-merge-pro[bot]",
  "CodiumAI-Agent",
];
const DEFAULT_VISIBLE_OUTPUT_PATTERNS = [
  /##\s+PR Reviewer Guide\b/i,
  /##\s+PR Code Suggestions\b/i,
  /Here are some key observations to aid the review process\b/i,
  /Suggestion importance\[1-10\]:/i,
  /No major issues detected/i,
  /\[(?:possible issue|security|performance|general|learned best practice|bug|refactor|style|testing)[^\]\n]*\]/i,
];
const DEFAULT_FAILURE_PATTERNS = [
  /^Failed to generate code suggestions for PR\b/im,
  /Failed to generate prediction with any model/i,
];
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 25;
const DEFAULT_INITIAL_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const DEFAULT_MIN_BODY_LENGTH = 20;
const DEFAULT_SINCE_SAFETY_BUFFER_MS = 1_000;

function readArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  console.log(`Usage: node scripts/ci/verify-pr-agent-output.mjs [options]

Options:
  --repo=OWNER/REPO           Override GITHUB_REPOSITORY
  --pr-number=NUMBER          Override PR number resolution
  --since=ISO_TIMESTAMP       Override PR_AGENT_STARTED_AT
  --event-path=PATH           Override GITHUB_EVENT_PATH
  --token=TOKEN               Override GITHUB_TOKEN
  --api-base-url=URL          Override GITHUB_API_URL
  --report-path=PATH          Write a JSON report for debugging
  --help                      Show this message

Environment:
  GITHUB_TOKEN                Required GitHub API token
  GITHUB_REPOSITORY           Required repository in owner/repo format
  GITHUB_EVENT_PATH           Required unless --pr-number is provided
  PR_AGENT_STARTED_AT         Required ISO-8601 timestamp for the current run
  PR_AGENT_AUTHOR_LOGINS      Optional comma-separated bot logins
  PR_AGENT_MIN_BODY_LENGTH    Optional minimum non-empty body length (default: ${DEFAULT_MIN_BODY_LENGTH})
`);
}

function parseCsv(value, fallback = []) {
  if (!value) {
    return [...fallback];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readNumber(name, fallback) {
  const raw = readArg(name) ?? process.env[name.toUpperCase().replace(/-/g, "_")];
  if (raw == null || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsed;
}

function toIsoTimestamp(value, label) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} must be a valid ISO-8601 timestamp.`);
  }

  return new Date(timestamp).toISOString();
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBody(body) {
  return String(body ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .trim();
}

function truncate(value, maxLength = 240) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function formatPreview(body) {
  return truncate(normalizeBody(body).replace(/\s+/g, " "), 160);
}

function parseNextLink(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  for (const segment of linkHeader.split(",")) {
    const match = segment.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match && match[2] === "next") {
      return match[1];
    }
  }

  return null;
}

function latestTimestamp(item, fields) {
  const timestamps = fields
    .map((field) => Date.parse(item?.[field] ?? ""))
    .filter((value) => Number.isFinite(value));

  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function touchedSince(item, startedAtMs, fields) {
  const timestamp = latestTimestamp(item, fields);
  return timestamp != null && timestamp >= startedAtMs;
}

function bodyLooksMeaningful(body, minLength) {
  const normalized = normalizeBody(body);
  if (normalized.length < minLength) {
    return false;
  }

  return !/^<!--[\s\S]*-->$/.test(normalized);
}

function buildRegexSet(patterns) {
  return patterns.map((pattern) => (pattern instanceof RegExp ? pattern : new RegExp(pattern, "i")));
}

function bodyMatchesAny(body, patterns) {
  const normalized = normalizeBody(body);
  return patterns.some((pattern) => pattern.test(normalized));
}

function isRetryableNetworkError(error) {
  if (!error) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND" ||
    error.code === "EAI_AGAIN" ||
    error.code === "ETIMEDOUT" ||
    error.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error.code === "UND_ERR_HEADERS_TIMEOUT" ||
    error.code === "UND_ERR_BODY_TIMEOUT"
  );
}

function isRetryableResponse(response, bodyText) {
  if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
    return true;
  }

  if (response.status !== 403) {
    return false;
  }

  const retryAfter = response.headers.get("retry-after");
  const remaining = response.headers.get("x-ratelimit-remaining");
  return Boolean(retryAfter) || remaining === "0" || /secondary rate limit|rate limit/i.test(bodyText);
}

function getRetryDelayMs(response, attempt, initialBackoffMs, maxBackoffMs) {
  const retryAfterSeconds = Number(response?.headers.get("retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1_000, maxBackoffMs);
  }

  const rateLimitResetSeconds = Number(response?.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(rateLimitResetSeconds) && rateLimitResetSeconds > 0) {
    const untilReset = rateLimitResetSeconds * 1_000 - Date.now();
    if (untilReset > 0) {
      return Math.min(untilReset + 1_000, maxBackoffMs);
    }
  }

  const exponential = initialBackoffMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(exponential + jitter, maxBackoffMs);
}

function annotateArtifact(kind, item, extra = {}) {
  return {
    kind,
    id: item.id ?? null,
    author: item.user?.login ?? null,
    url: item.html_url ?? null,
    bodyPreview: formatPreview(item.body),
    createdAt: item.created_at ?? null,
    updatedAt: item.updated_at ?? null,
    submittedAt: item.submitted_at ?? null,
    ...extra,
  };
}

function createLogger() {
  return {
    info(message) {
      console.log(message);
    },
    warn(message) {
      console.warn(message);
    },
    error(message) {
      console.error(`::error::${message}`);
    },
  };
}

async function main() {
  if (hasFlag("help")) {
    printHelp();
    return;
  }

  const logger = createLogger();
  const token = readArg("token") ?? process.env.GITHUB_TOKEN ?? "";
  const repository = readArg("repo") ?? process.env.GITHUB_REPOSITORY ?? "";
  const eventPath = readArg("event-path") ?? process.env.GITHUB_EVENT_PATH ?? "";
  const prNumberArg = readArg("pr-number") ?? process.env.PR_NUMBER ?? "";
  const startedAtRaw = readArg("since") ?? process.env.PR_AGENT_STARTED_AT ?? "";
  const apiBaseUrl = trimTrailingSlash(
    readArg("api-base-url") ?? process.env.GITHUB_API_URL ?? "https://api.github.com"
  );
  const reportPath =
    readArg("report-path") ??
    process.env.PR_AGENT_REPORT_PATH ??
    (process.env.RUNNER_TEMP
      ? path.join(process.env.RUNNER_TEMP, "pr-agent-verification-report.json")
      : "");

  const authorLogins = new Set(
    parseCsv(process.env.PR_AGENT_AUTHOR_LOGINS, DEFAULT_AUTHOR_LOGINS).map((login) =>
      login.toLowerCase()
    )
  );
  const minBodyLength = readNumber("pr-agent-min-body-length", DEFAULT_MIN_BODY_LENGTH);
  const requestTimeoutMs = readNumber("pr-agent-request-timeout-ms", DEFAULT_REQUEST_TIMEOUT_MS);
  const maxAttempts = readNumber("pr-agent-max-attempts", DEFAULT_MAX_ATTEMPTS);
  const perPage = readNumber("pr-agent-per-page", DEFAULT_PER_PAGE);
  const maxPages = readNumber("pr-agent-max-pages", DEFAULT_MAX_PAGES);
  const initialBackoffMs = readNumber(
    "pr-agent-initial-backoff-ms",
    DEFAULT_INITIAL_BACKOFF_MS
  );
  const maxBackoffMs = readNumber("pr-agent-max-backoff-ms", DEFAULT_MAX_BACKOFF_MS);
  const visibleOutputPatterns = buildRegexSet(DEFAULT_VISIBLE_OUTPUT_PATTERNS);
  const failurePatterns = buildRegexSet(DEFAULT_FAILURE_PATTERNS);

  if (!token) {
    throw new Error("GITHUB_TOKEN is required for PR agent verification.");
  }

  if (!repository || !repository.includes("/")) {
    throw new Error("GITHUB_REPOSITORY must be provided in owner/repo format.");
  }

  if (!startedAtRaw) {
    throw new Error("PR_AGENT_STARTED_AT is required for run-scoped verification.");
  }

  const startedAt = toIsoTimestamp(startedAtRaw, "PR_AGENT_STARTED_AT");
  const startedAtMs = Date.parse(startedAt);
  const apiSince = new Date(
    Math.max(0, startedAtMs - DEFAULT_SINCE_SAFETY_BUFFER_MS)
  ).toISOString();

  let prNumber = Number(prNumberArg);
  if (!Number.isFinite(prNumber) || prNumber <= 0) {
    if (!eventPath || !fs.existsSync(eventPath)) {
      throw new Error("GITHUB_EVENT_PATH is required when PR_NUMBER is not provided.");
    }

    const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    prNumber = Number(payload.pull_request?.number ?? payload.issue?.number);
  }

  if (!Number.isFinite(prNumber) || prNumber <= 0) {
    throw new Error("Unable to resolve pull request number from the event payload.");
  }

  const [owner, repo] = repository.split("/");
  const requestHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "hushh-pr-agent-verifier",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  async function requestJson(url) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetch(url, {
          headers: requestHeaders,
          signal: controller.signal,
        });
        const bodyText = await response.text();

        if (!response.ok) {
          if (attempt < maxAttempts && isRetryableResponse(response, bodyText)) {
            const delayMs = getRetryDelayMs(
              response,
              attempt,
              initialBackoffMs,
              maxBackoffMs
            );
            logger.warn(
              `Retrying GitHub API request (${attempt}/${maxAttempts}) after ${response.status} for ${url}`
            );
            await sleep(delayMs);
            continue;
          }

          throw new Error(
            `GitHub API request failed for ${url}: ${response.status} ${response.statusText} ${truncate(
              bodyText,
              400
            )}`
          );
        }

        const json = bodyText ? JSON.parse(bodyText) : null;
        return { json, nextUrl: parseNextLink(response.headers.get("link")) };
      } catch (error) {
        if (attempt < maxAttempts && isRetryableNetworkError(error)) {
          const delayMs = Math.min(initialBackoffMs * 2 ** (attempt - 1), maxBackoffMs);
          logger.warn(
            `Retrying GitHub API request (${attempt}/${maxAttempts}) after network error for ${url}: ${error.message}`
          );
          await sleep(delayMs);
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(`GitHub API request exhausted all retries for ${url}`);
  }

  async function fetchPaginated(resourcePath) {
    const separator = resourcePath.includes("?") ? "&" : "?";
    let url = `${apiBaseUrl}${resourcePath}${separator}per_page=${perPage}`;
    const items = [];
    let page = 0;

    while (url) {
      page += 1;
      if (page > maxPages) {
        throw new Error(`Exceeded pagination limit (${maxPages}) while reading ${resourcePath}`);
      }

      const { json, nextUrl } = await requestJson(url);
      if (!Array.isArray(json)) {
        throw new Error(`Expected array response from GitHub API for ${resourcePath}`);
      }

      items.push(...json);
      url = nextUrl;
    }

    return items;
  }

  logger.info(
    `Verifying PR agent output for ${repository}#${prNumber} using visibility window starting ${startedAt}`
  );

  const issueCommentsPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/issues/${prNumber}/comments?since=${encodeURIComponent(apiSince)}`;
  const reviewsPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/pulls/${prNumber}/reviews`;
  const reviewCommentsPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/pulls/${prNumber}/comments?since=${encodeURIComponent(apiSince)}`;

  const [issueComments, reviews, reviewComments] = await Promise.all([
    fetchPaginated(issueCommentsPath),
    fetchPaginated(reviewsPath),
    fetchPaginated(reviewCommentsPath),
  ]);

  const isAgentAuthor = (login) => authorLogins.has(String(login ?? "").toLowerCase());
  const issueCommentFailures = issueComments
    .filter(
      (comment) =>
        isAgentAuthor(comment.user?.login) &&
        touchedSince(comment, startedAtMs, ["created_at", "updated_at"]) &&
        bodyMatchesAny(comment.body, failurePatterns)
    )
    .map((comment) => annotateArtifact("issue_comment_failure", comment));

  const qualifyingIssueComments = issueComments
    .filter(
      (comment) =>
        isAgentAuthor(comment.user?.login) &&
        touchedSince(comment, startedAtMs, ["created_at", "updated_at"]) &&
        bodyLooksMeaningful(comment.body, minBodyLength) &&
        !bodyMatchesAny(comment.body, failurePatterns) &&
        bodyMatchesAny(comment.body, visibleOutputPatterns)
    )
    .map((comment) => annotateArtifact("issue_comment", comment));

  const recentAgentReviews = reviews.filter(
    (review) =>
      isAgentAuthor(review.user?.login) && touchedSince(review, startedAtMs, ["submitted_at"])
  );
  const recentAgentReviewIds = new Set(recentAgentReviews.map((review) => review.id).filter(Boolean));

  const qualifyingReviewComments = reviewComments
    .filter((comment) => {
      if (!isAgentAuthor(comment.user?.login)) {
        return false;
      }

      if (!touchedSince(comment, startedAtMs, ["created_at", "updated_at"])) {
        return false;
      }

      if (!bodyLooksMeaningful(comment.body, minBodyLength)) {
        return false;
      }

      if (comment.pull_request_review_id && !recentAgentReviewIds.has(comment.pull_request_review_id)) {
        return false;
      }

      return !bodyMatchesAny(comment.body, failurePatterns);
    })
    .map((comment) =>
      annotateArtifact("review_comment", comment, {
        reviewId: comment.pull_request_review_id ?? null,
        path: comment.path ?? null,
        line: comment.line ?? comment.original_line ?? null,
      })
    );

  const qualifyingReviewCommentIds = new Set(
    qualifyingReviewComments.map((comment) => comment.reviewId).filter(Boolean)
  );
  const qualifyingReviews = recentAgentReviews
    .filter(
      (review) =>
        !bodyMatchesAny(review.body, failurePatterns) &&
        (bodyLooksMeaningful(review.body, minBodyLength) ||
          bodyMatchesAny(review.body, visibleOutputPatterns) ||
          qualifyingReviewCommentIds.has(review.id))
    )
    .map((review) =>
      annotateArtifact("review", review, {
        state: review.state ?? null,
      })
    );

  const visibleArtifacts = [
    ...qualifyingIssueComments,
    ...qualifyingReviews,
    ...qualifyingReviewComments,
  ];
  const report = {
    repository,
    prNumber,
    startedAt,
    counts: {
      issueComments: issueComments.length,
      reviews: reviews.length,
      reviewComments: reviewComments.length,
      issueCommentFailures: issueCommentFailures.length,
      qualifyingIssueComments: qualifyingIssueComments.length,
      qualifyingReviews: qualifyingReviews.length,
      qualifyingReviewComments: qualifyingReviewComments.length,
      visibleArtifacts: visibleArtifacts.length,
    },
    visibleArtifacts,
    failureArtifacts: issueCommentFailures,
  };

  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`PR agent verification report written to ${reportPath}`);
  }

  if (issueCommentFailures.length > 0) {
    for (const artifact of issueCommentFailures) {
      logger.error(
        `PR agent reported a run-scoped failure via ${artifact.url ?? `comment ${artifact.id}`}: ${artifact.bodyPreview}`
      );
    }
    throw new Error("PR agent failed to generate usable review output.");
  }

  if (visibleArtifacts.length === 0) {
    throw new Error(
      `PR agent completed without visible run-scoped review output. Fetched ${issueComments.length} issue comments, ${reviews.length} reviews, and ${reviewComments.length} inline review comments after pagination.`
    );
  }

  logger.info(
    `Verified ${visibleArtifacts.length} run-scoped PR agent artifact(s): ${qualifyingIssueComments.length} issue comments, ${qualifyingReviews.length} reviews, ${qualifyingReviewComments.length} inline review comments.`
  );
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exit(1);
});
