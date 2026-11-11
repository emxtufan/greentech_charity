#!/usr/bin/env node
/**
 * Importă datele de identificare ale asociației și paginile instituționale
 * în server/data/content.json.
 *
 *   node .ai/import-association-core.mjs
 *
 * - citește server/data/content.json
 * - face backup în server/data/backups/content-<timestamp>.json
 * - modifică doar câmpurile precizate (site.legal, site.contact, site.social,
 *   site.nav, site.footer, secțiunea „causes” de pe prima pagină, paginile noi)
 * - scrie atomic (fișier temporar în același folder + rename)
 *
 * Scriptul e idempotent: îl poți rula de mai multe ori, paginile se actualizează
 * după slug, fără duplicate.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_FILE = path.join(ROOT, 'server', 'data', 'content.json')
const BACKUP_DIR = path.join(ROOT, 'server', 'data', 'backups')

/* ------------------------------------------------------------------ */
/* Ajutoare                                                            */
/* ------------------------------------------------------------------ */

const clone = (value) => JSON.parse(JSON.stringify(value))

let sectionSeq = 0

/** Secțiune CMS: { id, type, data }. Id-ul se poate da explicit, altfel e generat. */
const section = (type, data, id) => {
  sectionSeq += 1
  return {
    id: id || `${type}-${sectionSeq}`,
    type,
    hidden: false,
    data: clone(data),
  }
}

const slugToId = (slug) => {
  const clean = String(slug || '').replace(/^\/+|\/+$/g, '').replace(/\//g, '-')
  return clean || 'home'
}

const link = (label, to) => ({ label, to })

/** Pagine CMS: { id, slug, title, description, showInNav, sections }. */
const page = (slug, title, sections, meta = {}) => ({
  id: meta.id || slugToId(slug),
  slug,
  title,
  description: meta.description || '',
  showInNav: Boolean(meta.showInNav),
  sections,
})

/** Înlocuiește pagina cu același slug sau o adaugă la final. Nu produce duplicate. */
const upsertPage = (db, newPage) => {
  if (!Array.isArray(db.pages)) db.pages = []
  const index = db.pages.findIndex((item) => item && item.slug === newPage.slug)
  if (index === -1) {
    db.pages.push(newPage)
    return newPage
  }
  const existing = db.pages[index]
  const merged = { ...existing, ...newPage, id: existing.id || newPage.id }
  db.pages[index] = merged
  return merged
}

/** Rescrie linkurile după destinație și adaugă intrările lipsă (fără duplicate). */
const syncLinks = (list, replacements, additions) => {
  const current = Array.isArray(list) ? list : []
  const next = current.map((item) => {
    const replacement = item && replacements[item.to]
    return replacement ? { ...item, ...replacement } : item
  })
  const extra = Array.isArray(additions) ? additions : []
  extra.forEach((item) => {
    if (!next.some((existing) => existing && existing.to === item.to)) next.push({ ...item })
  })
  return next
}

/** Secțiunea orgInfo existentă (de pe /contact) sau valorile implicite. */
const orgInfoData = (db) => {
  const contactPage = (db.pages || []).find((item) => item && item.slug === '/contact')
  const existing = contactPage && (contactPage.sections || []).find((s) => s && s.type === 'orgInfo')
  if (existing && existing.data) {
    const data = clone(existing.data)
    data.anchor = 'date-asociatie'
    return data
  }
  return {
    anchor: 'date-asociatie',
    bg: 'white',
    eyebrow: 'Cine suntem',
    title: 'Date de contact și de identificare',
    intro: '',
    contactTitle: 'Contact',
    contactMissing: 'Deocamdată ne poți scrie prin formularul de contact.',
    legalTitle: 'Date de identificare',
    legalMissing: 'Datele de identificare se publică aici după confirmare.',
  }
}

/* ------------------------------------------------------------------ */
/* Conținutul editorial                                               */
/* ------------------------------------------------------------------ */

const pageHeader = (eyebrow, title, text) =>
  section('pageHeader', { anchor: '', eyebrow, title, text })

const textBlock = (anchor, eyebrow, title, text, cta = { label: '', to: '' }, id) =>
  section(
    'textBlock',
    {
      anchor,
      bg: 'white',
      compact: true,
      eyebrow,
      title,
      text,
      image: '',
      imageNote: '',
      cta,
    },
    id,
  )

const ctaBand = (title, text, primary, secondary = { label: '', to: '' }) =>
  section('ctaBand', { anchor: '', title, text, primary, secondary })

const homeCausesSection = () =>
  section(
    'cardsGrid',
    {
      anchor: 'causes',
      eyebrow: 'Cum poți ajuta',
      title: 'Cum ne poți sprijini',
      intro:
        'Sunt două feluri principale în care te poți implica: ca persoană fizică sau ca firmă. Fiecare are opțiunile lui, scrise pe scurt mai jos.',
      columns: 2,
      items: [
        {
          icon: 'bi-person-heart',
          title: 'Ca persoană fizică',
          text: 'Poți redirecționa o parte din impozitul pe venit, poți dona, poți face voluntariat sau ne poți semnala o situație în care cineva are nevoie de un loc sigur unde să locuiască.',
          cta: { label: 'Vezi opțiunile', to: '/implica-te/persoane' },
        },
        {
          icon: 'bi-building',
          title: 'Ca firmă',
          text: 'Poți intra ca sponsor, poți dona materiale sau servicii, poți pune la dispoziție expertiză ori un voluntariat de echipă.',
          cta: { label: 'Vezi opțiunile', to: '/implica-te/companii' },
        },
      ],
      cta: { label: '', to: '' },
    },
    'causes-1',
  )

const buildPages = (db) => [
  page(
    '/date-asociatie',
    'Datele asociației',
    [
      pageHeader(
        'Despre noi',
        'Datele asociației',
        'Aici găsești datele de identificare și de contact ale asociației, ca să le poți folosi pentru un transfer, pentru un formular sau pentru o colaborare.',
      ),
      section(
        'orgInfo',
        orgInfoData(db),
        'da-orginfo',
      ),
    ],
    {
      id: 'date-asociatie',
      description:
        'Datele de identificare și de contact ale Asociației GreenTech Edu: denumire, cod fiscal, registru, sediu, reprezentant și cont bancar.',
      showInNav: false,
    },
  ),
  page(
    '/despre-asociatie',
    'Despre asociație',
    [
      pageHeader(
        'Despre noi',
        'Asociația GreenTech Edu',
        'Cine suntem, ce ne propunem să facem și pe ce valori ne sprijinim deciziile atunci când cineva ne cere ajutor.',
      ),
      textBlock(
        'misiune',
        'Misiunea noastră',
        'De ce existăm',
        'Credem că fiecare familie merită un acoperiș sigur deasupra capului, un spațiu în care să trăiască în siguranță, sănătate și respect. Asociația s-a format pentru a aduce împreună oameni și firme care pot sprijini persoane și familii aflate în situații grele, care nu au un loc sigur în care să locuiască.\n\nPornim de la oamenii pe care îi cunoaștem, de la situațiile reale și de la sprijinul pe care îl putem strânge. Casele modulare sunt soluția pe care am ales-o pentru că pot fi pregătite într-un spațiu de producție și apoi montate pe un teren pregătit dinainte.',
        { label: '', to: '' },
        'despre-misiune',
      ),
      textBlock(
        'scop',
        'Direcțiile noastre',
        'Ce vrem să facem',
        'Ne propunem să construim și să montăm case simple pentru persoane și familii care au nevoie de o locuință sigură, să lucrăm cu asistenți sociali, primării și organizații care cunosc situațiile din comunitate și să atragem sprijin prin redirecționarea impozitului pe venit, prin donații și prin sponsorizări.\n\nVrem să ținem la vedere ce se întâmplă cu fiecare contribuție: pe ce s-au folosit banii și materialele. Protejăm datele persoanelor care ne cer ajutor și folosim informațiile necesare pentru evaluarea și acordarea sprijinului, potrivit politicii de confidențialitate.',
        { label: '', to: '' },
        'despre-scop',
      ),
      section(
        'cardsGrid',
        {
          eyebrow: 'Valorile noastre',
          title: 'Pe ce ne sprijinim deciziile',
          intro: '',
          columns: 2,
          items: [
            {
              icon: 'bi-house-heart',
              title: 'Demnitate umană',
              text: 'Credem că fiecare familie merită un acoperiș sigur deasupra capului, un spațiu în care să trăiască în siguranță, sănătate și respect. Fiecare proiect pornește de la dreptul fundamental al oamenilor la o locuință decentă.',
              cta: { label: '', to: '' },
            },
            {
              icon: 'bi-people',
              title: 'Solidaritate',
              text: 'Construim case, dar mai ales construim punți între oameni. Prin contribuțiile celor care redirecționează o parte din impozit și prin sponsorizările companiilor, vulnerabilitatea familiilor poate deveni sprijin concret și șansa unui nou început.',
              cta: { label: '', to: '' },
            },
            {
              icon: 'bi-shield-check',
              title: 'Echitate',
              text: 'Sprijinim familiile aflate în cele mai dificile situații, fără discriminare. Prioritizăm nevoia reală, nu vizibilitatea sau avantajul personal. Fiecare familie are dreptul la șanse egale.',
              cta: { label: '', to: '' },
            },
            {
              icon: 'bi-chat-heart',
              title: 'Empatie',
              text: 'Înțelegem poveștile, greutățile și provocările cu care se confruntă familiile. Fiecare intervenție începe cu ascultare, respect și dorința de a oferi sprijin real, nu doar o construcție.',
              cta: { label: '', to: '' },
            },
          ],
          cta: { label: '', to: '' },
        },
        'despre-valori',
      ),
      ctaBand(
        'Vrei să știi după ce reguli lucrăm?',
        'Am strâns într-un cod etic felul în care ne raportăm la oamenii care ne cer ajutor, la donatori și la companiile cu care colaborăm.',
        { label: 'Citește codul etic', to: '/cod-etic' },
      ),
    ],
    {
      id: 'despre-asociatie',
      description:
        'Cine este Asociația GreenTech Edu, ce își propune să facă pentru familiile care nu au un loc sigur unde să locuiască și pe ce valori se sprijină.',
      showInNav: false,
    },
  ),
  page(
    '/implica-te',
    'Implică-te',
    [
      pageHeader(
        'Implică-te',
        'Cum poți ajuta',
        'Sunt două drumuri: ca persoană fizică sau ca firmă. Am scris pentru fiecare ce poți face concret și unde ajunge sprijinul tău.',
      ),
      section(
        'cardsGrid',
        {
          eyebrow: 'Două direcții',
          title: 'Alege cum vrei să te implici',
          intro: '',
          columns: 2,
          items: [
            {
              icon: 'bi-person-heart',
              title: 'Ca persoană fizică',
              text: 'Redirecționarea unei părți din impozitul pe venit, o donație, câteva ore de voluntariat sau semnalarea unei situații în care cineva are nevoie de ajutor.',
              cta: { label: 'Vezi opțiunile', to: '/implica-te/persoane' },
            },
            {
              icon: 'bi-building',
              title: 'Ca firmă',
              text: 'Sponsorizări, materiale și servicii, expertiză sau o zi de voluntariat de echipă. Sprijinul companiei poate contribui la realizarea unei locuințe sigure.',
              cta: { label: 'Vezi opțiunile', to: '/implica-te/companii' },
            },
          ],
          cta: { label: '', to: '' },
        },
        'implica-te-diregii',
      ),
    ],
    {
      id: 'implica-te',
      description:
        'Cum poți ajuta Asociația GreenTech Edu: ca persoană fizică prin redirecționarea impozitului, donație sau voluntariat, ori ca firmă prin sponsorizări, materiale și expertiză.',
      showInNav: false,
    },
  ),
  page(
    '/implica-te/persoane',
    'Implică-te ca persoană fizică',
    [
      pageHeader(
        'Persoane fizice',
        'Cum poți ajuta ca persoană fizică',
        'Nu e nevoie să faci totul. Și o parte din impozitul pe care oricum îl plătești, și câteva ore de voluntariat contează.',
      ),
      textBlock(
        'redirectionare',
        'Cel mai simplu drum',
        'Redirecționează o parte din impozit',
        'Dacă ai venituri din salarii, poți alege ca o parte din impozitul pe care oricum îl plătești să ajungă la asociație. Nu plătești nimic în plus, iar suma o calculează ANAF. Completezi Formularul 230, iar noi îl depunem mai departe.',
        { label: 'Completează Formularul 230', to: '/formular-230' },
        'persoane-redirectionare',
      ),
      section(
        'cardsGrid',
        {
          eyebrow: 'Alte feluri de a ajuta',
          title: 'Ce poți face concret',
          intro: '',
          columns: 2,
          items: [
            {
              icon: 'bi-heart',
              title: 'Donație',
              text: 'Orice sumă ajută la materiale și la lucrările de la o casă. Datele de care ai nevoie pentru un transfer sunt pe pagina cu datele asociației.',
              cta: { label: 'Vezi datele asociației', to: '/date-asociatie' },
            },
            {
              icon: 'bi-people',
              title: 'Voluntariat',
              text: 'Poți ajuta pe teren, la montaj sau la partea de organizare, cu timpul pe care îl ai. Scrie-ne și vedem împreună ce se potrivește.',
              cta: { label: 'Scrie-ne', to: '/contact?subiect=voluntariat' },
            },
            {
              icon: 'bi-flag',
              title: 'Semnalează o situație',
              text: 'Dacă știi o familie sau o persoană care nu are un loc sigur unde să locuiască, scrie-ne. Nu publicăm date despre oamenii care ne contactează.',
              cta: { label: 'Semnalează o situație', to: '/contact?subiect=situatie' },
            },
          ],
          cta: { label: '', to: '' },
        },
        'persoane-optiuni',
      ),
    ],
    {
      id: 'implica-te-persoane',
      description:
        'Poți ajuta ca persoană fizică prin redirecționarea unei părți din impozitul pe venit, printr-o donație, prin voluntariat sau semnalând o situație în care cineva are nevoie de un loc sigur.',
      showInNav: false,
    },
  ),
  page(
    '/implica-te/companii',
    'Implică-te ca firmă',
    [
      pageHeader(
        'Companii',
        'Cum poți ajuta ca firmă',
        'O sponsorizare, materiale, expertiză sau o zi de voluntariat de echipă se văd direct la o casă. Îți spunem ce presupune fiecare și cum lucrăm.',
      ),
      section(
        'cardsGrid',
        {
          eyebrow: 'Forme de sprijin',
          title: 'Ce poate face o firmă',
          intro: '',
          columns: 2,
          items: [
            {
              icon: 'bi-cash-stack',
              title: 'Sponsorizări',
              text: 'Poți susține o etapă a lucrărilor sau o casă anume. Îți spunem pe ce s-a folosit suma și îți punem la dispoziție documentele de care ai nevoie.',
              cta: { label: 'Discută cu noi', to: '/contact?subiect=companie' },
            },
            {
              icon: 'bi-box-seam',
              title: 'Materiale și servicii',
              text: 'Materialele de construcție, utilajele, transportul sau serviciile pe care le oferiți reduc direct costul unei case.',
              cta: { label: 'Discută cu noi', to: '/contact?subiect=companie' },
            },
            {
              icon: 'bi-lightbulb',
              title: 'Expertiză',
              text: 'Proiectare, structură, instalații, acte sau organizare: dacă aveți specialiști care pot sta o oră cu noi, ne ajută enorm.',
              cta: { label: 'Discută cu noi', to: '/contact?subiect=companie' },
            },
            {
              icon: 'bi-people',
              title: 'Voluntariat de echipă',
              text: 'O echipă de colegi poate lucra o zi pe șantier sau se poate ocupa de partea de organizare, cu îndrumarea celor care coordonează lucrările.',
              cta: { label: 'Discută cu noi', to: '/contact?subiect=companie' },
            },
          ],
          cta: { label: '', to: '' },
        },
        'companii-sprijin',
      ),
      textBlock(
        'criterii',
        'Cum lucrăm',
        'Ce criterii folosim',
        'Când alegem ce proiecte și ce colaborări ducem mai departe ne uităm la trei lucruri:\n\nObiectivitate. Pornim de la nevoia reală a familiei și de la starea tehnică a lucrării, nu de la cine ne-a recomandat cazul sau colaborarea.\n\nTransparență. Spunem pe ce s-au folosit banii și materialele și publicăm datele asociației. Cine ne întreabă primește un răspuns clar.\n\nIndependență. Nu acceptăm un sprijin care ne-ar obliga să favorizăm o firmă, un produs sau o persoană și nu facem recomandări comerciale în schimbul unei donații.',
        { label: '', to: '' },
        'companii-criterii',
      ),
      ctaBand(
        'Vrei să colaborăm?',
        'Scrie-ne ce ați putea oferi: o sumă, materiale, servicii, expertiză sau timpul echipei. Îți răspundem cu pașii concreți.',
        { label: 'Scrie-ne despre colaborare', to: '/contact?subiect=companie' },
      ),
    ],
    {
      id: 'implica-te-companii',
      description:
        'Cum poate ajuta o firmă: sponsorizări, materiale și servicii, expertiză sau voluntariat de echipă, după criterii clare de obiectivitate, transparență și independență.',
      showInNav: false,
    },
  ),
]

/* ------------------------------------------------------------------ */
/* Import                                                             */
/* ------------------------------------------------------------------ */

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-')

const writeAtomic = async (file, value) => {
  const temporary = `${file}.tmp-${process.pid}`
  await fs.writeFile(temporary, value, 'utf8')
  await fs.rename(temporary, file)
}

const main = async () => {
  const raw = await fs.readFile(CONTENT_FILE, 'utf8')
  const db = JSON.parse(raw)

  if (!db || typeof db !== 'object' || !db.site) {
    throw new Error('content.json nu are structura așteptată (lipsește „site”).')
  }

  /* 1. Backup, înainte de orice modificare. */
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  const backupFile = path.join(BACKUP_DIR, `content-${timestamp()}.json`)
  await fs.writeFile(backupFile, raw, 'utf8')

  const site = db.site

  /* 2. Datele legale ale asociației. */
  site.legal = {
    ...(site.legal || {}),
    name: 'ASOCIAȚIA GREENTECH EDU',
    cif: '54940308',
    registry: 'Registrul Asociațiilor și Fundațiilor — Judecătoria Sectorului 1 București',
    address: 'București, Sector 1, Calea Floreasca nr. 194, etaj 4',
    representative: 'Alexandru Nicolae, Președinte',
    iban: 'RO65BACX0000004211039001',
    bank: 'UniCredit Bank',
  }

  /* 3. Datele de contact (telefonul rămâne gol până la confirmare). */
  site.contact = {
    ...(site.contact || {}),
    email: 'help@greentechcharity.ro',
    phone: '',
    address: 'București, Sector 1, Calea Floreasca nr. 194, etaj 4',
  }

  /* 4. Social: păstrăm valorile existente, completăm doar cheile lipsă. */
  const social = site.social && typeof site.social === 'object' ? site.social : {}
  ;['facebook', 'instagram', 'linkedin'].forEach((key) => {
    if (typeof social[key] !== 'string') social[key] = ''
  })
  site.social = social

  /* 5. Navigația. */
  if (Array.isArray(site.nav)) {
    site.nav = site.nav.map((item) => {
      if (!item) return item
      if (item.label === 'Despre noi') return { ...item, to: '/despre-asociatie' }
      if (item.label === 'Cum ajuți') return { ...item, to: '/implica-te' }
      return item
    })
  }

  /* 6. Footer: linkuri către paginile noi, restul conținutului rămâne. */
  if (site.footer && typeof site.footer === 'object') {
    site.footer.joinCta = { label: 'Implică-te', to: '/implica-te' }
    site.footer.exploreLinks = syncLinks(
      site.footer.exploreLinks,
      {
        '/#about': { label: 'Despre noi', to: '/despre-asociatie' },
        '/#causes': { label: 'Cum poți ajuta', to: '/implica-te' },
      },
      [link('Datele asociației', '/date-asociatie')],
    )
    site.footer.bottomLinks = syncLinks(
      site.footer.bottomLinks,
      {
        '/contact#date-asociatie': { label: 'Date de identificare', to: '/date-asociatie' },
      },
      [link('Despre noi', '/despre-asociatie'), link('Implică-te', '/implica-te')],
    )
  }

  /* 7. Paginile instituționale (după slug, fără duplicate). */
  const newPages = buildPages(db)
  newPages.forEach((item) => upsertPage(db, item))

  /* 8. Prima pagină: secțiunea „causes” devine cardsGrid cu cele 2 direcții. */
  const pages = Array.isArray(db.pages) ? db.pages : []
  const home = pages.find((item) => item && item.slug === '/')
  if (home && Array.isArray(home.sections)) {
    const causesIndex = home.sections.findIndex(
      (s) => s && (s.type === 'causes' || s.id === 'causes-1' || (s.data && s.data.anchor === 'causes')),
    )
    const causes = homeCausesSection()
    if (causesIndex === -1) {
      home.sections.push(causes)
    } else {
      const previousId = home.sections[causesIndex].id
      home.sections[causesIndex] = { ...causes, id: previousId || causes.id }
    }
  }

  /* 9. Verificări înainte de scriere. */
  const slugs = new Set()
  pages.forEach((item) => {
    if (!item || !item.slug) return
    if (slugs.has(item.slug)) throw new Error(`Slug duplicat: ${item.slug}`)
    slugs.add(item.slug)
    ;(item.sections || []).forEach((s) => {
      if (!s || !s.id || !s.type || !s.data) {
        throw new Error(`Secțiune invalidă în pagina ${item.slug}.`)
      }
    })
  })

  /* 10. Scriere atomică. */
  const output = `${JSON.stringify(db, null, 2)}\n`
  await writeAtomic(CONTENT_FILE, output)

  console.log(`Backup:  ${path.relative(ROOT, backupFile)}`)
  console.log(`Scris:   ${path.relative(ROOT, CONTENT_FILE)}`)
  console.log(`Pagini:  ${pages.length} (${newPages.map((p) => p.slug).join(', ')})`)
}

main().catch((error) => {
  console.error(`Import eșuat: ${error.message}`)
  process.exitCode = 1
})
