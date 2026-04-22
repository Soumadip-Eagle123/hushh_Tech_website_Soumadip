import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("google analytics initial HTML bootstrap", () => {
  it("keeps the GA4 tag in index.html aligned with the client tracker", () => {
    const html = readRepoFile("index.html");
    const clientSource = readRepoFile("src/services/analytics/googleAnalytics.ts");
    const idMatch = clientSource.match(
      /GOOGLE_ANALYTICS_TRACKING_ID\s*=\s*"([^"]+)"/
    );

    expect(idMatch?.[1]).toMatch(/^G-[A-Z0-9]+$/);

    const measurementId = idMatch?.[1] || "";
    expect(html).toContain(
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    );
    expect(html).toContain("window.dataLayer = window.dataLayer || []");
    expect(html).toContain("window.gtag = window.gtag || function gtag()");
  });
});
