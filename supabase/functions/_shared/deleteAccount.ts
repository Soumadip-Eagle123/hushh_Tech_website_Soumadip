export const DELETE_ACCOUNT_DELETED_SCOPES = [
  "storage.hushh_ai_media",
  "storage.signed_nda_pdfs",
  "database.financial_data",
  "database.onboarding_and_profile_data",
  "database.identity_and_privacy_data",
  "database.public_user_branch",
  "database.ai_and_agent_data",
  "database.legacy_investor_agent_data",
  "auth.account",
] as const;

export const DELETE_ACCOUNT_RETAINED_SCOPES = [
  "audit.payment_minimum",
] as const;

export const DELETE_ACCOUNT_SCHEMA_COVERED_TABLES = [
  "agent_messages",
  "agent_reviews",
  "agent_tasks",
  "analytics_events",
  "blocked_agents",
  "ceo_meeting_payments",
  "community_registrations",
  "consents",
  "consumer_profiles",
  "conversations",
  "delete_requests",
  "devices",
  "hushh_ai_chats",
  "hushh_ai_media_limits",
  "hushh_ai_messages",
  "hushh_ai_rate_limits",
  "hushh_ai_users",
  "identity_verifications",
  "intelligence_conversations",
  "intelligence_media_limits",
  "intelligence_messages",
  "intelligence_users",
  "investor_agents",
  "investor_inquiries",
  "investor_profiles",
  "kyc_attestations",
  "kyc_consent_tokens",
  "kyc_profiles",
  "lead_events",
  "lead_requests",
  "messages",
  "nda_signatures",
  "notifications",
  "onboarding_data",
  "plaid_accounts",
  "plaid_items",
  "plaid_sync_cursors",
  "plaid_transactions",
  "public_chat_messages",
  "site_analytics_events",
  "site_analytics_sessions",
  "swipe_actions",
  "user_agent_selections",
  "user_enriched_profiles",
  "user_financial_data",
  "user_product_usage",
  "users",
] as const;

export const DELETE_ACCOUNT_SCHEMA_IGNORED_TABLES = [
  // These tables remain in historical migrations only; the forward cleanup
  // migration drops them from active environments.
  "hushh_agent_conversations",
  "hushh_agent_email_sessions",
  "hushh_agent_resume_sessions",
  "hushh_agent_subscriptions",
  "hushh_agent_usage",
  "resume_analyses",
] as const;

export interface DeleteAccountResultDetails {
  archivedPaymentAuditRows: number;
  hushhAiMediaObjectsDeleted: number;
  ndaAssetObjectsDeleted: number;
}

export interface DeleteAccountSuccessPayload {
  success: true;
  deletedScopes: readonly string[];
  retainedScopes: readonly string[];
  details: DeleteAccountResultDetails;
}

export const DEFAULT_DELETE_ACCOUNT_RESULT_DETAILS: DeleteAccountResultDetails = {
  archivedPaymentAuditRows: 0,
  hushhAiMediaObjectsDeleted: 0,
  ndaAssetObjectsDeleted: 0,
};

export function buildDeleteAccountSuccessPayload(
  details: Partial<DeleteAccountResultDetails> = {}
): DeleteAccountSuccessPayload {
  return {
    success: true,
    deletedScopes: DELETE_ACCOUNT_DELETED_SCOPES,
    retainedScopes: DELETE_ACCOUNT_RETAINED_SCOPES,
    details: {
      ...DEFAULT_DELETE_ACCOUNT_RESULT_DETAILS,
      ...details,
    },
  };
}

export function dedupeDeleteAccountPaths(
  values: Array<string | null | undefined>
): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

export function buildSignedNdaAssetPathFromUrl(
  urlValue: string | null | undefined
): string | null {
  if (!urlValue) return null;

  try {
    const url = new URL(urlValue);
    const marker = "/storage/v1/object/public/assets/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const assetPath = decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length)
    );

    return assetPath.startsWith("signed-ndas/") ? assetPath : null;
  } catch {
    return null;
  }
}
