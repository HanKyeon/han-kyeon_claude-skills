'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { version: PKG_VERSION, name: PKG_NAME } = require('../package.json');

const MANIFEST_FILE = '.cfh-manifest.json';

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === MANIFEST_FILE) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function hashUnit(unitPath) {
  const stat = fs.statSync(unitPath);
  if (stat.isFile()) {
    return { files: { [path.basename(unitPath)]: sha256File(unitPath) } };
  }
  const files = {};
  for (const full of walk(unitPath)) {
    const rel = path.relative(unitPath, full).split(path.sep).join('/');
    files[rel] = sha256File(full);
  }
  return { files };
}

function merkle(files) {
  const keys = Object.keys(files).sort();
  const canonical = keys.map((k) => `${k}:${files[k]}`).join('\n');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

async function writeManifest(unitPath, { kind, name }) {
  const { files } = hashUnit(unitPath);
  const manifest = {
    source: PKG_NAME,
    version: PKG_VERSION,
    kind,
    name,
    installedAt: new Date().toISOString(),
    merkle: merkle(files),
    files,
  };
  const target =
    fs.statSync(unitPath).isFile()
      ? path.join(path.dirname(unitPath), `.${path.basename(unitPath)}.cfh.json`)
      : path.join(unitPath, MANIFEST_FILE);
  await fsp.writeFile(target, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return target;
}

function manifestPath(unitPath) {
  if (!fs.existsSync(unitPath)) return null;
  const stat = fs.statSync(unitPath);
  if (stat.isFile()) {
    return path.join(path.dirname(unitPath), `.${path.basename(unitPath)}.cfh.json`);
  }
  return path.join(unitPath, MANIFEST_FILE);
}

function readManifest(unitPath) {
  const mp = manifestPath(unitPath);
  if (!mp || !fs.existsSync(mp)) return null;
  try {
    return JSON.parse(fs.readFileSync(mp, 'utf8'));
  } catch {
    return null;
  }
}

function isManaged(unitPath) {
  return readManifest(unitPath) !== null;
}

function isModified(unitPath) {
  const m = readManifest(unitPath);
  if (!m) return false;
  const { files } = hashUnit(unitPath);
  return merkle(files) !== m.merkle;
}

async function removeManifest(unitPath) {
  const mp = manifestPath(unitPath);
  if (mp && fs.existsSync(mp)) await fsp.rm(mp, { force: true });
}

module.exports = {
  MANIFEST_FILE,
  writeManifest,
  readManifest,
  isManaged,
  isModified,
  removeManifest,
};
