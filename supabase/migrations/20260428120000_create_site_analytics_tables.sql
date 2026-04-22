-- First-party website analytics for the public metrics endpoint.
-- Raw rows are service-role only; public access is through aggregate API routes.

CREATE TABLE IF NOT EXISTS public.site_analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,
  anonymous_id_hash TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  entry_path TEXT,
  exit_path TEXT,
  entry_route_group TEXT,
  exit_route_group TEXT,
  referrer_host TEXT,
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  device JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  session_id UUID REFERENCES public.site_analytics_sessions(id) ON DELETE SET NULL,
  session_key TEXT NOT NULL,
  anonymous_id_hash TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  route_path TEXT,
  route_group TEXT,
  search_query_hash TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_sessions_started_at
  ON public.site_analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_sessions_last_seen_at
  ON public.site_analytics_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_sessions_user_id
  ON public.site_analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_sessions_route_group
  ON public.site_analytics_sessions(entry_route_group, exit_route_group);

CREATE INDEX IF NOT EXISTS idx_site_analytics_events_occurred_at
  ON public.site_analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_events_event_name
  ON public.site_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_site_analytics_events_route_group
  ON public.site_analytics_events(route_group);
CREATE INDEX IF NOT EXISTS idx_site_analytics_events_session_id
  ON public.site_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_events_user_id
  ON public.site_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_events_search_hash
  ON public.site_analytics_events(search_query_hash)
  WHERE search_query_hash IS NOT NULL;

ALTER TABLE public.site_analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can manage site analytics sessions"
    ON public.site_analytics_sessions;
  DROP POLICY IF EXISTS "Service role can manage site analytics events"
    ON public.site_analytics_events;
END; $$;

CREATE POLICY "Service role can manage site analytics sessions"
  ON public.site_analytics_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage site analytics events"
  ON public.site_analytics_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON public.site_analytics_sessions FROM anon, authenticated;
REVOKE ALL ON public.site_analytics_events FROM anon, authenticated;
GRANT ALL ON public.site_analytics_sessions TO service_role;
GRANT ALL ON public.site_analytics_events TO service_role;

COMMENT ON TABLE public.site_analytics_sessions IS
  'Service-role-only first-party website analytics sessions for aggregate public metrics.';
COMMENT ON TABLE public.site_analytics_events IS
  'Service-role-only sanitized website analytics events for aggregate public metrics.';
COMMENT ON COLUMN public.site_analytics_events.properties IS
  'Allowlisted aggregate-safe properties only. Never store raw search text, prompts, tokens, PII, IPs, or full user agents.';
