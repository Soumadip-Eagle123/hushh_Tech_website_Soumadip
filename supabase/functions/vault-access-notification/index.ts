// Vault Access Notification Service
// Sends metadata-only Vault access notifications using Gmail API with Service Account DWD.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { collectInlineAssets } from "../_shared/emailInlineAssets.ts";
import { base64urlEncode, createRelatedEmailMessage } from "../_shared/emailMime.ts";
import {
  buildVaultAccessNotificationHtml,
  buildVaultAccessSubject,
  type VaultAccessEventType,
  VAULT_ACCESS_INLINE_ASSET_KEYS,
} from "./template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EVENT_TYPES: readonly VaultAccessEventType[] = [
  "share.created",
  "invite.pending",
  "reshare.requested",
  "reshare.approved",
  "reshare.denied",
  "share.revoked",
];

const ALLOWED_PAYLOAD_FIELDS = new Set([
  "recipientEmail",
  "eventType",
  "itemName",
  "itemType",
  "ownerEmail",
  "actorEmail",
  "requesterEmail",
  "targetEmail",
  "reason",
  "actionUrl",
]);

const FORBIDDEN_FIELD_PATTERN = /(secret|plaintext|plainText)/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface VaultAccessNotificationPayload {
  recipientEmail: string;
  eventType: VaultAccessEventType;
  itemName: string;
  itemType: string;
  ownerEmail: string;
  actorEmail?: string;
  requesterEmail?: string;
  targetEmail?: string;
  reason?: string;
  actionUrl?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function containsForbiddenField(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenField(entry));
  }

  return Object.entries(value as Record<string, unknown>).some(
    ([key, entry]) => FORBIDDEN_FIELD_PATTERN.test(key) || containsForbiddenField(entry)
  );
}

function requireString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${field}`);
  }

  return value.trim();
}

function optionalString(payload: Record<string, unknown>, field: string): string | undefined {
  const value = payload[field];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Field must be a string: ${field}`);
  }

  return value.trim();
}

function assertEmail(value: string, field: string): void {
  if (!EMAIL_PATTERN.test(value)) {
    throw new Error(`Invalid email field: ${field}`);
  }
}

function validateActionUrl(actionUrl?: string): void {
  if (!actionUrl) return;

  let parsed: URL;
  try {
    parsed = new URL(actionUrl);
  } catch {
    throw new Error("Invalid actionUrl");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("actionUrl must use http or https");
  }
}

function validatePayload(rawPayload: unknown): VaultAccessNotificationPayload {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    throw new Error("Request body must be a JSON object");
  }

  if (containsForbiddenField(rawPayload)) {
    throw new Error("Secret/plaintext fields are not allowed in Vault notification payloads");
  }

  const payload = rawPayload as Record<string, unknown>;
  const unexpectedFields = Object.keys(payload).filter((field) => !ALLOWED_PAYLOAD_FIELDS.has(field));
  if (unexpectedFields.length > 0) {
    throw new Error(`Unexpected fields are not allowed: ${unexpectedFields.join(", ")}`);
  }

  const recipientEmail = requireString(payload, "recipientEmail");
  const eventType = requireString(payload, "eventType") as VaultAccessEventType;
  const itemName = requireString(payload, "itemName");
  const itemType = requireString(payload, "itemType");
  const ownerEmail = requireString(payload, "ownerEmail");
  const actorEmail = optionalString(payload, "actorEmail");
  const requesterEmail = optionalString(payload, "requesterEmail");
  const targetEmail = optionalString(payload, "targetEmail");
  const reason = optionalString(payload, "reason");
  const actionUrl = optionalString(payload, "actionUrl");

  if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Unsupported eventType: ${eventType}`);
  }

  assertEmail(recipientEmail, "recipientEmail");
  assertEmail(ownerEmail, "ownerEmail");
  if (actorEmail) assertEmail(actorEmail, "actorEmail");
  if (requesterEmail) assertEmail(requesterEmail, "requesterEmail");
  if (targetEmail) assertEmail(targetEmail, "targetEmail");
  if (reason && reason.length > 1000) {
    throw new Error("reason must be 1000 characters or fewer");
  }
  validateActionUrl(actionUrl);

  return {
    recipientEmail,
    eventType,
    itemName,
    itemType,
    ownerEmail,
    actorEmail,
    requesterEmail,
    targetEmail,
    reason,
    actionUrl,
  };
}

async function createSignedJWT(
  serviceAccountEmail: string,
  privateKey: string,
  userToImpersonate: string,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountEmail,
    sub: userToImpersonate,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: scopes.join(" "),
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const privateKeyPem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const privateKeyBuffer = Uint8Array.from(atob(privateKeyPem), (char) => char.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  return `${signatureInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function getAccessToken(
  serviceAccountEmail: string,
  privateKey: string,
  userToImpersonate: string
): Promise<string> {
  const signedJwt = await createSignedJWT(
    serviceAccountEmail,
    privateKey,
    userToImpersonate,
    ["https://www.googleapis.com/auth/gmail.send"]
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  return (await response.json()).access_token;
}

async function sendGmailEmail(
  recipientEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const senderEmail = Deno.env.get("GMAIL_SENDER_EMAIL") || "ankit@hushh.ai";

    if (!serviceAccountEmail || !privateKey) {
      return { success: false, error: "Missing Google Service Account credentials" };
    }

    const accessToken = await getAccessToken(
      serviceAccountEmail,
      privateKey.replace(/\\n/g, "\n"),
      senderEmail
    );
    const rawMessage = createRelatedEmailMessage({
      fromLabel: "Hushh Vault",
      fromEmail: senderEmail,
      recipients: [recipientEmail],
      subject,
      htmlContent,
      inlineAssets: collectInlineAssets(VAULT_ACCESS_INLINE_ASSET_KEYS),
    });

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64urlEncode(rawMessage) }),
    });

    if (!response.ok) {
      return { success: false, error: `Gmail API error: ${await response.text()}` };
    }

    const result = await response.json();
    if (!result.id) {
      return { success: false, error: "Gmail API response did not include message id" };
    }

    return { success: true, messageId: result.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = validatePayload(await req.json());
    const subject = buildVaultAccessSubject(payload.eventType, payload.itemName);
    const html = buildVaultAccessNotificationHtml(payload);
    const result = await sendGmailEmail(payload.recipientEmail, subject, html);

    if (!result.success) {
      return jsonResponse({ error: result.error || "Failed to send Vault access notification" }, 500);
    }

    return jsonResponse({ success: true, messageId: result.messageId });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Failed to send Vault access notification" },
      400
    );
  }
});
