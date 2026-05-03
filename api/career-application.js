const REQUIRED_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'collegeEmail',
  'officialEmail',
  'phone',
  'resumeLink',
  'college',
];

const ALLOWED_COLLEGES = new Set(['LPU', 'MIT']);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const parseRequestBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }
  return body;
};
const isValidUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    const REDIRECT_PATHS = ['/url', '/redirect', '/l', '/link'];
    if (REDIRECT_PATHS.some(p => path === p || path.startsWith(p + '/'))) return false;

    const REDIRECT_PARAMS = ['q', 'url', 'redirect', 'next', 'goto', 'return'];
    if (REDIRECT_PARAMS.some(p => {
      const val = (parsed.searchParams.get(p) || '').toLowerCase();
      return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('//');
    })) return false;

    const isGoogle = hostname === 'docs.google.com' || hostname === 'drive.google.com';
    const isDropbox = hostname === 'www.dropbox.com' || hostname === 'dropbox.com';
    const isAws = hostname.endsWith('.amazonaws.com');
    const isAzure = hostname.endsWith('.windows.net');
    const isSharepoint = hostname.endsWith('.sharepoint.com');
    const isHushh = hostname === 'hushhtech.com' || hostname.endsWith('.hushhtech.com');

    const isTrustedHost = isGoogle || isDropbox || isAws || isAzure || isSharepoint || isHushh;

    const hasDocExtension = path.endsWith('.pdf') ||
                            path.endsWith('.doc') ||
                            path.endsWith('.docx');

    const isNotRoot = path.length > 1;
    const isNotForm = !path.includes('/forms/');

    return isTrustedHost && isNotRoot && isNotForm && (hasDocExtension || isGoogle || isDropbox);
  } catch {
    return false;
  }
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = parseRequestBody(request.body);
    const sanitized = {
      firstName: sanitizeString(payload.firstName),
      lastName: sanitizeString(payload.lastName),
      email: sanitizeString(payload.email),
      collegeEmail: sanitizeString(payload.collegeEmail),
      officialEmail: sanitizeString(payload.officialEmail),
      phone: sanitizeString(payload.phone),
      resumeLink: sanitizeString(payload.resumeLink),
      college: sanitizeString(payload.college),
      collegeValue: sanitizeString(payload.collegeValue || payload.college),
      jobTitle: sanitizeString(payload.jobTitle),
      jobLocation: sanitizeString(payload.jobLocation),
      submittedAt: sanitizeString(payload.submittedAt),
    };

    const missingField = REQUIRED_FIELDS.find((field) => !sanitized[field]);
    if (missingField) {
      return response.status(400).json({ error: `Missing required field: ${missingField}` });
    }

    if (!ALLOWED_COLLEGES.has(sanitized.collegeValue)) {
      return response.status(400).json({ error: 'Invalid college selection' });
    }

    if (!isValidUrl(sanitized.resumeLink)) {
      return response.status(400).json({ error: 'Invalid resume link. Please provide a direct link to a PDF or Word document.' });
    }

    const submittedAt = sanitized.submittedAt || new Date().toISOString();
    const appsScriptUrl = sanitizeString(process.env.GOOGLE_APPS_SCRIPT_URL);

    if (!appsScriptUrl) {
      throw new Error('Missing GOOGLE_APPS_SCRIPT_URL');
    }

    const scriptResponse = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sanitized, submittedAt }),
    });

    const responseText = await scriptResponse.text();
    let scriptResult;

    try {
      scriptResult = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn('Unable to parse Apps Script response as JSON:', parseError);
    }

    const scriptSucceeded = scriptResponse.ok && (scriptResult?.success ?? true);

    if (!scriptSucceeded) {
      const message = scriptResult?.error || scriptResult?.message || (!scriptResponse.ok ? responseText : '') || 'Apps Script request failed';
      throw new Error(message);
    }

    return response.status(200).json({
      success: true,
      message: 'Application received and saved',
      data: { ...sanitized, submittedAt, appsScript: scriptResult },
    });
  } catch (error) {
    console.error('Error processing application:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return response.status(500).json({ error: 'Internal server error', message });
  }
}