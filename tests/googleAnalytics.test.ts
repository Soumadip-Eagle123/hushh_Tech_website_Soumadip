// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackPageViewEvent = vi.fn();

vi.mock("../src/services/analytics/siteAnalytics", () => ({
  sanitizeAnalyticsPath: (pathname: string) => pathname.split("?")[0].split("#")[0],
  trackPageViewEvent,
}));

describe("google analytics client tracking", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    window.dataLayer = [];
    window.gtag = undefined as unknown as Window["gtag"];
    document.title = "Metrics";
    window.history.replaceState({}, "", "/");
    trackPageViewEvent.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes GA only once and disables automatic page views", async () => {
    const analytics = await import("../src/services/analytics/googleAnalytics");

    analytics.initializeGoogleAnalytics();
    analytics.initializeGoogleAnalytics();

    const scripts = document.head.querySelectorAll(
      'script[src="https://www.googletagmanager.com/gtag/js?id=G-R58S9WWPM0"]'
    );

    expect(scripts).toHaveLength(1);
    expect(window.dataLayer).toEqual([
      ["js", expect.any(Date)],
      ["config", "G-R58S9WWPM0", { send_page_view: false }],
    ]);
  });

  it("tracks page views without duplicating the same route immediately", async () => {
    const analytics = await import("../src/services/analytics/googleAnalytics");

    analytics.trackPageView("/metrics", "?view=public");
    analytics.trackPageView("/metrics", "?view=public");

    const pageViewEvents = window.dataLayer.filter(
      (entry) => entry[0] === "event" && entry[1] === "page_view"
    );

    expect(pageViewEvents).toHaveLength(1);
    expect(pageViewEvents[0][2]).toMatchObject({
      page_title: "Metrics",
      page_path: "/metrics",
      page_location: "http://localhost:3000/metrics",
    });
    expect(trackPageViewEvent).toHaveBeenCalledWith(
      "/metrics",
      "?view=public",
      ""
    );
  });
});
