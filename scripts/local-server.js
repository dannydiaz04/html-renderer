import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import handler from '../api/render.js';

loadEnvFile('.env.local');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
  req.query = queryObject(requestUrl.searchParams);

  const routePath = requestUrl.pathname.replace(/^\/+/, '');
  if (routePath && !Object.hasOwn(req.query, 'path')) {
    req.query.path = routePath;
  }

  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };

  res.send = (body) => {
    if (body === undefined || body === null) {
      res.end();
      return;
    }

    res.end(body);
  };

  await handler(req, res);
});

server.listen(port, host, () => {
  console.log(`html-renderer dev server listening on http://${host}:${port}`);
});

function queryObject(searchParams) {
  const query = {};

  for (const [key, value] of searchParams.entries()) {
    if (!Object.hasOwn(query, key)) {
      query[key] = value;
      continue;
    }

    query[key] = Array.isArray(query[key])
      ? [...query[key], value]
      : [query[key], value];
  }

  return query;
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || Object.hasOwn(process.env, key)) continue;

    process.env[key] = unquote(rawValue);
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
