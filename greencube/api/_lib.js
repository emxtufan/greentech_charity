import 'dotenv/config';
import {createHash, createHmac, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import path from 'node:path';

const APPLICATION_TYPES = new Set(['donation', 'volunteer', 'partner', 'contact', 'newsletter']);
const APPLICATION_STATUSES = new Set(['noua', 'in_lucru', 'contactata', 'finalizata', 'spam']);

const TYPE_FIELDS = {
  donation: new Set(['name', 'email', 'phone', 'frequency', 'amount', 'project', 'message', 'project_context', 'consent']),
  volunteer: new Set(['name', 'email', 'phone', 'city', 'skills', 'availability', 'message', 'project_context', 'consent']),
  partner: new Set(['organization', 'registration', 'name', 'role', 'email', 'phone', 'support', 'message', 'project_context', 'consent']),
  contact: new Set(['name', 'email', 'phone', 'subject', 'message', 'project_context', 'consent']),
  newsletter: new Set(['first_name', 'email', 'interest', 'consent'])
};

const REQUIRED_FIELDS = {
  donation: ['name', 'email', 'frequency', 'project', 'consent'],
  volunteer: ['name', 'email', 'phone', 'city', 'skills', 'availability', 'message', 'consent'],
  partner: ['organization', 'name', 'role', 'email', 'phone', 'support', 'message', 'consent'],
  contact: ['name', 'email', 'subject', 'message', 'consent'],
  newsletter: ['email', 'interest', 'consent']
};

const FIELD_OPTIONS = {
  donation: {
    frequency: new Set(['unica', 'lunara', 'materiale']),
    project: new Set(['prioritar', 'casa', 'energie', 'spatiu-verde'])
  },
  volunteer: {
    skills: new Set(['constructii', 'arhitectura', 'logistica', 'comunicare', 'sprijin-familie', 'alta']),
    availability: new Set(['ocazional', 'weekend', 'saptamanal', 'proiect'])
  },
  partner: {
    support: new Set(['financiar', 'materiale', 'servicii', 'voluntariat-corporate', 'comunicare', 'mixt'])
  },
  contact: {
    subject: new Set(['proiecte', 'donatie', 'voluntariat', 'parteneriat', 'presa', 'altul'])
  },
  newsletter: {
    interest: new Set(['toate', 'santier', 'impact', 'voluntariat', 'parteneriate'])
  }
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+() .-]{7,32}$/;
const SESSION_COOKIE = 'gt_admin_session';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
let mutationQueue = Promise.resolve();

export function apiHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

export function json(res, status, payload) {
  apiHeaders(res);
  return res.status(status).json(payload);
}

export function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body !== 'string' || !req.body.trim()) return {};
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export function serverConfig() {
  const adminUsername = String(process.env.ADMIN_USERNAME || '').trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  const sessionSecret = String(process.env.ADMIN_SESSION_SECRET || '');
  const hashSecret = String(process.env.SUBMISSION_HASH_SECRET || '');
  const configuredHashSecret = hashSecret.length >= 32 ? hashSecret : sessionSecret;
  const configuredPath = String(process.env.SUBMISSIONS_FILE || 'storage/form-submissions.json');
  const storageFile = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  return {
    adminUsername,
    adminPassword,
    sessionSecret,
    hashSecret: configuredHashSecret,
    storageFile,
    storageConfigured: Boolean(storageFile && configuredHashSecret.length >= 32),
    adminConfigured: Boolean(adminUsername && adminPassword.length >= 10 && sessionSecret.length >= 32)
  };
}

export function isSameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!forwardedHost) return false;
  try {
    return new URL(origin).host === forwardedHost;
  } catch {
    return false;
  }
}

export function normaliseApplication(body) {
  const type = String(body?.type || '').trim().toLowerCase();
  if (!APPLICATION_TYPES.has(type)) return {error: 'Tipul formularului nu este valid.'};
  const source = body?.data;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {error: 'Datele formularului nu sunt valide.'};
  if (typeof source.website === 'string' && source.website.trim()) return {honeypot: true};

  const sourcePage = normaliseSourcePage(source.page);
  const allowedFields = TYPE_FIELDS[type];
  const data = {};
  for (const [key, rawValue] of Object.entries(source)) {
    if (!allowedFields.has(key) || rawValue == null) continue;
    if (key === 'consent') {
      data.consent = rawValue === true || rawValue === 'true' || rawValue === 'on' || rawValue === '1';
      continue;
    }
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') return {error: 'Datele formularului nu sunt valide.'};
    data[key] = String(rawValue).trim().slice(0, key === 'message' ? 4000 : 320);
  }

  for (const field of REQUIRED_FIELDS[type]) {
    if (field === 'consent' ? data.consent !== true : !String(data[field] || '').trim()) {
      return {error: 'Completeaza toate campurile obligatorii.'};
    }
  }
  if (!EMAIL_PATTERN.test(String(data.email || ''))) return {error: 'Adresa de e-mail nu este valida.'};
  if (data.name && data.name.length < 2) return {error: 'Numele introdus este prea scurt.'};
  for (const field of ['first_name', 'organization', 'role', 'city']) {
    if (data[field] && data[field].length < 2) return {error: 'Unul dintre raspunsuri este prea scurt.'};
  }
  const minimumMessageLength = type === 'partner' ? 30 : (type === 'volunteer' || type === 'contact' ? 20 : 0);
  if (minimumMessageLength && String(data.message || '').length < minimumMessageLength) return {error: 'Mesajul introdus este prea scurt.'};
  if (data.phone && !PHONE_PATTERN.test(data.phone)) return {error: 'Numarul de telefon nu este valid.'};
  for (const [field, allowedValues] of Object.entries(FIELD_OPTIONS[type] || {})) {
    if (!allowedValues.has(String(data[field] || ''))) return {error: 'Una dintre optiunile selectate nu este valida.'};
  }
  if (type === 'donation' && data.frequency !== 'materiale') {
    const amount = Number(String(data.amount || '').replace(',', '.'));
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(String(data.amount || '')) || !Number.isFinite(amount) || amount < 10 || amount > 10_000_000) {
      return {error: 'Valoarea donatiei nu este valida.'};
    }
  }

  data.consent_at = new Date().toISOString();
  data.consent_version = '2026-08-27';
  return {type, data, sourcePage};
}

function normaliseSourcePage(value) {
  const raw = String(value || '').trim().slice(0, 1000);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return `${url.origin}${url.pathname}`.slice(0, 1000);
  } catch {
    return raw.split(/[?#]/, 1)[0].slice(0, 1000);
  }
}

export function requestFingerprint(req) {
  const config = serverConfig();
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || req.socket?.remoteAddress || '';
  if (!address || !config.hashSecret) return '';
  return createHmac('sha256', config.hashSecret)
    .update(`${new Date().toISOString().slice(0, 10)}|${address}`)
    .digest('hex');
}

async function readStore() {
  const {storageFile} = serverConfig();
  await mutationQueue;
  try {
    const parsed = JSON.parse(await readFile(storageFile, 'utf8'));
    if (!parsed || !Array.isArray(parsed.items)) throw new Error('invalid-store-shape');
    return parsed.items;
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    const failure = new Error('Fisierul de cereri nu poate fi citit.');
    failure.code = 'STORE_READ_FAILED';
    throw failure;
  }
}

async function writeStore(items) {
  const {storageFile} = serverConfig();
  await mkdir(path.dirname(storageFile), {recursive: true});
  const temporaryFile = `${storageFile}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify({version: 1, items}, null, 2)}\n`, {encoding: 'utf8', mode: 0o600});
  await rename(temporaryFile, storageFile);
}

function mutateStore(mutator) {
  const operation = mutationQueue.then(async () => {
    let items;
    try {
      const parsed = JSON.parse(await readFile(serverConfig().storageFile, 'utf8'));
      if (!parsed || !Array.isArray(parsed.items)) throw new Error('invalid-store-shape');
      items = parsed.items;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      items = [];
    }
    const result = await mutator(items);
    await writeStore(items);
    return result;
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

function publicRecord(record) {
  const {request_hash: _requestHash, ...safeRecord} = record;
  return safeRecord;
}

function createReference(items) {
  const day = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  let reference;
  do reference = `GT-${day}-${randomBytes(6).toString('hex').toUpperCase()}`;
  while (items.some((item) => item.reference === reference));
  return reference;
}

export async function createSubmission(application, fingerprint) {
  return mutateStore((items) => {
    const now = new Date();
    const recentCount = fingerprint
      ? items.filter((item) => item.request_hash === fingerprint && now.getTime() - new Date(item.created_at).getTime() <= RATE_LIMIT_WINDOW_MS).length
      : 0;
    if (recentCount >= RATE_LIMIT_MAX) {
      const error = new Error('rate_limit_exceeded');
      error.code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }
    const record = {
      id: randomUUID(),
      reference: createReference(items),
      type: application.type,
      data: application.data,
      status: 'noua',
      notes: '',
      source_page: application.sourcePage || '',
      request_hash: fingerprint || '',
      email_status: 'pending',
      email_error: '',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    items.push(record);
    return publicRecord(record);
  });
}

export async function updateSubmissionEmailStatus(id, status, errorCode = '') {
  return mutateStore((items) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return null;
    item.email_status = status === 'sent' ? 'sent' : 'failed';
    item.email_error = status === 'sent' ? '' : String(errorCode || 'SMTP_SEND_FAILED').slice(0, 80);
    item.email_updated_at = new Date().toISOString();
    item.updated_at = item.email_updated_at;
    return publicRecord(item);
  });
}

export async function listSubmissions() {
  const items = await readStore();
  return items.map(publicRecord).sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export async function updateSubmission(id, status, notes) {
  return mutateStore((items) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return null;
    item.status = status;
    item.notes = notes;
    item.updated_at = new Date().toISOString();
    return publicRecord(item);
  });
}

export function isApplicationStatus(value) {
  return APPLICATION_STATUSES.has(String(value || ''));
}

export function applicationStats(items) {
  const stats = {total: items.length, noua: 0, in_lucru: 0, contactata: 0, finalizata: 0, spam: 0};
  for (const item of items) if (Object.prototype.hasOwnProperty.call(stats, item.status)) stats[item.status] += 1;
  return stats;
}

function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

function safeEqual(left, right) {
  return timingSafeEqual(digest(left), digest(right));
}

export function credentialsAreValid(username, password) {
  const config = serverConfig();
  return config.adminConfigured && safeEqual(username, config.adminUsername) && safeEqual(password, config.adminPassword);
}

function signSession(encodedPayload, secret) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function secureRequest(req) {
  return Boolean(req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https');
}

export function createSessionCookie(req) {
  const config = serverConfig();
  const now = Math.floor(Date.now() / 1000);
  const encodedPayload = Buffer.from(JSON.stringify({sub: config.adminUsername, iat: now, exp: now + SESSION_MAX_AGE_SECONDS})).toString('base64url');
  const token = `${encodedPayload}.${signSession(encodedPayload, config.sessionSecret)}`;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureRequest(req) ? '; Secure' : ''}`;
}

export function clearSessionCookie(req) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureRequest(req) ? '; Secure' : ''}`;
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

export function authenticatedAdmin(req) {
  const config = serverConfig();
  if (!config.adminConfigured) return null;
  const [encodedPayload, suppliedSignature] = readCookie(req, SESSION_COOKIE).split('.');
  if (!encodedPayload || !suppliedSignature) return null;
  if (!safeEqual(suppliedSignature, signSession(encodedPayload, config.sessionSecret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.sub !== config.adminUsername || !Number.isFinite(payload.exp) || payload.exp <= now) return null;
    return {username: config.adminUsername};
  } catch {
    return null;
  }
}

export {APPLICATION_TYPES, APPLICATION_STATUSES};
