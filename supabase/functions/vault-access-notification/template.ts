import {
  EMAIL_COLORS,
  renderBodySection,
  renderButtons,
  renderCard,
  renderEmailDocument,
  renderFeatureList,
  renderFooter,
  renderHeroSection,
  renderKeyValueRows,
  renderTextBlock,
} from "../_shared/emailTemplateChrome.ts";
import { EMAIL_FOOTER_INLINE_ASSET_KEYS, type EmailInlineAssetKey } from "../_shared/emailInlineAssets.ts";

export type VaultAccessEventType =
  | "share.created"
  | "invite.pending"
  | "reshare.requested"
  | "reshare.approved"
  | "reshare.denied"
  | "share.revoked";

export interface VaultAccessNotificationTemplateData {
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

export const VAULT_ACCESS_INLINE_ASSET_KEYS: EmailInlineAssetKey[] = [
  ...EMAIL_FOOTER_INLINE_ASSET_KEYS,
  "shield",
  "calendar-check",
  "analytics",
];

const EVENT_COPY: Record<
  VaultAccessEventType,
  {
    eyebrow: string;
    headline: string;
    intro: string;
    status: string;
    ctaLabel: string;
  }
> = {
  "share.created": {
    eyebrow: "Vault Share Created",
    headline: "Access was shared",
    intro: "A Vault item was shared with your account. Only metadata is included in this notification.",
    status: "SHARED",
    ctaLabel: "View Shared Item",
  },
  "invite.pending": {
    eyebrow: "Vault Invite Pending",
    headline: "You have a pending invite",
    intro: "A Vault access invite is waiting for your review. The item contents are not included here.",
    status: "PENDING",
    ctaLabel: "Review Invite",
  },
  "reshare.requested": {
    eyebrow: "Reshare Requested",
    headline: "A reshare needs review",
    intro: "Someone requested permission to reshare a Vault item. Review the request before approving access.",
    status: "REQUESTED",
    ctaLabel: "Review Request",
  },
  "reshare.approved": {
    eyebrow: "Reshare Approved",
    headline: "A reshare was approved",
    intro: "A Vault reshare request was approved. This email includes metadata only.",
    status: "APPROVED",
    ctaLabel: "View Access",
  },
  "reshare.denied": {
    eyebrow: "Reshare Denied",
    headline: "A reshare was denied",
    intro: "A Vault reshare request was denied. No Vault item contents are included in this message.",
    status: "DENIED",
    ctaLabel: "View Request",
  },
  "share.revoked": {
    eyebrow: "Vault Share Revoked",
    headline: "Access was revoked",
    intro: "Access to a Vault item was revoked. This notification only contains access metadata.",
    status: "REVOKED",
    ctaLabel: "Review Access",
  },
};

function optionalRow(label: string, value?: string) {
  return value ? [{ label, value, monospace: true, breakAll: true }] : [];
}

export function getVaultAccessEventCopy(eventType: VaultAccessEventType) {
  return EVENT_COPY[eventType];
}

export function buildVaultAccessSubject(eventType: VaultAccessEventType, itemName: string): string {
  const copy = getVaultAccessEventCopy(eventType);
  return `[Hushh Vault] ${copy.headline}: ${itemName}`;
}

export function buildVaultAccessNotificationHtml({
  eventType,
  itemName,
  itemType,
  ownerEmail,
  actorEmail,
  requesterEmail,
  targetEmail,
  reason,
  actionUrl,
}: VaultAccessNotificationTemplateData): string {
  const copy = getVaultAccessEventCopy(eventType);
  const hasAction = Boolean(actionUrl);

  return renderEmailDocument(`
    ${renderHeroSection(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td align="center" style="font-family:Inter, Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;color:${EMAIL_COLORS.gold};font-weight:700;letter-spacing:0.18em;text-transform:uppercase;padding:0 0 16px 0;">
            ${copy.eyebrow}
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:Inter, Arial, Helvetica, sans-serif;font-size:42px;line-height:1.05;color:${EMAIL_COLORS.white};font-weight:700;padding:0 0 14px 0;">
            ${copy.headline}
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:Inter, Arial, Helvetica, sans-serif;font-size:14px;line-height:1.7;color:${EMAIL_COLORS.white};font-weight:400;padding:0;">
            ${copy.intro}
          </td>
        </tr>
      </table>
    `)}
    ${renderBodySection(`
      <div style="padding-top:52px;padding-bottom:8px;">
        ${renderCard(
          "Access Metadata",
          renderKeyValueRows([
            { label: "Status", value: copy.status, monospace: true },
            { label: "Event", value: eventType, monospace: true },
            { label: "Item", value: itemName, monospace: true, breakAll: true },
            { label: "Item Type", value: itemType, monospace: true },
            { label: "Owner", value: ownerEmail, monospace: true, breakAll: true },
            ...optionalRow("Actor", actorEmail),
            ...optionalRow("Requester", requesterEmail),
            ...optionalRow("Target", targetEmail),
            ...optionalRow("Reason", reason),
          ])
        )}
      </div>
    `)}
    ${renderBodySection(`
      <div style="padding-top:42px;padding-bottom:10px;">
        <div style="font-family:Inter, Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_COLORS.bodyText};padding-bottom:24px;">
          Privacy Boundary
        </div>
        ${renderFeatureList([
          {
            glyph: "S",
            icon: "shield",
            title: "Metadata Only",
            description: "No Vault secrets, plaintext values, attachments, or raw item data are included.",
          },
          {
            glyph: "A",
            icon: "calendar-check",
            title: "Action Required In Vault",
            description: "Use the Vault app for approvals, denials, revocations, or item inspection.",
          },
          {
            glyph: "L",
            icon: "analytics",
            title: "Auditable Access",
            description: "This notification is for access tracking and account awareness.",
          },
        ])}
      </div>
    `)}
    ${hasAction ? renderBodySection(`
      <div style="padding-top:12px;padding-bottom:18px;">
        ${renderButtons([
          {
            label: copy.ctaLabel,
            href: actionUrl as string,
            variant: "primary",
          },
        ])}
      </div>
    `) : ""}
    ${renderBodySection(`
      <div style="padding-top:${hasAction ? "22px" : "38px"};padding-bottom:54px;">
        ${renderTextBlock(
          "Security note: this email intentionally excludes Vault item contents and secrets. Open Vault to inspect or act on the item.",
          { centered: true, muted: true }
        )}
      </div>
    `)}
    ${renderFooter()}
  `);
}
