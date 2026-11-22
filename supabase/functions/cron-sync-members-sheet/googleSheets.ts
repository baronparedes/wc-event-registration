export interface GoogleSheetsConfig {
  serviceAccountEmail: string;
  privateKeyPem: string;
  spreadsheetId: string;
  sheetGid?: number;
}

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeJson(payload: Record<string, unknown>): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
}

export function pemToPkcs8Buffer(pem: string): ArrayBuffer {
  const normalizedPem = pem.replace(/\\n/g, '\n').trim();
  const base64Body = normalizedPem
    .replace(/-----BEGIN [A-Z0-9 ]+-----/g, '')
    .replace(/-----END [A-Z0-9 ]+-----/g, '')
    .replace(/\s+/g, '');

  if (!base64Body) {
    throw new Error('Google Service Account private key is empty or invalid.');
  }

  const binary = atob(base64Body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function createServiceAccountJwt(
  serviceAccountEmail: string,
  privateKeyPem: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
  const claimSet = base64UrlEncodeJson({
    iss: serviceAccountEmail,
    scope: GOOGLE_SHEETS_READONLY_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  });

  const unsignedToken = `${header}.${claimSet}`;
  const keyBuffer = pemToPkcs8Buffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const signature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
  return `${unsignedToken}.${signature}`;
}

export async function fetchGoogleAccessToken(
  serviceAccountEmail: string,
  privateKeyPem: string,
): Promise<string> {
  const assertion = await createServiceAccountJwt(serviceAccountEmail, privateKeyPem);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Google OAuth token exchange failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as { access_token?: unknown };
  if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
    throw new Error('Google OAuth token response did not include an access_token.');
  }

  return data.access_token;
}

interface SpreadsheetMetadataResponse {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

function quoteA1SheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export async function resolveSheetTitle(
  spreadsheetId: string,
  accessToken: string,
  sheetGid?: number,
): Promise<string> {
  const metadataUrl =
    `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}` +
    `?fields=sheets.properties(sheetId,title)`;

  const response = await fetch(metadataUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Google Sheets metadata fetch failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const metadata = (await response.json()) as SpreadsheetMetadataResponse;
  const sheets = metadata.sheets ?? [];

  if (sheets.length === 0) {
    throw new Error('Google Spreadsheet contains no tabs.');
  }

  if (sheetGid !== undefined) {
    const matched = sheets.find((sheet) => sheet.properties?.sheetId === sheetGid);
    const title = matched?.properties?.title?.trim();
    if (!title) {
      throw new Error(`No tab found in Google Spreadsheet with gid=${sheetGid}.`);
    }
    return title;
  }

  const firstTitle = sheets[0]?.properties?.title?.trim();
  if (!firstTitle) {
    throw new Error('First tab in Google Spreadsheet has no title.');
  }
  return firstTitle;
}

export async function fetchSheetValues(config: GoogleSheetsConfig): Promise<string[][]> {
  const accessToken = await fetchGoogleAccessToken(
    config.serviceAccountEmail,
    config.privateKeyPem,
  );

  const sheetTitle = await resolveSheetTitle(config.spreadsheetId, accessToken, config.sheetGid);
  const fullTabRange = quoteA1SheetTitle(sheetTitle);

  const url =
    `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(config.spreadsheetId)}` +
    `/values/${encodeURIComponent(fullTabRange)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google Sheets API fetch failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as { values?: unknown };
  if (!Array.isArray(data.values)) {
    return [];
  }

  return data.values.map((row) =>
    Array.isArray(row)
      ? row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
      : [],
  );
}
