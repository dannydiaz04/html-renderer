import { findByName, fetchFileContent, listHtml } from '../lib/drive.js';
import { validateHtmlContent } from '../lib/validateHtml.js';

const FOLDER_ID = process.env.HOMEWORK_FOLDER_ID;
const KEY = process.env.RENDER_KEY;

export default async function handler(req, res) {
  try {
    if (!isAuthorized(req)) {
      return sendText(res, 401, 'Unauthorized');
    }

    if (!FOLDER_ID) {
      return serverError(res, new Error('HOMEWORK_FOLDER_ID is not set'));
    }

    const routePath = getRoutePath(req);

    if (!routePath || routePath === 'latest') {
      return renderLatest(res, req);
    }

    if (routePath === 'list') {
      return renderList(res, req);
    }

    if (routePath.startsWith('raw/')) {
      return renderRaw(res, routePath.slice(4));
    }

    return renderNamedFile(res, req, routePath);
  } catch (err) {
    return serverError(res, err);
  }
}

async function renderLatest(res, req) {
  const files = await listHtml(FOLDER_ID, { limit: 1 });
  if (!files.length) {
    return notFound(res, 'No HTML files found in the configured Drive folder');
  }

  return renderFile(res, req, files[0]);
}

async function renderList(res, req) {
  const files = await listHtml(FOLDER_ID, { limit: 100 });
  const keySuffix = queryKeySuffix(req);
  const rows = files
    .map((file) => {
      const href = `/${encodeURIComponent(file.name)}${keySuffix}`;
      const modified = file.modifiedTime ? escapeHtml(file.modifiedTime) : 'unknown';
      return `<li><a href="${href}">${escapeHtml(file.name)}</a> <small>${modified}</small></li>`;
    })
    .join('\n');

  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Homework Output</title>
  <style>
    body { font: 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.75rem; margin-bottom: 1rem; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.45rem 0; }
    small { color: #68707d; margin-left: 0.4rem; }
    a { color: #0a58d4; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Homework Output</h1>
  <ul>${rows || '<li><em>No HTML files found.</em></li>'}</ul>
</body>
</html>`;

  return sendHtml(res, 200, body);
}

async function renderRaw(res, name) {
  if (!name) {
    return notFound(res, 'Missing raw file name');
  }

  const file = await findByName(FOLDER_ID, name);
  if (!file) {
    return notFound(res, `Not found: ${name}`);
  }

  const body = await fetchFileContent(file.id);
  return sendText(res, 200, body);
}

async function renderNamedFile(res, req, name) {
  const file = await findByName(FOLDER_ID, name);
  if (!file) {
    return notFound(res, `Not found: ${name}`);
  }

  return renderFile(res, req, file);
}

async function renderFile(res, req, file) {
  const body = await fetchFileContent(file.id);
  const validation = validateHtmlContent(body);

  if (!validation.ok) {
    return sendValidationWarning(res, req, file.name, validation);
  }

  return sendHtml(res, 200, body);
}

function isAuthorized(req) {
  if (!KEY) return true;
  return getQueryValue(req.query?.k) === KEY || getHeaderValue(req, 'x-render-key') === KEY;
}

function getRoutePath(req) {
  const rawPath = getQueryValue(req.query?.path) || '';
  const path = safeDecode(rawPath).replace(/^\/+/, '');
  return path || 'latest';
}

function getQueryValue(value) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function getHeaderValue(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function queryKeySuffix(req) {
  const queryKey = getQueryValue(req.query?.k);
  return KEY && queryKey ? `?k=${encodeURIComponent(queryKey)}` : '';
}

function sendValidationWarning(res, req, fileName, validation) {
  const keySuffix = queryKeySuffix(req);
  const rawHref = `/raw/${encodeURIComponent(fileName)}${keySuffix}`;
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HTML Validation Warning</title>
  <style>
    body { font: 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { color: #9a3412; font-size: 1.6rem; }
    code { background: #f4f4f5; border-radius: 4px; padding: 0.1rem 0.25rem; }
    a { color: #0a58d4; }
  </style>
</head>
<body>
  <h1>HTML Validation Warning</h1>
  <p><code>${escapeHtml(fileName)}</code> was not rendered because it looks like invalid LLM output.</p>
  <p>${escapeHtml(validation.message)}</p>
  <p><a href="${rawHref}">View raw source</a></p>
</body>
</html>`;

  return sendHtml(res, 422, body);
}

function sendHtml(res, status, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(body);
}

function sendText(res, status, body) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(body);
}

function notFound(res, message) {
  return sendText(res, 404, message);
}

function serverError(res, err) {
  console.error(err);
  return sendText(res, 500, `Server error: ${err?.message || 'unknown'}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
