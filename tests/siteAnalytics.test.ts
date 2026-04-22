// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resources/config/config", () => ({
  default: {
    supabaseClient: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    },
  },
}));

describe("site analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/profile/private-id?utm_source=person@example.com&utm_campaign=token-secret"
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("canonicalizes dynamic paths before sending events", async () => {
    const { sanitizeAnalyticsPath } = await import(
      "../src/services/analytics/siteAnalytics"
    );

    expect(sanitizeAnalyticsPath("/profile/user-123?token=secret")).toBe("/profile/:id");
    expect(sanitizeAnalyticsPath("/hushhid/abc-123")).toBe("/hushhid/:id");
    expect(sanitizeAnalyticsPath("/investor/founder-slug")).toBe("/investor/:slug");
    expect(sanitizeAnalyticsPath("/reports/report-123")).toBe("/reports/:id");
  });

  it("does not forward raw UTM query values", async () => {
    const { trackSiteEvent } = await import("../src/services/analytics/siteAnalytics");

    await trackSiteEvent("page_view");

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const serialized = JSON.stringify(body);

    expect(body.events[0].routePath).toBe("/profile/:id");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("token-secret");
  });
});
