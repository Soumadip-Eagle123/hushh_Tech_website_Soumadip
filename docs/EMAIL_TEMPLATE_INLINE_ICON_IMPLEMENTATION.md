# Email Template Inline Icon Implementation

## Summary

This implementation updates the three live transactional email templates to use inline `cid:` image attachments for icons instead of externally hosted image URLs.

Templates covered:

- `nda-signed-notification`
- `coins-credit-notification`
- `coins-deduction-notification`
- `vault-access-notification`

## Why This Was Needed

Some email clients, especially Gmail, were not reliably rendering externally hosted icons or were caching stale image states. In a few cases, specific embedded PNG assets were also malformed, which caused individual icons such as:

- `facebook` in the footer
- `shield` in `Hushh Coins`
- `quiz` in `Meeting Confirmed`

to appear blank.

## Final Approach

### 1. Inline MIME icons

Icons are now embedded directly inside the email as MIME parts with stable `Content-ID` values.

Shared files:

- [supabase/functions/_shared/emailInlineAssets.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/supabase/functions/_shared/emailInlineAssets.ts)
- [supabase/functions/_shared/emailMime.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/supabase/functions/_shared/emailMime.ts)
- [supabase/functions/_shared/emailTemplateChrome.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/supabase/functions/_shared/emailTemplateChrome.ts)

### 2. MIME structure

- Coins emails use `multipart/related`
- NDA email uses:
  - `multipart/related` when there is no PDF attachment
  - `multipart/mixed` with nested `multipart/related` when a PDF attachment exists

### 3. Link corrections

The coins CTA now points to:

- `https://hushhtech.com/onboarding/meet-ceo`

NDA admin and legal/support links remain absolute and production-safe.

### 4. NDA confidentiality

The NDA template includes the explicit sentence:

`Please keep this confidential.`

### 5. Dark mode hardening

The shared email document now includes:

- `color-scheme` meta tags
- `supported-color-schemes` meta tags
- explicit `bgcolor` attributes on major table containers

This does not guarantee identical rendering in every client, but it reduces unintended dark-mode inversion and helps preserve the intended black/white/gold system.

## Known Important Details

- Footer social links are still centralized in the shared renderer and can be updated later without changing each template independently.
- The implementation keeps the existing copy and visual structure intact unless a functional correction was required.
- PNG assets for problematic icons were regenerated and re-embedded to replace malformed base64 payloads.

## Verification Performed

Local verification:

- [tests/emailTemplateBuilders.test.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/tests/emailTemplateBuilders.test.ts)
- [tests/emailMime.test.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/tests/emailMime.test.ts)
- [tests/ndaNotification.test.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/tests/ndaNotification.test.ts)
- [tests/coinsCreditNotification.test.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/tests/coinsCreditNotification.test.ts)
- [tests/coinsDeductionNotification.test.ts](/Users/ankitkumar/Desktop/hushh_Tech_website/tests/coinsDeductionNotification.test.ts)

Production verification:

- fresh live emails were triggered after deploy
- Gmail message copies were inspected to confirm:
  - updated content
  - working CTA targets
  - updated NDA confidentiality copy
  - newly delivered post-deploy messages instead of older cached emails

## Deploy Notes

Supabase Edge Functions must be redeployed after any changes to:

- `_shared/emailInlineAssets.ts`
- `_shared/emailMime.ts`
- `_shared/emailTemplateChrome.ts`
- any template or notification index file

Deploy order used:

1. `nda-signed-notification`
2. `coins-credit-notification`
3. `coins-deduction-notification`
4. `vault-access-notification`

## Future Recommendation

If icon regressions happen again, validate the embedded PNG payload itself first, not only the HTML. A broken `cid:` reference and a malformed PNG can look identical in email clients.
