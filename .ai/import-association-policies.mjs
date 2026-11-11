#!/usr/bin/env node
/**
 * import-association-policies.mjs — v1.0
 *
 * Importă paginile /cod-etic, /confidentialitate și /politica-cookies în
 * server/data/content.json pe baza textelor extrase în .ai/docs-extracted.json.
 *
 * Reguli:
 * - codul etic și nota GDPR sunt citite la execuție; titlurile secțiunilor GDPR sunt fixe,
 *   iar granițele intervalelor urmează titlurile reale din sursă;
 * - /politica-cookies are text fix, aliniat la serviciile configurate în aplicație;
 * - backup al content.json înainte de scriere, apoi scriere atomică (tmp + rename);
 * - upsert după slug: celelalte pagini și setări rămân neatinse;
 * - site.footer.bottomLinks și site.modals.gdpr se actualizează fără duplicate,
 *   păstrând linkurile existente; cheia orfană content.footer se șterge.
 *
 * Rulare: node .ai/import-association-policies.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DOCS_FILE = path.join(ROOT, '.ai', 'docs-extracted.json');
const CONTENT_FILE = path.join(ROOT, 'server', 'data', 'content.json');

const WORD_PART = 'word/document.xml';
// intervalele se referă la numerele originale de paragraf (1-based, ambele capete incluse)
const HREF_KEYS = ['to', 'href', 'url', 'path'];

const COD_ETIC_RANGES = [[20, 31], [32, 74], [75, 114], [115, 131], [132, 200], [201, 211]];
const CONFIDENTIALITATE_RANGES = [
  // granițele urmează titlurile reale din „Nota de informare GDPR” (paragrafele 14, 25, 38, 48, 58, 64, 79, 84, 94)
  [14, 24], [25, 37], [38, 47], [48, 57], [58, 63],
  [64, 78], [79, 83], [84, 93], [94, 140],
];

// titluri fixe, în ordinea capitolelor din sursă; capitolele 9 (securitate) și 10
// (decizii automatizate și transferuri) formează împreună secțiunea a opta
const CONFIDENTIALITATE_TITLES = [
  'Scopurile prelucrării',
  'Categoriile de date',
  'Temeiurile prelucrării',
  'Destinatarii datelor',
  'Durata păstrării',
  'Drepturile persoanelor',
  'Furnizarea datelor',
  'Securitate și decizii automate',
  'Contact și reclamații',
];

const COD_ETIC_CTA = { label: 'Sesizează o problemă de etică', to: '/contact?subiect=altceva' };
const COOKIE_CTA = { label: 'Deschide setările cookie', to: '/politica-cookies#setari-cookie' };
const COD_ETIC_EMAIL = 'help@greentechcharity.ro';

const COD_ETIC_HEADER = { version: '1.0', adopted: '21.09.2026' };

// ---------------------------------------------------------------- utilitare

function readJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Fișierul lipsește: ${file}`);
  }
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON invalid în ${file}: ${error.message}`);
  }
}

function backupContent(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = `${file}.bak-${stamp}`;
  fs.copyFileSync(file, target);
  return target;
}

function writeJsonAtomic(file, data) {
  const dir = path.dirname(file);
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const handle = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(handle, json, 'utf8');
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  fs.renameSync(tmp, file);
}

function normalizeSlug(value) {
  const slug = String(value ?? '').trim();
  if (!slug) return '';
  const withSlash = slug.startsWith('/') ? slug : `/${slug}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cloneSection(section) {
  return JSON.parse(JSON.stringify(section));
}

// ------------------------------------------------- citirea extrasului docx

/**
 * Formatul sursă este un array plat de înregistrări
 * { source, part, paragraph, text }. Înregistrările se grupează după source,
 * păstrând ordinea din fișier și numărul original de paragraf.
 */
function collectDocuments(root) {
  if (!Array.isArray(root)) {
    throw new Error('.ai/docs-extracted.json trebuie să fie un array plat de înregistrări { source, part, paragraph, text }.');
  }
  const bySource = new Map();
  for (const entry of root) {
    const source = String(entry?.source ?? '').trim();
    if (!source) continue;
    const paragraph = Number(entry?.paragraph);
    if (!Number.isFinite(paragraph)) continue;
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push({
      part: String(entry?.part ?? '').replace(/\\/g, '/'),
      paragraph,
      text: String(entry?.text ?? ''),
    });
  }
  return [...bySource.entries()].map(([source, records]) => ({ source, records }));
}

function documentName(doc) {
  return String(doc?.source ?? '');
}

function findDocument(docs, matcher) {
  const doc = docs.find((entry) => matcher.test(documentName(entry)));
  if (!doc) {
    throw new Error(`Nu am găsit în .ai/docs-extracted.json documentul ${matcher}`);
  }
  return doc;
}

// înregistrările părții principale, cu numărul original de paragraf păstrat
function documentParagraphs(doc) {
  return (doc?.records ?? []).filter((record) => record.part === WORD_PART);
}

function selectRange(records, range) {
  const [start, end] = range;
  return records
    .filter((record) => record.part === WORD_PART && record.paragraph >= start && record.paragraph <= end)
    .map((record) => record.text);
}

// ------------------------------------------------------ curățarea textelor

const DATE_LIKE = /^(?:\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{4})\b/;
const CHAPTER_RE = /^cap(?:itol(?:ul)?)?\.?\s*(?:[IVXLC]+|\d+)(?:\s*[.):\-–—]\s*|\s+)?/i;
const ARTICLE_RE = /^art(?:icol(?:ul)?)?\.?\s*\d+(?:\.\d+)*(?:\s*[.):\-–—]\s*|\s+)?/i;
const SUBNUMBER_RE = /^(?:\d+(?:\.\d+)+\.?\s*|\d+[.)]\s+|\d+\)\s*)/;
const BULLET_RE = /^[•▪◦*\-–—]\s*/;

function flattenLine(rawLine) {
  return String(rawLine ?? '')
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .join(' ');
}

function splitChapterHeading(text) {
  const match = String(text ?? '').match(CHAPTER_RE);
  if (!match) return null;
  const rest = text.slice(match[0].length).replace(/^[\s.:\-–—]+/, '');
  const title = rest.replace(/[\s.:;,\-–—]+$/, '').trim();
  return { title, rest: rest.trim() };
}

// titluri numerotate de tipul „2. Scopurile prelucrării datelor”
function splitNumberedHeading(text) {
  const match = String(text ?? '').match(/^(\d{1,2})[.)]\s+/);
  if (!match) return null;
  const rest = text.slice(match[0].length).trim();
  if (!rest || /[;:,]$/.test(rest)) return null;
  const title = cleanTitle(rest);
  if (!title || title.length > 90) return null;
  return { title, rest: '' };
}

function cleanTitle(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\s.:;,\-–—]+$/, '')
    .trim();
}

function stripPrefixes(input) {
  let text = String(input ?? '').replace(/\u00a0/g, ' ').trim();
  if (!text) return '';
  text = text.replace(BULLET_RE, '').trim();
  text = text.replace(ARTICLE_RE, '').trim();
  if (!DATE_LIKE.test(text)) {
    text = text.replace(SUBNUMBER_RE, '').trim();
  }
  return text.replace(/^[\s.:\-–—]+/, '').trim();
}

function polishText(input) {
  return String(input ?? '')
    // diacriticele din sursă păstrate; se schimbă doar prescurtarea organizației
    .replace(/\bAPWR\b/gi, 'asociația')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------- componente

function headerBlock({ id, title, subtitle, version = '', adopted = '', text = '' }) {
  return {
    id,
    type: 'pageHeader',
    data: {
      eyebrow: '',
      title,
      subtitle,
      text,
      version,
      adopted,
      image: '',
      imageNote: '',
    },
  };
}

function textBlock({ id, title, text, cta }) {
  return {
    id,
    type: 'textBlock',
    data: {
      eyebrow: '',
      title: title ?? '',
      text: text ?? '',
      compact: true,
      image: '',
      imageNote: '',
      cta: { label: cta?.label ?? '', to: cta?.to ?? '' },
    },
  };
}

function fallbackTitle(body, index) {
  const first = String(body[0] ?? '');
  const words = first.split(/\s+/).slice(0, 8).join(' ');
  const short = words.replace(/[\s.:;,\-–—]+$/, '');
  if (!short) return `Partea ${index + 1}`;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function collectChapter({ lines, seenTitles, pageTitle, numberedHeadings = false }) {
  const body = [];
  const ownTitles = new Set();
  let title = '';
  const pageKey = fold(pageTitle);

  for (const rawLine of lines) {
    const flat = flattenLine(rawLine);
    if (!flat) continue;

    const heading = splitChapterHeading(flat)
      ?? (numberedHeadings ? splitNumberedHeading(flat) : null);
    let line = flat;

    if (heading && heading.title.length <= 90) {
      const key = fold(heading.title);
      const duplicate = !key || key === pageKey || seenTitles.has(key) || ownTitles.has(key);
      if (heading.title && !duplicate) {
        ownTitles.add(key);
        seenTitles.add(key);
        if (!title) {
          title = cleanTitle(heading.title);
        } else {
          body.push(cleanTitle(heading.title));
        }
      }
      line = heading.rest;
      if (!line) continue;
    }

    const cleaned = polishText(stripPrefixes(line));
    if (!cleaned) continue;
    if (body.length && fold(body[body.length - 1]) === fold(cleaned)) continue;
    body.push(cleaned);
  }

  return { title, body };
}

function buildChapterBlocks({
  records, ranges, idPrefix, pageTitle, seenTitles, titles = [],
  numberedHeadings = false, lastSuffix = '', cta = null, warnings,
}) {
  const blocks = ranges.map((range, index) => {
    const lines = selectRange(records, range);
    const { title, body } = collectChapter({ lines, seenTitles, pageTitle, numberedHeadings });
    const fixedTitle = cleanTitle(titles[index] ?? '');
    const isLast = index === ranges.length - 1;
    const textParts = body.slice();
    if (isLast && lastSuffix) textParts.push(lastSuffix);
    if (!textParts.length && warnings) {
      warnings.push(`${idPrefix}-${index + 1}: intervalul [${range.join(',')}] nu a produs text`);
    }
    return textBlock({
      id: `${idPrefix}-${index + 1}`,
      title: fixedTitle || title || fallbackTitle(body, index),
      text: textParts.join('\n\n'),
      cta: isLast && cta ? cta : null,
    });
  });
  return blocks;
}

// ------------------------------------------------------------ paginile

function buildCodEtic(records, warnings) {
  const slug = '/cod-etic';
  const pageTitle = 'Cod etic';
  const seenTitles = new Set();
  const blocks = buildChapterBlocks({
    records,
    ranges: COD_ETIC_RANGES,
    idPrefix: 'cod-etic-cap',
    pageTitle,
    seenTitles,
    lastSuffix: `Sesizările privind nerespectarea codului etic se trimit prin formularul de contact sau la ${COD_ETIC_EMAIL}.`,
    cta: COD_ETIC_CTA,
    warnings,
  });

  return {
    id: 'cod-etic',
    slug,
    title: pageTitle,
    description: `Codul etic al asociației, versiunea ${COD_ETIC_HEADER.version}, adoptată în ${COD_ETIC_HEADER.adopted}.`,
    showInNav: false,
    sections: [
      headerBlock({
        id: 'cod-etic-header',
        title: pageTitle,
        subtitle: 'Principiile și regulile de conduită ale asociației',
        version: COD_ETIC_HEADER.version,
        adopted: COD_ETIC_HEADER.adopted,
      }),
      ...blocks,
    ],
  };
}

const CONFIDENTIALITATE_WEB_PARAGRAPHS = [
  'Formularul de contact, corespondența prin e-mail (SMTP), verificarea de securitate Turnstile și formularul F230 sunt canale prin care ne trimiți date cu caracter personal: nume, date de contact, conținutul mesajului și documentele atașate.',
  'Mesajele primite prin aplicație se păstrează 365 de zile, apoi se șterg.',
  'Celelalte documente se păstrează potrivit obligațiilor legale aplicabile asociației.',
];

function buildConfidentialitate(records, orgInfoSection, warnings) {
  const slug = '/confidentialitate';
  const pageTitle = 'Politica de confidențialitate';
  const seenTitles = new Set();
  const blocks = buildChapterBlocks({
    records,
    ranges: CONFIDENTIALITATE_RANGES,
    idPrefix: 'confidentialitate-nota',
    pageTitle,
    seenTitles,
    titles: CONFIDENTIALITATE_TITLES,
    numberedHeadings: true,
    warnings,
  });

  return {
    id: 'confidentialitate',
    slug,
    title: pageTitle,
    description: 'Cum prelucrăm datele cu caracter personal: temeiuri, drepturi, termene și canale de contact.',
    showInNav: false,
    sections: [
      headerBlock({
        id: 'confidentialitate-header',
        title: pageTitle,
        subtitle: 'Notă de informare privind prelucrarea datelor cu caracter personal',
      }),
      cloneSection(orgInfoSection),
      ...blocks,
      textBlock({
        id: 'confidentialitate-web',
        title: 'Date primite prin site și durata de păstrare',
        text: CONFIDENTIALITATE_WEB_PARAGRAPHS.join('\n\n'),
      }),
    ],
  };
}

const COOKIE_CONTACT_EMAIL = 'help@greentechcharity.ro';

function buildPoliticaCookies() {
  const slug = '/politica-cookies';
  const pageTitle = 'Politica de cookies';

  const blocks = [
    headerBlock({
      id: 'politica-cookies-header',
      title: pageTitle,
      subtitle: 'Ce cookie-uri folosim, de ce și cum le poți controla',
    }),
    textBlock({
      id: 'politica-cookies-1',
      title: 'Cookie-uri și stocare locală',
      text: [
        'Datele operatorului, ASOCIAȚIA GREENTECH EDU, sunt disponibile în pagina de identificare a asociației.',
        'Aplicația folosește cookie-uri și stocare locală în browser pentru trei scopuri, și anume funcționarea tehnică a site-ului, analiza modului în care este folosit și, numai cu acordul tău, marketing.',
        'Cookie-urile și înregistrările strict necesare asigură funcționarea și securitatea aplicației și nu pot fi refuzate din setările de consimțământ; cele de analiză și de marketing se activează exclusiv pe baza opțiunilor tale.',
      ].join('\n\n'),
      cta: { label: 'Datele asociației', to: '/date-asociatie' },
    }),
    textBlock({
      id: 'politica-cookies-2',
      title: 'Cookie-uri necesare',
      text: [
        'Cookie-urile și înregistrările de stocare locală necesare sunt folosite pentru funcționarea și securitatea aplicației, adică păstrarea preferințelor, protejarea formularelor și a zonei de administrare.',
        'Turnstile (Cloudflare) rulează ca măsură de securitate pentru formulare numai când este activ în configurația aplicației.',
        'Preferințele de consimțământ sunt salvate local, în gt_consent, și rămân pe dispozitiv până când le modifici sau le ștergi.',
        'wc_admin_token este folosit exclusiv în zona de administrare. Sesiunea de administrare este valabilă 8 ore, iar tokenul este stocat până la ieșirea din cont, până când este înlocuit cu unul nou sau până când îl ștergi.',
      ].join('\n\n'),
    }),
    textBlock({
      id: 'politica-cookies-3',
      title: 'Cookie-uri de analiză',
      text: [
        'Cookie-urile de analiză (Google Analytics 4 și Microsoft Clarity) se instalează numai dacă serviciul respectiv este configurat în aplicație și numai dacă ai dat consimțământ pentru categoria de analiză.',
        'Dacă lipsește oricare dintre aceste condiții, nu se instalează cookie-uri de analiză și nu se colectează date prin ele.',
      ].join('\n\n'),
    }),
    textBlock({
      id: 'politica-cookies-4',
      title: 'Cookie-uri de marketing',
      text: [
        'Cookie-urile de marketing (Google Ads, Meta, TikTok) se instalează numai dacă serviciul respectiv este configurat în aplicație și numai dacă ai dat consimțământ pentru categoria de marketing.',
        'Google Tag Manager rulează conform categoriilor configurate în aplicație, astfel încât etichetele să fie încărcate doar pentru categoriile pe care le-ai acceptat.',
      ].join('\n\n'),
    }),
    textBlock({
      id: 'politica-cookies-5',
      title: 'Alegerea consimțământului',
      text: [
        'La prima vizită poți accepta toate cookie-urile, poți refuza cookie-urile opționale sau poți configura separat fiecare categorie.',
        'Îți poți modifica sau retrage opțiunile oricând, la fel de simplu cum le-ai acordat, din setările cookie de pe această pagină; refuzul cookie-urilor opționale nu îți limitează accesul la conținut și nici posibilitatea de a ne contacta.',
      ].join('\n\n'),
      cta: COOKIE_CTA,
    }),
    textBlock({
      id: 'politica-cookies-6',
      title: 'Durata stocării și controlul din browser',
      text: [
        'Durata de stocare diferă de la un serviciu la altul. Unele cookie-uri sunt valabile doar cât timp sesiunea din browser este deschisă, iar altele rămân pe dispozitiv până la expirarea perioadei configurate pentru serviciul respectiv. Duratele exacte depind de configurația aplicației și de serviciile active.',
        'Poți șterge oricând cookie-urile și datele locale din setările browserului. După ștergere, opțiunile de consimțământ trebuie reconfirmate, iar în zona de administrare poate fi necesară o nouă autentificare.',
      ].join('\n\n'),
    }),
    textBlock({
      id: 'politica-cookies-7',
      title: 'Furnizori terți și contact',
      text: [
        'Unii furnizori ai serviciilor de analiză și de marketing pot prelucra date în afara Spațiului Economic European, cu garanțiile prevăzute de GDPR, cum ar fi clauzele contractuale standard.',
        `Detalii despre prelucrarea datelor găsești în politica de confidențialitate, iar întrebările despre cookie-uri ne pot fi trimise la ${COOKIE_CONTACT_EMAIL}.`,
      ].join('\n\n'),
      cta: { label: 'Politica de confidențialitate', to: '/confidentialitate' },
    }),
  ];

  return {
    id: 'politica-cookies',
    slug,
    title: pageTitle,
    description: 'Cookie-urile și stocarea locală folosite de aplicație, scopurile lor și opțiunile tale de control.',
    showInNav: false,
    sections: blocks,
  };
}

// ------------------------------------------------------ content.json helpers

function findPage(content, slug) {
  const target = normalizeSlug(slug);
  return (content.pages ?? []).find((page) => normalizeSlug(page?.slug) === target) ?? null;
}

const ORG_INFO_NAMES = new Set(
  ['orgInfo', 'orginfo', 'organisationInfo', 'organizationInfo', 'orgDetails', 'dateAsociatie', 'contactInfo']
    .map(fold),
);

function findOrgInfoSection(content) {
  const source = findPage(content, '/date-asociatie');
  if (!source) {
    throw new Error('Pagina /date-asociatie lipsește; orgInfo nu poate fi clonat.');
  }
  const section = (source.sections ?? []).find((entry) => entry && (
    ORG_INFO_NAMES.has(fold(entry.type)) || ORG_INFO_NAMES.has(fold(entry.id))
  ));
  if (!section) {
    throw new Error('Secțiunea orgInfo lipsește din /date-asociatie.');
  }
  return section;
}

function upsertPage(content, page) {
  if (!Array.isArray(content.pages)) content.pages = [];
  const target = normalizeSlug(page.slug);
  const index = content.pages.findIndex((entry) => normalizeSlug(entry?.slug) === target);
  if (index >= 0) {
    const existing = content.pages[index];
    const merged = { ...existing, ...page };
    if (existing.id) merged.id = existing.id;
    content.pages[index] = merged;
    return 'actualizată';
  }
  content.pages.push(page);
  return 'adăugată';
}

function itemHref(item) {
  for (const key of HREF_KEYS) {
    const value = item?.[key];
    if (typeof value === 'string' && value) return normalizeSlug(value);
  }
  return '';
}

function linkKeyFor(list) {
  const sample = list.find((item) => item && typeof item === 'object') ?? null;
  if (!sample) return 'to';
  return HREF_KEYS.find((key) => typeof sample[key] === 'string' && sample[key]) ?? 'to';
}

function upsertLinks(list, wanted) {
  const out = Array.isArray(list) ? list.slice() : [];
  const defaultKey = linkKeyFor(out);
  for (const want of wanted) {
    const target = normalizeSlug(want.to);
    const label = fold(want.label);
    const index = out.findIndex((item) => itemHref(item) === target || fold(item?.label) === label);
    if (index >= 0) {
      const existing = { ...out[index] };
      const key = HREF_KEYS.find((entry) => typeof existing[entry] === 'string' && existing[entry]) ?? defaultKey;
      existing.label = want.label;
      existing[key] = want.to;
      out[index] = existing;
    } else {
      out.push({ label: want.label, [defaultKey]: want.to });
    }
  }
  return out;
}

const BOTTOM_LINKS = [
  { label: 'Politica GDPR', to: '/confidentialitate' },
  { label: 'Politica cookies', to: '/politica-cookies' },
  { label: 'Cod etic', to: '/cod-etic' },
  { label: 'Date asociație', to: '/date-asociatie' },
];

function updateFooter(content) {
  if (!content.site || typeof content.site !== 'object') content.site = {};
  if (!content.site.footer || typeof content.site.footer !== 'object') content.site.footer = {};
  const footer = content.site.footer;

  // linkurile orfane dintr-o versiune anterioară a scriptului (content.footer) se preiau
  // o singură dată, împerecheate după „to”; apoi cheia orfană se șterge
  const orphan = content.footer && typeof content.footer === 'object' ? content.footer : null;
  if (orphan) {
    const existing = Array.isArray(footer.bottomLinks) ? footer.bottomLinks.slice() : [];
    const known = new Set(existing.map((item) => itemHref(item)).filter(Boolean));
    for (const link of Array.isArray(orphan.bottomLinks) ? orphan.bottomLinks : []) {
      const target = itemHref(link);
      if (!target || known.has(target)) continue;
      known.add(target);
      existing.push(link);
    }
    footer.bottomLinks = existing;
    delete content.footer;
  }

  footer.bottomLinks = upsertLinks(footer.bottomLinks, BOTTOM_LINKS);
  return footer.bottomLinks.length;
}

function updateGdprModal(content) {
  if (!content.site || typeof content.site !== 'object') content.site = {};
  if (!content.site.modals || typeof content.site.modals !== 'object') content.site.modals = {};
  const current = content.site.modals.gdpr && typeof content.site.modals.gdpr === 'object'
    ? content.site.modals.gdpr
    : {};
  const next = {
    ...current,
    title: 'Politica de confidențialitate (GDPR)',
    text: 'Folosim datele tale pentru a răspunde solicitărilor, pentru funcționarea aplicației și pentru obligațiile legale. Temeiurile, drepturile tale și termenele de păstrare sunt descrise în politica de confidențialitate.',
    linkLabel: 'Citește politica de confidențialitate',
  };
  const hrefKey = HREF_KEYS.find((key) => typeof current[key] === 'string' && current[key]);
  if (hrefKey) next[hrefKey] = '/confidentialitate';
  content.site.modals.gdpr = next;
  return next;
}

// ------------------------------------------------------------------- main

function main() {
  const warnings = [];
  const docs = collectDocuments(readJson(DOCS_FILE));
  const content = readJson(CONTENT_FILE);

  // numele reale din .ai/docs-extracted.json:
  // "docs/Cod de etica -21.09.2026- rev 1.docx", "docs/Nota de informare GDPR -GREEN EDU.docx"
  const codEticRecords = documentParagraphs(findDocument(docs, /cod\s*(?:de\s+)?etic/i));
  const confidentialitateRecords = documentParagraphs(findDocument(docs, /confiden|gdpr/i));

  const orgInfoSection = findOrgInfoSection(content);

  const pages = [
    buildCodEtic(codEticRecords, warnings),
    buildConfidentialitate(confidentialitateRecords, orgInfoSection, warnings),
    buildPoliticaCookies(),
  ];

  const backupPath = backupContent(CONTENT_FILE);
  console.log(`Backup: ${path.relative(ROOT, backupPath)}`);

  for (const page of pages) {
    const status = upsertPage(content, page);
    console.log(`${page.slug}: ${status} (${page.sections.length} secțiuni)`);
  }

  const footerCount = updateFooter(content);
  updateGdprModal(content);
  console.log(`site.footer.bottomLinks: ${footerCount} linkuri; site.modals.gdpr actualizat`);

  for (const warning of warnings) console.warn(`ATENȚIE: ${warning}`);

  writeJsonAtomic(CONTENT_FILE, content);
  console.log(`Scris atomic: ${path.relative(ROOT, CONTENT_FILE)}`);
}

main();
