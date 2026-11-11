import {
  applicationStats,
  authenticatedAdmin,
  clearSessionCookie,
  createSessionCookie,
  credentialsAreValid,
  isApplicationStatus,
  isSameOrigin,
  json,
  listSubmissions,
  parseBody,
  serverConfig,
  updateSubmission
} from './_lib.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

function wantsPublicConfig(req) {
  return req.method === 'GET' && String(req.query?.config || '') === '1';
}

function requesterAddress(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'necunoscuta';
}

function loginState(req) {
  const key = requesterAddress(req);
  const now = Date.now();
  const previous = loginAttempts.get(key);
  const state = !previous || previous.resetAt <= now
    ? {count: 0, resetAt: now + LOGIN_WINDOW_MS}
    : previous;
  loginAttempts.set(key, state);

  if (loginAttempts.size > 500) {
    for (const [candidate, value] of loginAttempts) {
      if (value.resetAt <= now) loginAttempts.delete(candidate);
    }
  }
  return state;
}

async function handleLogin(req, res, body) {
  const config = serverConfig();
  if (!config.adminConfigured || !config.storageConfigured) {
    return json(res, 503, {error: 'Administrarea nu este configurata in fisierul .env.'});
  }

  const state = loginState(req);
  if (state.count >= LOGIN_MAX_ATTEMPTS) {
    return json(res, 429, {error: 'Prea multe incercari. Incearca din nou peste cateva minute.'});
  }

  const username = String(body.username || '').trim().slice(0, 160);
  const password = String(body.password || '').slice(0, 500);
  if (!credentialsAreValid(username, password)) {
    state.count += 1;
    return json(res, 401, {error: 'Utilizatorul sau parola nu sunt corecte.'});
  }

  loginAttempts.delete(requesterAddress(req));
  res.setHeader('Set-Cookie', createSessionCookie(req));
  return json(res, 200, {admin: {username: config.adminUsername}});
}

async function handlePost(req, res) {
  const body = parseBody(req);
  if (JSON.stringify(body).length > 50_000) {
    return json(res, 413, {error: 'Cererea este prea mare.'});
  }

  const action = String(body.action || '');
  if (action === 'login') return handleLogin(req, res, body);
  if (action === 'logout') {
    res.setHeader('Set-Cookie', clearSessionCookie(req));
    return json(res, 200, {ok: true});
  }
  return json(res, 400, {error: 'Actiunea nu este valida.'});
}

async function listApplications(res, admin) {
  const items = await listSubmissions();
  return json(res, 200, {
    items,
    stats: applicationStats(items),
    admin: {username: admin.username}
  });
}

async function updateApplication(req, res) {
  const body = parseBody(req);
  const id = String(body.id || '');
  const status = String(body.status || '');
  const notes = String(body.notes || '').trim().slice(0, 4000);

  if (!UUID_PATTERN.test(id) || !isApplicationStatus(status)) {
    return json(res, 400, {error: 'Actualizarea nu este valida.'});
  }

  const item = await updateSubmission(id, status, notes);
  if (!item) return json(res, 404, {error: 'Cererea nu a fost gasita.'});
  return json(res, 200, {item});
}

export default async function handler(req, res) {
  if (wantsPublicConfig(req)) {
    const config = serverConfig();
    return json(res, 200, {configured: config.adminConfigured && config.storageConfigured});
  }

  if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH');
    return json(res, 405, {error: 'Metoda nu este permisa.'});
  }

  if (!isSameOrigin(req)) {
    return json(res, 403, {error: 'Originea cererii nu este permisa.'});
  }

  if (req.method === 'POST') return handlePost(req, res);

  const config = serverConfig();
  if (!config.adminConfigured || !config.storageConfigured) {
    return json(res, 503, {error: 'Administrarea nu este configurata.'});
  }

  const admin = authenticatedAdmin(req);
  if (!admin) return json(res, 401, {error: 'Autentificarea este necesara.'});

  try {
    if (req.method === 'GET') return await listApplications(res, admin);
    return await updateApplication(req, res);
  } catch (error) {
    console.error('Admin API failed', {code: error?.code});
    return json(res, 500, {error: 'Datele nu au putut fi incarcate.'});
  }
}
