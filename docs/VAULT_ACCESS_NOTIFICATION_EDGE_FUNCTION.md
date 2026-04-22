# Vault Access Notification Edge Function

`vault-access-notification` sends metadata-only Vault access emails through the shared Gmail API service-account flow.

## Endpoint

`POST /functions/v1/vault-access-notification`

## Required Secrets

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GMAIL_SENDER_EMAIL` defaults to `ankit@hushh.ai` when unset

## Request Contract

```json
{
  "recipientEmail": "recipient@example.com",
  "eventType": "reshare.requested",
  "itemName": "Series A SAFE",
  "itemType": "document",
  "ownerEmail": "owner@example.com",
  "actorEmail": "actor@example.com",
  "requesterEmail": "requester@example.com",
  "targetEmail": "target@example.com",
  "reason": "Needs access for diligence review.",
  "actionUrl": "https://vault.hushh.ai/access/request_123"
}
```

Supported `eventType` values:

- `share.created`
- `invite.pending`
- `reshare.requested`
- `reshare.approved`
- `reshare.denied`
- `share.revoked`

Required fields:

- `recipientEmail`
- `eventType`
- `itemName`
- `itemType`
- `ownerEmail`

Optional fields:

- `actorEmail`
- `requesterEmail`
- `targetEmail`
- `reason`
- `actionUrl`

Security contract:

- Do not send Vault item contents.
- Do not send attachments, raw item data, encrypted blobs, or decrypted values.
- Fields whose names include `secret`, `plaintext`, or `plainText` are rejected.
- Unexpected top-level fields are rejected.
- Email bodies must stay metadata-only and point recipients back to Vault for authenticated access decisions.

## Response Contract

Success:

```json
{
  "success": true,
  "messageId": "gmail-message-id"
}
```

Failure:

```json
{
  "error": "Validation or Gmail delivery error"
}
```
