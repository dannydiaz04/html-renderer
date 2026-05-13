import { google } from 'googleapis';

let cachedDrive = null;

export function drive() {
  if (cachedDrive) return cachedDrive;

  const encodedCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!encodedCredentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON_B64 is not set');
  }

  let credentials;
  try {
    credentials = JSON.parse(Buffer.from(encodedCredentials, 'base64').toString('utf8'));
  } catch (err) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON_B64 is not valid base64 JSON: ${err.message}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  cachedDrive = google.drive({ version: 'v3', auth });
  return cachedDrive;
}

export async function listHtml(folderId, { limit = 50 } = {}) {
  const { data } = await drive().files.list({
    q: `'${escapeDriveQueryValue(folderId)}' in parents and mimeType='text/html' and trashed=false`,
    orderBy: 'modifiedTime desc',
    pageSize: limit,
    fields: 'files(id, name, modifiedTime, size)',
  });

  return data.files || [];
}

export async function findByName(folderId, name) {
  const { data } = await drive().files.list({
    q: `'${escapeDriveQueryValue(folderId)}' in parents and name='${escapeDriveQueryValue(name)}' and trashed=false`,
    orderBy: 'modifiedTime desc',
    pageSize: 1,
    fields: 'files(id, name, modifiedTime, size)',
  });

  return data.files?.[0] || null;
}

export async function fetchFileContent(fileId) {
  const response = await drive().files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data);
}

function escapeDriveQueryValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
