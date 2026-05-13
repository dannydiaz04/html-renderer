# html-renderer

A small Vercel service that renders self-contained HTML files from a Google Drive folder. It is meant for workflows where an LLM saves homework or notes as `.html` files into Drive, then you open a short URL from any device.

## Routes

- `/` and `/latest` render the most recently modified HTML file.
- `/list` shows the available HTML files.
- `/<filename>` renders a specific file.
- `/raw/<filename>` returns the source as `text/plain`.

If `RENDER_KEY` is set, every route requires `?k=<RENDER_KEY>` or an `x-render-key` header.

## Environment

Copy `.env.example` to `.env.local` after the Google setup is complete:

```text
GOOGLE_SERVICE_ACCOUNT_JSON_B64=
HOMEWORK_FOLDER_ID=
RENDER_KEY=
```

`GOOGLE_SERVICE_ACCOUNT_JSON_B64` is a base64-encoded Google service account JSON key. Share the target Drive folder with the service account email as a Viewer, then use the folder ID as `HOMEWORK_FOLDER_ID`.

## Development

```bash
npm.cmd install
npm.cmd run check
npm.cmd test
npx.cmd vercel dev
```

PowerShell may block `npm.ps1` on Windows, so use `npm.cmd` and `npx.cmd`.

## Deployment

Set the same three environment variables in Vercel for Production, Preview, and Development, then deploy:

```bash
npm.cmd run deploy
```

The app uses `Cache-Control: no-store` and validates rendered HTML. If a file is empty, wrapped in markdown fences, or does not start with `<!DOCTYPE html>`, render routes return a `422` warning page. `/raw/<filename>` remains available for inspection.
