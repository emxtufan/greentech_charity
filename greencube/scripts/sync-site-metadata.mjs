import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentPath = path.join(projectRoot, 'public', 'brandbook-section', 'content.json');
const contentSource = await readFile(contentPath, 'utf8');
const contentVersion = createHash('sha256').update(contentSource).digest('hex').slice(0, 16);
const content = JSON.parse(contentSource);
const site = content.siteMeta;
const contactEmail = content.mainSite?.pages?.contact?.email;
const siteDescription = content.mainSite?.pages?.home?.seo?.description;

if (!site?.name || !site?.baseUrl || !site?.social?.image || !contactEmail || !siteDescription) {
  throw new Error('content.json nu contine configuratia siteMeta completa.');
}

const mainPages = [
  ['index.html', 'home'],
  ['public/404/index.html', 'notFound'],
].map(([file, pageKey]) => ({
  file,
  binding: 'gc',
  titlePath: `mainSite.pages.${pageKey}.seo.title`,
  descriptionPath: `mainSite.pages.${pageKey}.seo.description`,
  page: content.mainSite.pages[pageKey].seo,
}));

const pages = [
  ...mainPages,
  {
    file: 'public/brandbook-section/index.html',
    binding: 'bb',
    titlePath: 'page.title',
    descriptionPath: 'page.description',
    page: content.page,
  },
  {
    file: 'public/proiecte/index.html',
    binding: 'bb',
    titlePath: 'projects.page.title',
    descriptionPath: 'projects.page.description',
    page: content.projects.page,
  },
  {
    file: 'public/footer/index.html',
    binding: 'bb',
    titlePath: 'wrapper.footer.page.title',
    descriptionPath: 'wrapper.footer.page.description',
    page: content.wrapper.footer.page,
  },
];

const inlineCardIds = [
  '/confort-si-siguranta/',
  '/sprijin-pentru-familii/',
  '/un-camin-sanatos/',
  '/povestea-proiectului/',
  '/spatii-verzi/',
  '/voluntariat/',
  '/casa-sustenabila/',
  '/doneaza/',
  '/transparenta/',
  '/impact/',
  '/procesul-proiectului/',
  '/contact/',
];

const readPath = (source, valuePath) =>
  String(valuePath).split('.').reduce((value, key) => value?.[key], source);

const escapeText = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const escapeAttribute = (value) =>
  escapeText(value).replaceAll('"', '&quot;');

const absoluteUrl = (value) => new URL(value, site.baseUrl).href;

const metadataBinding = (binding, valuePath) =>
  binding === 'gc'
    ? ` data-gc-content-meta="${valuePath}"`
    : ` data-bb-content-meta="${valuePath}"`;

const titleBinding = (binding, valuePath) =>
  binding === 'gc'
    ? `data-gc-content="${valuePath}"`
    : `data-bb-content="${valuePath}"`;

const markerPattern = /\s*<!-- gc-site-metadata:start -->[\s\S]*?<!-- gc-site-metadata:end -->\s*/i;
const contentSnapshotPattern = /\s*<!-- gc-content-snapshot:start -->[\s\S]*?<!-- gc-content-snapshot:end -->\s*/i;
const removableMetaPattern = /\s*<meta\b(?=[^>]*\b(?:name|property)=["'](?:description|robots|theme-color|color-scheme|application-name|mobile-web-app-capable|apple-mobile-web-app-capable|apple-mobile-web-app-status-bar-style|apple-mobile-web-app-title|og:[^"']+|twitter:[^"']+)["'])[^>]*>\s*/gi;
const removableLinkPattern = /\s*<link\b(?=[^>]*\brel=["'](?:shortcut icon|icon|apple-touch-icon|manifest|canonical)["'])[^>]*>\s*/gi;

function buildMetadata(config) {
  const {binding, page, titlePath, descriptionPath} = config;
  const canonical = page.canonicalPath ? absoluteUrl(page.canonicalPath) : '';
  const socialImage = absoluteUrl(site.social.image);
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);
  const bind = (valuePath) => metadataBinding(binding, valuePath);
  const lines = [
    '<!-- gc-site-metadata:start -->',
    `<meta name="description" content="${description}"${bind(descriptionPath)}>`,
    `<meta name="robots" content="${escapeAttribute(page.robots || 'index,follow')}"${bind(`${descriptionPath.replace(/\.description$/, '')}.robots`)}>`,
    `<meta name="theme-color" content="${escapeAttribute(site.themeColor)}"${bind('siteMeta.themeColor')}>`,
    '<meta name="color-scheme" content="light">',
    `<meta name="application-name" content="${escapeAttribute(site.applicationName)}"${bind('siteMeta.applicationName')}>`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    `<meta name="apple-mobile-web-app-title" content="${escapeAttribute(site.applicationName)}"${bind('siteMeta.applicationName')}>`,
    '<meta property="og:type" content="website">',
    `<meta property="og:locale" content="${escapeAttribute(site.locale)}"${bind('siteMeta.locale')}>`,
    `<meta property="og:site_name" content="${escapeAttribute(site.name)}"${bind('siteMeta.name')}>`,
    `<meta property="og:title" content="${title}"${bind(titlePath)}>`,
    `<meta property="og:description" content="${description}"${bind(descriptionPath)}>`,
  ];

  if (canonical) {
    lines.push(`<meta property="og:url" content="${escapeAttribute(canonical)}">`);
  }

  lines.push(
    `<meta property="og:image" content="${escapeAttribute(socialImage)}">`,
    `<meta property="og:image:width" content="${escapeAttribute(site.social.imageWidth)}"${bind('siteMeta.social.imageWidth')}>`,
    `<meta property="og:image:height" content="${escapeAttribute(site.social.imageHeight)}"${bind('siteMeta.social.imageHeight')}>`,
    '<meta property="og:image:type" content="image/png">',
    `<meta property="og:image:alt" content="${escapeAttribute(site.social.imageAlt)}"${bind('siteMeta.social.imageAlt')}>`,
    `<meta name="twitter:card" content="${escapeAttribute(site.social.twitterCard)}"${bind('siteMeta.social.twitterCard')}>`,
    `<meta name="twitter:title" content="${title}"${bind(titlePath)}>`,
    `<meta name="twitter:description" content="${description}"${bind(descriptionPath)}>`,
    `<meta name="twitter:image" content="${escapeAttribute(socialImage)}">`,
    `<meta name="twitter:image:alt" content="${escapeAttribute(site.social.imageAlt)}"${bind('siteMeta.social.imageAlt')}>`,
  );

  if (canonical) lines.push(`<link rel="canonical" href="${escapeAttribute(canonical)}">`);

  lines.push(
    `<link rel="icon" href="${escapeAttribute(site.icons.svg)}" type="image/svg+xml">`,
    `<link rel="icon" href="${escapeAttribute(site.icons.png32)}" type="image/png" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="${escapeAttribute(site.icons.appleTouch)}" sizes="180x180">`,
    `<link rel="manifest" href="${escapeAttribute(site.icons.manifest)}">`,
  );

  if (config.file === 'index.html') {
    lines.push(
      '<script>window.__GREENTECH_EARLY_START_REQUESTED__=!1;document.addEventListener("click",function(e){e.target instanceof Element&&e.target.closest("._34fe16")&&(window.__GREENTECH_EARLY_START_REQUESTED__=!0)},!0)</script>',
      '<script defer src="/network-status.js?v=20260903-offline-only-1"></script>',
    );
  }

  if (canonical && page.robots === 'index,follow') {
    const organisation = {
      '@context': 'https://schema.org',
      '@type': 'NGO',
      name: site.name,
      url: site.baseUrl,
      logo: absoluteUrl('/icon-512.png'),
      image: socialImage,
      email: contactEmail,
      description: siteDescription,
    };
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(organisation).replaceAll('<', '\\u003c')}</script>`,
    );
  }

  lines.push('<!-- gc-site-metadata:end -->');
  return lines.join('\n');
}

function buildContentSnapshot() {
  const snapshot = JSON.stringify(content)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

  return `<!-- gc-content-snapshot:start -->
<script>
window.GREENTECH_CHARITY_CONTENT_VERSION='${contentVersion}';
window.GREENTECH_CHARITY_CONTENT=${snapshot};
(function(){
  function read(source,path){return String(path||'').split('.').reduce(function(value,key){return value==null?undefined:value[key]},source)}
  function direct(element,value){var node=Array.from(element.childNodes).find(function(item){return item.nodeType===Node.TEXT_NODE&&item.nodeValue&&item.nodeValue.trim()});if(node){node.nodeValue=String(value);return}var text=document.createTextNode(String(value));if(element.dataset.bbContentDirectPosition==='after-first'&&element.firstChild)element.firstChild.after(text);else element.insertBefore(text,element.firstChild)}
  function tail(element,value){var preserved=element.firstElementChild,node=preserved?preserved.nextSibling:element.firstChild;while(node){var next=node.nextSibling;node.remove();node=next}var template=document.createElement('template');template.innerHTML=String(value);element.appendChild(template.content)}
  function bind(root,selector,attribute,apply){root.querySelectorAll(selector).forEach(function(element){var value=read(window.GREENTECH_CHARITY_CONTENT,element.dataset[attribute]);if(value!=null)apply(element,value)})}
  function apply(root){
    root=root||document;
    bind(root,'[data-gc-content]','gcContent',function(element,value){element.textContent=String(value)});
    bind(root,'[data-bb-content]','bbContent',function(element,value){element.textContent=String(value)});
    bind(root,'[data-gc-content-html]','gcContentHtml',function(element,value){element.innerHTML=String(value)});
    bind(root,'[data-bb-content-html]','bbContentHtml',function(element,value){element.innerHTML=String(value)});
    bind(root,'[data-gc-content-direct]','gcContentDirect',direct);
    bind(root,'[data-bb-content-direct]','bbContentDirect',direct);
    bind(root,'[data-bb-content-prefix]','bbContentPrefix',direct);
    bind(root,'[data-bb-content-tail-html]','bbContentTailHtml',tail);
    bind(root,'[data-gc-content-meta]','gcContentMeta',function(element,value){element.setAttribute('content',String(value))});
    bind(root,'[data-bb-content-meta]','bbContentMeta',function(element,value){element.setAttribute('content',String(value))});
    bind(root,'[data-gc-content-aria]','gcContentAria',function(element,value){element.setAttribute('aria-label',String(value))});
    bind(root,'[data-bb-content-aria]','bbContentAria',function(element,value){element.setAttribute('aria-label',String(value))});
    bind(root,'[data-gc-content-alt]','gcContentAlt',function(element,value){element.setAttribute('alt',String(value))});
    bind(root,'[data-bb-content-alt]','bbContentAlt',function(element,value){element.setAttribute('alt',String(value))});
    bind(root,'[data-gc-content-email-href]','gcContentEmailHref',function(element,value){element.setAttribute('href','mailto:'+String(value))});
    root.querySelectorAll('[data-gc-content-poi-titles]').forEach(function(element){var value=read(window.GREENTECH_CHARITY_CONTENT,element.dataset.gcContentPoiTitles);if(!Array.isArray(value))return;try{var points=JSON.parse(decodeURIComponent(element.dataset.poi||'[]'));points.forEach(function(point,index){point.title=typeof value[index]==='string'?value[index]:''});element.dataset.poi=encodeURI(JSON.stringify(points))}catch(error){console.error('[GREENTECH Charity] Snapshot-ul etichetelor 3D nu a putut fi aplicat.',error)}});
    document.documentElement.dataset.gcContentSnapshot='true';
  }
  window.__GREENTECH_APPLY_CONTENT_SNAPSHOT__=apply;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){apply(document)},{once:true});else apply(document);
})();
</script>
<!-- gc-content-snapshot:end -->`;
}

async function syncPage(config) {
  const filePath = path.join(projectRoot, config.file);
  let html = await readFile(filePath, 'utf8');
  if (config.file === 'index.html') {
    html = html.replace(
      /<script\s+async(?:\s+defer=["']defer["'])?\s+type=["']module["']\s+src=["']\/src\/main\.tsx["']><\/script>/i,
      '<script type="module" src="/src/main.tsx"></script>',
    );
  }
  html = html.replace(markerPattern, '');
  html = html.replace(contentSnapshotPattern, '');
  html = html.replace(removableMetaPattern, '');
  html = html.replace(removableLinkPattern, '');
  html = html.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/i,
    `<title ${titleBinding(config.binding, config.titlePath)}>${escapeText(config.page.title)}</title>`,
  );

  const metadata = buildMetadata(config);
  const viewportPattern = /(<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>)/i;
  if (!viewportPattern.test(html)) throw new Error(`Lipseste viewport in ${config.file}`);
  html = html.replace(viewportPattern, `$1\n${metadata}\n${buildContentSnapshot()}`);
  html = html.replace(
    /(<link\b[^>]*\bhref=["']content\.json)(?:\?[^"']*)?(["'][^>]*>)/i,
    `$1?v=${contentVersion}$2`,
  );
  if (!/<\/body>/i.test(html)) throw new Error(`Lipseste body in ${config.file}`);
  await writeFile(filePath, html, 'utf8');
}

async function cleanRootCardArchitecture() {
  const filePath = path.join(projectRoot, 'index.html');
  let html = await readFile(filePath, 'utf8');

  // Cardurile sunt componente locale. Nu mai pastram prefetch-uri, lista de
  // rute sau href-uri catre documentele HTML eliminate.
  html = html.replace(/<link\b[^>]*\brel=["']prefetch["'][^>]*>/gi, '');
  html = html.replace(/<script>\s*window\.__ROUTES__\s*=\s*\[[\s\S]*?<\/script>/gi, '');
  html = html.replace(
    /<div class="_2680ad _6ebb2e"[^>]*data-pathname="\/404\/">[\s\S]*?<div class="_9bef0c"><\/div><\/div>/i,
    '',
  );

  for (const cardId of inlineCardIds) {
    const escapedCardId = cardId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(`href="${escapedCardId}"`, 'g'),
      `href="#" data-gc-card-target="${cardId}"`,
    );
  }

  html = html.replace(
    '<a href="/" class="_df3134 gc-brand-logo-link"',
    '<a href="#" data-gc-card-close class="_df3134 gc-brand-logo-link"',
  );

  await writeFile(filePath, html, 'utf8');
}

async function syncDiscoveryFiles() {
  const indexablePages = pages.filter(
    ({page}) => page.robots === 'index,follow' && page.canonicalPath,
  );
  const manifest = {
    id: '/',
    name: site.applicationName,
    short_name: site.shortName,
    description: siteDescription,
    lang: site.language,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: site.backgroundColor,
    theme_color: site.themeColor,
    icons: [
      {src: site.icons.svg, sizes: 'any', type: 'image/svg+xml', purpose: 'any'},
      {src: site.icons.png192, sizes: '192x192', type: 'image/png', purpose: 'any maskable'},
      {src: site.icons.png512, sizes: '512x512', type: 'image/png', purpose: 'any maskable'},
    ],
  };
  const sitemapEntries = indexablePages
    .map(({page}) => `  <url><loc>${escapeText(absoluteUrl(page.canonicalPath))}</loc></url>`)
    .join('\n');

  await Promise.all([
    writeFile(
      path.join(projectRoot, 'public', 'site.webmanifest'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      path.join(projectRoot, 'public', 'robots.txt'),
      `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`,
      'utf8',
    ),
    writeFile(
      path.join(projectRoot, 'public', 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
      'utf8',
    ),
  ]);
}

await cleanRootCardArchitecture();
for (const page of pages) await syncPage(page);
await syncDiscoveryFiles();

console.log(`Metadata sincronizata pentru ${pages.length} pagini; cardurile cladirii sunt locale.`);
