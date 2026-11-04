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
