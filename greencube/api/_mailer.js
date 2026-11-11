import nodemailer from 'nodemailer';

const TYPE_LABELS = {
  donation: 'Donatie',
  volunteer: 'Voluntariat',
  partner: 'Parteneriat',
  contact: 'Contact',
  newsletter: 'Newsletter'
};

const FIELD_LABELS = {
  name: 'Nume complet',
  first_name: 'Prenume',
  email: 'E-mail',
  phone: 'Telefon',
  organization: 'Organizatie / companie',
  registration: 'CUI / cod de inregistrare',
  role: 'Rol in organizatie',
  frequency: 'Tipul contributiei',
  amount: 'Valoare estimata (RON)',
  project: 'Directia sprijinului',
  city: 'Localitate',
  skills: 'Aria de implicare',
  availability: 'Disponibilitate',
  support: 'Tipul parteneriatului',
  subject: 'Directia solicitarii',
  interest: 'Interes principal',
  message: 'Mesaj / detalii',
  project_context: 'Context proiect',
  consent: 'Acord prelucrare date',
  consent_at: 'Data acordului',
  consent_version: 'Versiune acord'
};

const VALUE_LABELS = {
  unica: 'Donatie unica',
  lunara: 'Donatie lunara',
  materiale: 'Materiale sau servicii',
  prioritar: 'Etapa prioritara',
  casa: 'Constructia caminului',
  energie: 'Eficienta energetica',
  'spatiu-verde': 'Spatiu verde si sigur',
  constructii: 'Constructii si amenajari',
  arhitectura: 'Arhitectura si proiectare',
  logistica: 'Logistica si organizare',
  comunicare: 'Comunicare si continut',
  'sprijin-familie': 'Sprijin pentru familie',
  alta: 'Alta competenta',
  ocazional: 'Ocazional',
  weekend: 'In weekend',
  saptamanal: 'Saptamanal',
  proiect: 'Pe durata unui proiect',
  financiar: 'Finantare',
  servicii: 'Servicii profesionale',
  'voluntariat-corporate': 'Voluntariat corporate',
  mixt: 'Parteneriat mixt',
  proiecte: 'Sprijin pentru o familie',
  donatie: 'Donatie',
  voluntariat: 'Voluntariat',
  parteneriat: 'Parteneriat',
  presa: 'Presa si comunicare',
  altul: 'Alta solicitare',
  toate: 'Toate proiectele',
  santier: 'Etapele de santier',
  impact: 'Impact si transparenta',
  parteneriate: 'Parteneriate si resurse'
};

const FIELD_VALUE_LABELS = {
  'frequency:materiale': 'Donatie de materiale sau servicii',
  'support:materiale': 'Materiale si echipamente',
  'support:comunicare': 'Comunicare si vizibilitate'
};

let transporter;
let transporterKey = '';

function envBoolean(value, fallback = false) {
  const normalised = String(value ?? '').trim().toLowerCase();
  if (!normalised) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalised);
}

function envNumber(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function smtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = envNumber(process.env.SMTP_PORT, 25, 1, 65535);
  const secure = envBoolean(process.env.SMTP_SECURE, port === 465);
  const user = String(process.env.SMTP_USER || '').trim();
  const password = String(process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '');
  const fromEmail = String(process.env.SMTP_FROM_EMAIL || user).trim();
  const fromName = String(process.env.SMTP_FROM_NAME || 'GREENTECH Charity').trim();
  const recipients = String(process.env.SMTP_TO || user)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const requireTLS = envBoolean(process.env.SMTP_REQUIRE_TLS, !secure);
  const connectionTimeout = envNumber(process.env.SMTP_CONNECTION_TIMEOUT_MS, 12_000, 1_000, 60_000);

  return {
    host,
    port,
    secure,
    requireTLS,
    user,
    password,
    fromEmail,
    fromName,
    recipients,
    connectionTimeout,
    configured: Boolean(host && user && password && fromEmail && recipients.length)
  };
}

export function smtpIsConfigured() {
  return smtpConfig().configured;
}

function getTransporter(config) {
  const key = [config.host, config.port, config.secure, config.requireTLS, config.user, config.password, config.connectionTimeout].join('|');
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS,
      auth: {user: config.user, pass: config.password},
      connectionTimeout: config.connectionTimeout,
      greetingTimeout: config.connectionTimeout,
      socketTimeout: Math.max(config.connectionTimeout * 2, 20_000),
      tls: {minVersion: 'TLSv1.2'}
    });
    transporterKey = key;
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function displayValue(key, value) {
  if (key === 'consent') return value === true ? 'Confirmat' : 'Neconfirmat';
  if (FIELD_VALUE_LABELS[`${key}:${value}`]) return FIELD_VALUE_LABELS[`${key}:${value}`];
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  return String(value ?? '').trim();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Bucharest'
  }).format(date);
}

function identityFor(application) {
  return application.data.organization || application.data.name || application.data.first_name || application.data.email || 'Solicitant';
}

function orderedEntries(data) {
  const order = Object.keys(FIELD_LABELS);
  return Object.entries(data)
    .filter(([key, value]) => FIELD_LABELS[key] && value !== '' && value != null)
    .sort(([left], [right]) => order.indexOf(left) - order.indexOf(right));
}

function detailRows(entries) {
  return entries.map(([key, rawValue], index) => {
    const value = key === 'consent_at' ? formatDate(rawValue) : displayValue(key, rawValue);
    const renderedValue = escapeHtml(value).replaceAll('\n', '<br>');
    const background = index % 2 === 0 ? '#f7f5eb' : '#ffffff';
    return `
      <tr>
        <td style="width:34%;padding:14px 16px;background:${background};border-bottom:1px solid #dfe4d7;color:#5b6b60;font:600 12px/1.45 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;vertical-align:top;">${escapeHtml(FIELD_LABELS[key])}</td>
        <td style="padding:14px 16px;background:${background};border-bottom:1px solid #dfe4d7;color:#173b28;font:400 15px/1.55 Arial,sans-serif;vertical-align:top;word-break:break-word;">${renderedValue}</td>
      </tr>`;
  }).join('');
}

export function createSubmissionMessage(application, saved, config = smtpConfig()) {
  const typeLabel = TYPE_LABELS[application.type] || 'Solicitare';
  const identity = safeHeader(identityFor(application)).slice(0, 90);
  const reference = safeHeader(saved.reference || saved.id || 'GT-NOU');
  const createdAt = formatDate(saved.created_at || new Date().toISOString());
  const sourcePage = application.sourcePage || saved.source_page || '';
  const entries = orderedEntries(application.data);
  const replyTo = String(application.data.email || '').trim();
  const subject = `[GREENTECH Charity] ${typeLabel} - ${identity} - ${reference}`;
  const textRows = entries.map(([key, value]) => `${FIELD_LABELS[key]}: ${key === 'consent_at' ? formatDate(value) : displayValue(key, value)}`);

  const text = [
    'GREENTECH CHARITY',
    `Solicitare noua: ${typeLabel}`,
    '',
    `Referinta: ${reference}`,
    `Primita: ${createdAt}`,
    sourcePage ? `Pagina sursa: ${sourcePage}` : '',
    '',
    ...textRows,
    '',
    replyTo ? `Raspunde solicitantului: ${replyTo}` : '',
    'Mesaj generat automat de formularul securizat greentechcharity.ro.'
  ].filter((line, index, lines) => line || (index > 0 && lines[index - 1] !== '')).join('\n');

  const replyButton = replyTo
    ? `<a href="mailto:${escapeHtml(replyTo)}?subject=${encodeURIComponent(`Re: ${reference} - GREENTECH Charity`)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#c5ec4d;color:#173b28;font:700 13px/1 Arial,sans-serif;text-decoration:none;">Raspunde solicitantului</a>`
    : '';
  const sourceBlock = sourcePage
    ? `<p style="margin:8px 0 0;color:#6c786f;font:400 12px/1.5 Arial,sans-serif;word-break:break-all;">Pagina sursa: ${escapeHtml(sourcePage)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="ro">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#edf0ea;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Solicitare ${escapeHtml(typeLabel)} - ${escapeHtml(reference)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#edf0ea;">
      <tr><td align="center" style="padding:28px 12px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 35px rgba(23,59,40,.10);">
          <tr><td style="padding:30px 34px;background:#173b28;">
            <p style="margin:0 0 28px;color:#c5ec4d;font:700 12px/1.2 Arial,sans-serif;letter-spacing:.18em;">GREENTECH CHARITY</p>
            <span style="display:inline-block;margin:0 0 12px;padding:7px 11px;border:1px solid rgba(197,236,77,.55);border-radius:999px;color:#eaf7c2;font:700 11px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(typeLabel)}</span>
            <h1 style="margin:0;color:#ffffff;font:400 32px/1.15 Georgia,serif;">Solicitare noua primita</h1>
            <p style="margin:12px 0 0;color:#d8e2db;font:400 14px/1.55 Arial,sans-serif;">Informatiile de mai jos au fost trimise prin formularul oficial GREENTECH Charity.</p>
          </td></tr>
          <tr><td style="padding:24px 34px;background:#c5ec4d;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="color:#173b28;font:700 12px/1.4 Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;">Referinta<br><span style="font-size:17px;letter-spacing:.02em;">${escapeHtml(reference)}</span></td>
                <td align="right" style="color:#173b28;font:400 13px/1.45 Arial,sans-serif;">${escapeHtml(createdAt)}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:30px 34px 12px;">
            <h2 style="margin:0 0 8px;color:#173b28;font:400 24px/1.25 Georgia,serif;">${escapeHtml(identity)}</h2>
            <p style="margin:0;color:#6c786f;font:400 13px/1.5 Arial,sans-serif;">Datele solicitarii</p>
          </td></tr>
          <tr><td style="padding:10px 34px 28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #dfe4d7;border-radius:14px;overflow:hidden;">${detailRows(entries)}</table>
          </td></tr>
          <tr><td style="padding:0 34px 32px;">${replyButton}${sourceBlock}</td></tr>
          <tr><td style="padding:20px 34px;background:#f7f5eb;border-top:1px solid #e2e5dc;color:#6c786f;font:400 11px/1.55 Arial,sans-serif;">
            Mesaj automat transmis securizat de greentechcharity.ro. Nu distribui datele personale in afara fluxului autorizat al organizatiei.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    from: {name: config.fromName, address: config.fromEmail},
    to: config.recipients,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
    headers: {'X-Greentech-Reference': reference}
  };
}

export async function sendSubmissionEmail(application, saved) {
  const config = smtpConfig();
  if (!config.configured) {
    const error = new Error('SMTP configuration is incomplete.');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }
  return getTransporter(config).sendMail(createSubmissionMessage(application, saved, config));
}
