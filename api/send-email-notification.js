 
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
 
const ALLOWED_EMAIL_TYPES = new Set(['profile_view', 'payment_received']);
 
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour per slug
 
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
 
function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
 
function isRateLimited(slug) {
  const now = Date.now();
  const entry = rateLimitStore.get(slug);
 
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(slug, { count: 1, windowStart: now });
    return false;
  }
 
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
 
  entry.count += 1;
  return false;
}
 
function isAuthorizedTestRequest(req) {
  const configuredSecret = typeof process.env.EMAIL_TEST_SECRET === 'string'
    ? process.env.EMAIL_TEST_SECRET.trim()
    : '';
 
  if (!configuredSecret) {
    return process.env.NODE_ENV !== 'production';
  }
 
  const providedSecret =
    typeof req.headers['x-email-test-secret'] === 'string'
      ? req.headers['x-email-test-secret'].trim()
      : '';
 
  return providedSecret === configuredSecret;
}
 
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are missing');
  }
 
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
 
async function resolvePublicProfileOwner(slug) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('investor_profiles')
    .select('email, name')
    .eq('slug', slug)
    .eq('is_public', true)
    .eq('user_confirmed', true)
    .maybeSingle();
 
  if (error) {
    throw new Error(`Failed to resolve profile owner: ${error.message}`);
  }
 
  if (!data?.email) {
    throw new Error('Public profile owner email not found');
  }
 
  if (!isValidEmail(data.email)) {
    throw new Error('Resolved profile owner email is not a valid email address');
  }
 
  return {
    email: data.email,
    name: data.name || 'Your Profile',
  };
}
 
function createTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
 
  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are required');
  }
 
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
}
 
function buildProfileViewEmail(slug, resolvedProfileName) {
  const viewTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
 
  const safeName = escapeHtml(resolvedProfileName);
  const safeSlug = escapeHtml(slug);
  const safeTime = escapeHtml(viewTime);
 
  return {
    subject: `👀 New Profile View - ${safeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A84FF;">👀 Someone is viewing your profile!</h2>
 
        <div style="background: #F8FAFC; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Profile:</strong> ${safeName}</p>
          <p style="margin: 8px 0;"><strong>Time:</strong> ${safeTime}</p>
          <p style="margin: 8px 0;"><strong>Visitor:</strong> Anonymous</p>
        </div>
 
        <a href="https://hushhtech.com/investor/${safeSlug}"
           style="display: inline-block; background: #0A84FF; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Your Profile →
        </a>
 
        <p style="color: #6B7280; font-size: 14px; margin-top: 32px;">
          Instant notification - someone is browsing your profile now.
        </p>
      </div>
    `,
  };
}
 
function buildPaymentReceivedEmail(slug, resolvedProfileName) {
  const paymentTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
 
  const safeName = escapeHtml(resolvedProfileName);
  const safeSlug = escapeHtml(slug);
  const safeTime = escapeHtml(paymentTime);
 
  return {
    subject: `💰 Payment Received - $1.00`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #34C759;">💰 Payment Received!</h2>
 
        <p style="font-size: 16px; color: #0B1120;">
          Great news! Someone just paid to unlock chat access.
        </p>
 
        <div style="background: #F0F9FF; border-left: 4px solid #0A84FF; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Amount:</strong> $1.00</p>
          <p style="margin: 8px 0;"><strong>Access:</strong> 30 minutes</p>
          <p style="margin: 8px 0;"><strong>Profile:</strong> ${safeName}</p>
          <p style="margin: 8px 0;"><strong>Time:</strong> ${safeTime}</p>
        </div>
 
        <a href="https://hushhtech.com/investor/${safeSlug}"
           style="display: inline-block; background: #34C759; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Your Profile →
        </a>
 
        <p style="color: #6B7280; font-size: 14px; margin-top: 32px;">
          Check your Stripe dashboard for payout details.
        </p>
      </div>
    `,
  };
}
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-email-test-secret');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { type, slug, profileOwnerEmail, profileName, testEmail } = req.body || {};
 
    if (testEmail) {
      if (!isAuthorizedTestRequest(req)) {
        return res.status(401).json({ error: 'Unauthorized: test emails require x-email-test-secret header' });
      }
 
      if (!isValidEmail(testEmail)) {
        return res.status(400).json({ error: 'Invalid testEmail address' });
      }
 
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Hushh Notifications" <${process.env.GMAIL_USER}>`,
        to: testEmail,
        subject: '🧪 Test Email from Hushh',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px;">
            <h2>✅ Email System Working!</h2>
            <p>This is a test email from your Hushh notification system.</p>
            <p><strong>Gmail:</strong> ${escapeHtml(process.env.GMAIL_USER)}</p>
            <p><strong>Time:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
            <p>If you receive this, email notifications are working! 🎉</p>
          </div>
        `,
      });
 
      return res.status(200).json({ success: true, message: 'Test email sent!' });
    }
 
    if (!type || !slug) {
      return res.status(400).json({ error: 'Missing required fields: type and slug' });
    }
 
    if (typeof slug !== 'string' || slug.trim().length === 0 || slug.length > 128) {
      return res.status(400).json({ error: 'Invalid slug' });
    }
 
    if (!ALLOWED_EMAIL_TYPES.has(type)) {
      return res.status(400).json({ error: `Unsupported email type: ${type}. Allowed: ${[...ALLOWED_EMAIL_TYPES].join(', ')}` });
    }
 
    if (isRateLimited(slug.trim())) {
      return res.status(429).json({ error: 'Too many notifications for this profile. Try again later.' });
    }
 
    const owner = await resolvePublicProfileOwner(slug.trim());
    const resolvedProfileName = profileName?.trim() || owner.name;
 
    let emailContent;
    if (type === 'profile_view') {
      emailContent = buildProfileViewEmail(slug.trim(), resolvedProfileName);
    } else if (type === 'payment_received') {
      emailContent = buildPaymentReceivedEmail(slug.trim(), resolvedProfileName);
    }
 
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Hushh Notifications" <${process.env.GMAIL_USER}>`,
      to: owner.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
 
    return res.status(200).json({ success: true, emailSent: true });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to send email',
    });
  }
}
 