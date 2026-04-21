'use strict';

const fs = require('fs');

function parseFrontmatter(text) {
  // Normalize CRLF to LF for reliable parsing across platforms.
  const normalized = text.indexOf('\r') >= 0 ? text.replace(/\r\n?/g, '\n') : text;
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: null, body: text };
  }
  const nl = normalized.indexOf('\n');
  const rest = normalized.slice(nl + 1);
  const end = rest.search(/\n---\s*(?:\n|$)/);
  if (end === -1) return { frontmatter: null, body: text };
  const fmText = rest.slice(0, end);
  const bodyStart = rest.indexOf('\n', end + 1);
  const body = bodyStart === -1 ? '' : rest.slice(bodyStart + 1);
  return { frontmatter: parseSimpleYaml(fmText), body };
}

function parseSimpleYaml(yaml) {
  const out = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }
    const key = match[1];
    let value = match[2];
    if (value === '|' || value === '|-' || value === '>-' || value === '>') {
      i++;
      const buf = [];
      let baseIndent = null;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') {
          buf.push('');
          i++;
          continue;
        }
        const indent = l.match(/^(\s+)/);
        if (!indent) break;
        if (baseIndent === null) baseIndent = indent[1].length;
        if (indent[1].length < baseIndent) break;
        buf.push(l.slice(baseIndent));
        i++;
      }
      out[key] = buf.join(value.startsWith('>') ? ' ' : '\n').trim();
      continue;
    }
    out[key] = value.trim();
    i++;
  }
  return out;
}

function loadFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return parseFrontmatter(text);
}

module.exports = { parseFrontmatter, loadFrontmatter, parseSimpleYaml };
