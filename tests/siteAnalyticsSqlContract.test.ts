import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("site analytics SQL contract", () => {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

  it("creates service-role-only analytics tables", () => {
    const sql = readFileSync(
      path.resolve(
        process.cwd(),
        "supabase/migrations/20260428120000_create_site_analytics_tables.sql"
      ),
      "utf8"
    );

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.site_analytics_sessions");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.site_analytics_events");
    expect(sql).toContain("ALTER TABLE public.site_analytics_sessions ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON public.site_analytics_sessions FROM anon, authenticated");
    expect(sql).toContain("REVOKE ALL ON public.site_analytics_events FROM anon, authenticated");
    expect(sql).toContain("GRANT ALL ON public.site_analytics_sessions TO service_role");
    expect(sql).toContain("GRANT ALL ON public.site_analytics_events TO service_role");
  });

  it("does not grant public raw-row access in any migration", () => {
    const allSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n");
    const analyticsStatements = allSql
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) =>
        /site_analytics_(sessions|events)/i.test(statement)
      );

    for (const statement of analyticsStatements) {
      expect(statement).not.toMatch(
        /\bGRANT\s+(SELECT|ALL|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER)\b[\s\S]*\bTO\s+(anon|authenticated)\b/i
      );
      expect(statement).not.toMatch(
        /\bCREATE\s+POLICY\b[\s\S]*\bTO\s+(anon|authenticated)\b/i
      );
    }
  });
});
