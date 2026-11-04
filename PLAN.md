# PLAN — Admin vizual (CMS inline) Greentech Charity
## Obiectiv
Admin logat vede site-ul normal; în „Edit mode” fiecare text/imagine/link are buton ✎ la hover. Poate încărca poze, schimba texte, adăuga/șterge/reordona itemi din liste, secțiuni și pagini. Salvare pe server Node propriu.

## Decizii
- Backend: `server/` Express (ESM), port 3001 (env PORT). Vite proxy `/api` și `/uploads` → http://localhost:3001.
- Date: `server/data/content.json` (sursa adevărului). La fiecare PUT: backup în `server/data/backups/content-<timestamp>.json`, păstrează ultimele 20.
- Upload: multer → `server/uploads/<uuid>.<ext>`; doar image/jpeg, image/png, image/webp, image/gif (FĂRĂ svg); max 5MB; răspuns `{url:"/uploads/<fișier>"}`.
- Auth admin separat de auth-ul vizitatorilor: POST /api/admin/login {password} vs env ADMIN_PASSWORD (crypto.timingSafeEqual pe hash sha256), JWT (jsonwebtoken, secret env JWT_SECRET sau random la pornire, expiră 8h). Rate-limit login: 5 încercări/minut/IP (în memorie). Token în localStorage `wc_admin_token`, header `Authorization: Bearer`.
- Env server: `.env.local` (gitignored) apoi `.env`. `.env.example` documentează PORT, ADMIN_PASSWORD, JWT_SECRET.
- API: GET /api/content (public) · PUT /api/content (admin; body = tot conținutul; validare: obiect cu `site` obiect și `pages` array; limită 2mb) · POST /api/upload (admin) · POST /api/admin/login · GET /api/admin/me (admin) → {ok:true}.
- Producție: `npm start` = server care servește și `dist/` cu fallback SPA.
- Securitate front: texte randate ca text (niciodată dangerouslySetInnerHTML); linkuri sanitizate (permis doar `/`, `#`, `http(s):`, `mailto:`, `tel:`), imagini: nume de asset bundle, `/uploads/...` sau `https://...`.

## Model conținut (content.json)
```
{ "site": { "name": "Greentech Charity",
            "nav": [ {"label":"Home","to":"/"}, ... ],
            "header": { "ctaLabel":"Become a Volunteer", "ctaTo":"/register" },
            "footer": { ...texte, "exploreLinks":[{label,to}], "phones":[...], "address":"...", "socials":[{icon,to}], "bottomLinks":[{label,to}] } },
  "pages": [ { "id":"home", "slug":"/", "title":"Home", "showInNav":true,
               "sections":[ { "id":"<unic>", "type":"hero", "hidden":false, "data":{...} }, ... ] } ] }
```
- Imagini în data: string (`"img_06.jpg"` = asset din src/assets/images, sau `"/uploads/x.jpg"`). Helper `resolveImg()`.
- Tipuri de secțiuni (registry `src/sections/registry.js`: type → {component, label, defaultData}): hero, features, about, stats, causes, impact, events, testimonials, donate, blog, newsletter (+ `richText` simplu: titlu + paragraf, pentru pagini noi).

## Front-end
- `src/utils/path.js`: getIn(obj,path), setIn(obj,path,value) imutabil, moveItem, removeAt, insertAt.
- `src/context/ContentContext.jsx` + `src/hooks/useContent.js`: content, loading, isAdmin, editMode, setEditMode, update(path,value), dirty, save(), discard(), undo() (istoric 50).
- `src/components/editable/`: `Scope` (context cu path de bază), `EditableText` (field, as, className, multiline, numeric), `EditableImage` (field, asBackground, className, alt), `EditableLink` (field → {label,to}), `EditableList` (field, renderItem, newItem, className, as) cu toolbar per item (↑ ↓ ⧉ 🗑) și „+ Add”. Toate: în afara edit mode randează normal.
- Edit mode: contur punctat la hover + buton ✎; linkurile navighează normal (editare doar prin ✎); carousel fără autoplay/drag.
- Admin UI: `/admin` (login), `AdminBar` fix jos (Edit mode on/off, Pages, Undo, Discard, Save cu indicator nesalvat, Logout), `SectionToolbar` per secțiune (↑ ↓ ascunde ⧉ 🗑 „+ Secțiune dedesubt” cu picker de tipuri), `PagesPanel` (listă pagini, adaugă {title, slug}, șterge (nu home), showInNav, deschide).
- Rute: paginile din content randate de `PageRenderer` după slug; /login, /register, /dashboard, /admin rămân fixe; altfel NotFound.

## Pași
1. [x] Backend server/ + proxy + scripts (concurrently) + .env.example
2. [x] Seed content.json extras din componentele actuale
3. [x] Core front: path utils, ContentContext, services, editable/*
4. [x] Refactor secțiuni → data + editables, registry
5. [x] Navbar/Footer din content.site
6. [x] Admin UI: /admin, AdminBar, SectionToolbar, PagesPanel, PageRenderer, rute
7. [x] Build + test vizual + rebuild_map

## Probleme deschise
- Parola admin: utilizatorul setează ADMIN_PASSWORD (și JWT_SECRET) în .env.local
- Navbar se aglomerează când se adaugă multe pagini în meniu (CTA trece pe 2 rânduri ~1440px)

# Etapa 2 — Misiunea „case modulare” + Formularul 230
## Decizii
- Tot conținutul public în română, scris de șef; muncitorul doar îl inserează.
- Secțiuni noi generice în src/components/sections/: IntroHero, PageHeader, TextBlock, CardsGrid, Steps, Faq, CtaBand, Updates, ContactForm, OrgInfo, Form230Data. Fiecare: export default + defaultData, editabile prin src/components/editable, acceptă `anchor` (id pe root).
- Secțiunile vechi din șablon (cifre, testimoniale, evenimente inventate) rămân în registry ca `legacy`, ascunse din pickerul de secțiuni.
- Fără colectare online de Formulare 230: lipsesc semnătura validă, sistemul securizat și datele legale confirmate. Pagina /formular-230 explică, trimite la formularul oficial ANAF și afișează datele asociației din site.legal doar când sunt completate.
- Date asociație în content.site.legal {name, cif, registry, address, iban, bank, representative} și content.site.contact {email, phone, address}. Câmpurile goale nu se afișează public.
- Formular de contact real: POST /api/messages → server/data/messages.json (gitignored), acces doar admin (JWT), ștergere automată după 12 luni, fără logarea conținutului.
- Pagini: / , /case-modulare , /formular-230 , /proiecte , /contact , /confidentialitate.

## Pași
1. [x] API mesaje + admin inbox
2. [x] Secțiuni generice
3. [x] Registry, Navbar, Footer, meta, NotFound în română
4. [x] Conținut content.json (toate paginile)
5. [x] Verificare desktop/mobil, recitire texte

## De confirmat de organizație
- Denumirea legală, CIF, sediu, nr. Registrul asociațiilor, IBAN, email, telefon
- Înscrierea în Registrul entităților/unităților de cult pentru care se acordă deduceri fiscale (Formular 163)
- Dacă formularea „Suntem la început” descrie situația reală
- Imaginea de fundal din footer (copil, din șablon) poate fi înlocuită cu o fotografie proprie sau cu fundal simplu
- Paginile vechi /login, /register, /dashboard (conturi de vizitatori simulate, în engleză) nu mai apar în meniu; de decis dacă se șterg
