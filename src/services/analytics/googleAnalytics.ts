import {
  sanitizeAnalyticsPath,
  trackPageViewEvent,
} from "./siteAnalytics";

const GOOGLE_ANALYTICS_TRACKING_ID = "G-R58S9WWPM0";
const GOOGLE_ANALYTICS_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_TRACKING_ID}`;
const DUPLICATE_PAGE_VIEW_WINDOW_MS = 1000;

let isAnalyticsConfigured = false;
let lastTrackedPageKey = "";
let lastTrackedAt = 0;

function ensureGtagQueue() {
  window.dataLayer = window.dataLayer || [];

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }
}

function ensureAnalyticsScript() {
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${GOOGLE_ANALYTICS_SCRIPT_SRC}"]`
  );

  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = GOOGLE_ANALYTICS_SCRIPT_SRC;
  script.dataset.hushhAnalytics = "true";
  document.head.appendChild(script);
}

export function initializeGoogleAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  ensureGtagQueue();
  ensureAnalyticsScript();

  if (isAnalyticsConfigured) {
    return;
  }

  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_TRACKING_ID, {
    send_page_view: false,
  });

  isAnalyticsConfigured = true;
}

export function trackPageView(pathname: string, search = "", hash = "") {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  initializeGoogleAnalytics();

  const pagePath = sanitizeAnalyticsPath(pathname || "/", search, hash);
  const now = Date.now();
  if (
    pagePath === lastTrackedPageKey &&
    now - lastTrackedAt < DUPLICATE_PAGE_VIEW_WINDOW_MS
  ) {
    return;
  }

  lastTrackedPageKey = pagePath;
  lastTrackedAt = now;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
  });

  trackPageViewEvent(pathname, search, hash);
}

export { GOOGLE_ANALYTICS_TRACKING_ID };
