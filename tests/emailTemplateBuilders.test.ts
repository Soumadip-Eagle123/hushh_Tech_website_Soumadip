import { describe, expect, it } from "vitest";

import { buildCoinsCreditEmailHtml } from "../supabase/functions/coins-credit-notification/template";
import { buildCoinsDeductionEmailHtml } from "../supabase/functions/coins-deduction-notification/template";
import { buildNDANotificationHtml } from "../supabase/functions/nda-signed-notification/template";
import {
  buildVaultAccessNotificationHtml,
  buildVaultAccessSubject,
} from "../supabase/functions/vault-access-notification/template";

function expectEmailSafeMarkup(html: string) {
  expect(html).not.toMatch(/tailwindcss/i);
  expect(html).not.toMatch(/fonts\.googleapis/i);
  expect(html).not.toMatch(/material-symbols/i);
  expect(html).not.toMatch(/hover:/i);
  expect(html).not.toContain("<svg");
  expect(html).not.toContain("https://hushhtech.com/images/email-icons/");
  expect(html).toContain('name="color-scheme" content="light"');
  expect(html).toContain('name="supported-color-schemes" content="light"');
}

describe("Email template builders", () => {
  it("renders NDA email with styled extras and both CTAs when user context exists", () => {
    const html = buildNDANotificationHtml({
      signerName: "Ankit Kumar Singh",
      signerEmail: "ankit@example.com",
      signedDate: "Thursday, April 9, 2026 at 7:37:06 AM UTC",
      ndaVersion: "v1.0",
      signerIp: "Unknown",
      pdfUrl: "https://example.com/nda.pdf",
      pdfBase64: "ZmFrZS1wZGY=",
      userId: "e824f66e-8066-4a17-b588-982e8c5c4729",
      documentsAcknowledged: ["PPM", "LPA"],
    });

    expect(html).toContain("NDA Agreement Signed");
    expect(html).toContain("Internal Notification");
    expect(html).toContain("Signer Information");
    expect(html).toContain("Signed NDA Document");
    expect(html).toContain("Attachment Notice");
    expect(html).toContain("Fund Documents Acknowledged");
    expect(html).toContain("View This User&#39;s NDA");
    expect(html).toContain("View All NDA Agreements");
    expect(html).toContain("https://hushhtech.com/nda-admin?highlight=e824f66e-8066-4a17-b588-982e8c5c4729");
    expect(html).toContain("https://hushhtech.com/nda-admin");
    expect(html).toContain("https://www.linkedin.com/company/hushh-ai/");
    expect(html).toContain("https://www.facebook.com/hushhaiplatform");
    expect(html).toContain("Please keep this confidential.");
    expect(html).toContain("cid:hushh-icon-home");
    expect(html).toContain("cid:hushh-icon-facebook");
    expectEmailSafeMarkup(html);
  });

  it("omits the user-specific NDA CTA when there is no user id", () => {
    const html = buildNDANotificationHtml({
      signerName: "Test User",
      signerEmail: "test@example.com",
      signedDate: "Friday, April 10, 2026 at 9:00:00 AM UTC",
      ndaVersion: "v1.0",
      signerIp: "127.0.0.1",
    });

    expect(html).toContain("View All NDA Agreements");
    expect(html).not.toContain("View This User&#39;s NDA");
  });

  it("renders coins credit email with CTA, reward list, and disclaimer", () => {
    const html = buildCoinsCreditEmailHtml({
      recipientName: "Ankit Kumar Singh",
      coinsAwarded: 300000,
      dateLabel: "Apr 9, 2026",
    });

    expect(html).toContain("You've been credited.");
    expect(html).toContain("300,000");
    expect(html).toContain("Hushh Coins");
    expect(html).toContain("Transaction Details");
    expect(html).toContain("Your Exclusive Coin Rewards");
    expect(html).toContain("Book a Consultation");
    expect(html).toContain("Investment Guidance");
    expect(html).toContain("KYC Verified");
    expect(html).toContain("Activate Your Session");
    expect(html).toContain("https://hushhtech.com/onboarding/meet-ceo");
    expect(html).toContain("Hushh Coins are for internal ecosystem use only.");
    expect(html).toContain("cid:hushh-icon-calendar");
    expect(html).toContain("cid:hushh-icon-bank");
    expect(html).toContain("cid:hushh-icon-shield");
    expect(html).not.toContain(">C<");
    expect(html).not.toContain(">I<");
    expect(html).not.toContain(">OK<");
    expectEmailSafeMarkup(html);
  });

  it("renders meeting confirmation email without the credit CTA", () => {
    const html = buildCoinsDeductionEmailHtml({
      coinsDeducted: 300000,
      meetingDate: "Thursday, April 9, 2026",
      meetingTime: "6:30 PM – 7:30 PM",
      transactionDate: "Thursday, April 9, 2026",
    });

    expect(html).toContain("Meeting Confirmed");
    expect(html).toContain("Your consultation has been successfully scheduled");
    expect(html).toContain("Meeting Details");
    expect(html).toContain("Coins Transaction");
    expect(html).toContain("Prepare For Your Session");
    expect(html).toContain("Review your portfolio");
    expect(html).toContain("Check your calendar invite");
    expect(html).toContain("cid:hushh-icon-analytics");
    expect(html).toContain("cid:hushh-icon-quiz");
    expect(html).toContain("cid:hushh-icon-calendar-check");
    expect(html).not.toContain("Activate Your Session");
    expect(html).not.toContain(">R<");
    expect(html).not.toContain(">?<");
    expect(html).not.toContain(">C<");
    expect(html).toContain("https://www.youtube.com/@hushhai");
    expectEmailSafeMarkup(html);
  });

  it("renders Vault access notifications as metadata-only email", () => {
    const html = buildVaultAccessNotificationHtml({
      eventType: "reshare.requested",
      itemName: "Series A SAFE",
      itemType: "document",
      ownerEmail: "owner@example.com",
      actorEmail: "actor@example.com",
      requesterEmail: "requester@example.com",
      targetEmail: "target@example.com",
      reason: "Needs access for diligence review.",
      actionUrl: "https://vault.hushh.ai/access/request_123",
    });

    expect(buildVaultAccessSubject("reshare.requested", "Series A SAFE")).toBe(
      "[Hushh Vault] A reshare needs review: Series A SAFE"
    );
    expect(html).toContain("Reshare Requested");
    expect(html).toContain("Access Metadata");
    expect(html).toContain("Series A SAFE");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("requester@example.com");
    expect(html).toContain("target@example.com");
    expect(html).toContain("Review Request");
    expect(html).toContain("https://vault.hushh.ai/access/request_123");
    expect(html).toContain("No Vault secrets, plaintext values, attachments, or raw item data are included.");
    expect(html).toContain("cid:hushh-icon-shield");
    expect(html).toContain("cid:hushh-icon-calendar-check");
    expect(html).toContain("cid:hushh-icon-analytics");
    expect(html).not.toContain("secretValue");
    expect(html).not.toContain("plaintextValue");
    expectEmailSafeMarkup(html);
  });
});
