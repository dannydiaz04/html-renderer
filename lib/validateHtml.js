const DOCTYPE_RE = /^<!doctype\s+html\s*>/i;

export function validateHtmlContent(content) {
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content ?? '');
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  if (!withoutBom.trim()) {
    return invalid('empty', 'The file is empty.');
  }

  if (withoutBom.trimStart().startsWith('```')) {
    return invalid('markdown-fence', 'The file starts with a markdown code fence. Save only raw HTML.');
  }

  if (!DOCTYPE_RE.test(withoutBom)) {
    return invalid('missing-doctype', 'The file must start with <!DOCTYPE html> on the first line.');
  }

  return { ok: true };
}

function invalid(reason, message) {
  return { ok: false, reason, message };
}
