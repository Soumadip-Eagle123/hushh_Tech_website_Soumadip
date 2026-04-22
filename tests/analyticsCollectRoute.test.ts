import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const sessionSingle = vi.fn();
const sessionSelect = vi.fn(() => ({ single: sessionSingle }));
const sessionUpsert = vi.fn(() => ({ select: sessionSelect }));
const eventUpsert = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === "site_analytics_sessions") {
    return { upsert: sessionUpsert };
  }

  if (table === "site_analytics_events") {
    return { upsert: eventUpsert };
  }

  throw new Error(`Unexpected table ${table}`);
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser },
    from: fromMock,
  })),
}));

const createResponse = () => {
  const headers = new Map();
  let statusCode = 200;
  let body: any;
  let ended = false;

  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get ended() {
      return ended;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    end() {
      ended = true;
      return this;
    },
  };
};

const validBody = {
  anonymousId: "anon-123",
  sessionId: "session-123",
  context: {
    device: "desktop",
    platform: "web",
    referrerHost: "example.com",
    userAgent: "should-not-persist",
  },
  events: [
    {
      eventId: "event-1",
      eventName: "community_search",
      occurredAt: "2026-04-28T10:00:00.000Z",
      routePath: "/community?token=secret#hash",
      routeGroup: "person@example.com",
      properties: {
        surface: "community",
        routeGroup: "person@example.com",
        resultCount: 7,
        queryHash: "query-hash",
        query: "raw search must not persist",
        email: "person@example.com",
      },
    },
  ],
};

describe("analytics collect route", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://ibsisfnjxeowvdtvgzff.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.ANALYTICS_HASH_SALT = "test-salt";
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    sessionSingle.mockResolvedValue({ data: { id: "session-row-1" }, error: null });
    eventUpsert.mockResolvedValue({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ANALYTICS_HASH_SALT;
    vi.clearAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("accepts sanitized analytics events and derives user id from bearer token", async () => {
    const { default: handler } = await import("../api/analytics/collect.js");
    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer token-123",
        "user-agent": "Full user agent should be hashed",
        "x-forwarded-for": "203.0.113.10",
      },
      body: validBody,
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(202);
    expect(res.body).toMatchObject({ success: true, accepted: 1 });
    expect(getUser).toHaveBeenCalledWith("token-123");
    expect(sessionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        entry_path: "/community",
        ip_hash: expect.any(String),
        user_agent_hash: expect.any(String),
      }),
      { onConflict: "session_key" }
    );
    expect(eventUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          session_id: "session-row-1",
          user_id: "user-1",
          event_name: "community_search",
          route_path: "/community",
          route_group: "community",
          search_query_hash: "query-hash",
          properties: {
            surface: "community",
            resultCount: 7,
            queryHash: "query-hash",
          },
          context: {
            device: "desktop",
            platform: "web",
            referrerHost: "example.com",
          },
        }),
      ],
      { onConflict: "event_id", ignoreDuplicates: true }
    );
  });

  it("rejects spoofed user identifiers", async () => {
    const { default: handler } = await import("../api/analytics/collect.js");
    const req = {
      method: "POST",
      headers: {},
      body: {
        ...validBody,
        userId: "spoofed-user",
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("user identifiers");
    expect(eventUpsert).not.toHaveBeenCalled();
  });

  it("rejects unsupported events and oversized payloads", async () => {
    const { default: handler } = await import("../api/analytics/collect.js");
    const unsupportedReq = {
      method: "POST",
      headers: {},
      body: {
        ...validBody,
        events: [{ eventId: "event-2", eventName: "raw_prompt_sent" }],
      },
    };
    const unsupportedRes = createResponse();

    await handler(unsupportedReq, unsupportedRes);

    expect(unsupportedRes.statusCode).toBe(400);
    expect(unsupportedRes.body.error).toContain("Unsupported analytics event");

    const largeReq = {
      method: "POST",
      headers: { "content-length": `${70 * 1024}` },
      body: validBody,
    };
    const largeRes = createResponse();

    await handler(largeReq, largeRes);

    expect(largeRes.statusCode).toBe(413);

    const tooManyReq = {
      method: "POST",
      headers: {},
      body: {
        ...validBody,
        events: Array.from({ length: 51 }, (_, index) => ({
          eventId: `event-${index}`,
          eventName: "page_view",
        })),
      },
    };
    const tooManyRes = createResponse();

    await handler(tooManyReq, tooManyRes);

    expect(tooManyRes.statusCode).toBe(400);
    expect(tooManyRes.body.error).toContain("more than 50");
  });

  it("rejects invalid bearer tokens", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const { default: handler } = await import("../api/analytics/collect.js");
    const req = {
      method: "POST",
      headers: { authorization: "Bearer expired" },
      body: validBody,
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
    expect(res.body.detail).toBeUndefined();
  });

  it("fails closed when analytics hash salt is missing", async () => {
    delete process.env.ANALYTICS_HASH_SALT;

    const { default: handler } = await import("../api/analytics/collect.js");
    const req = {
      method: "POST",
      headers: {},
      body: validBody,
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Analytics collection unavailable" });
    expect(eventUpsert).not.toHaveBeenCalled();
  });

  it("uses duplicate-safe upserts when the same event is replayed", async () => {
    const { default: handler } = await import("../api/analytics/collect.js");
    const req = {
      method: "POST",
      headers: {},
      body: validBody,
    };

    await handler(req, createResponse());
    await handler(req, createResponse());

    expect(eventUpsert).toHaveBeenCalledTimes(2);
    expect(eventUpsert).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      { onConflict: "event_id", ignoreDuplicates: true }
    );
  });
});
