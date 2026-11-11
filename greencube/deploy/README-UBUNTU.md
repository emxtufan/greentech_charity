# Deploy Ubuntu: Nginx, systemd si Cloudflare

Aceasta configuratie separa responsabilitatile:

- Nginx livreaza direct continutul din `dist/`, inclusiv GLB-ul mare si byte ranges;
- procesul Node asculta numai pe `127.0.0.1:3002` si gestioneaza `/api/*` si `/healthz`;
- Cloudflare cache-uieste explicit modelul GLB versionat;
- cererile de formular sunt pastrate in `/var/lib/greentech-charity`, in afara release-urilor.

Nginx si CDN-ul optimizeaza transferul. Decodarea GLB, imaginile si uploadul texturilor in GPU au loc in browser, nu pe Ubuntu.

## 1. Cerinte

- Ubuntu cu Nginx si systemd;
- Node.js `>=22.12.0 <25` instalat ca `/usr/bin/node`;
- Git LFS;
- npm cu `package-lock.json` sau Bun cu `bun.lock`;
- DNS proxat prin Cloudflare;
- certificat TLS valid la origin si modul Cloudflare SSL/TLS `Full (strict)`.

Verifica versiunile:

```bash
node --version
npm --version
git lfs version
nginx -v
```

Repo-ul trebuie sa contina un `package-lock.json` inainte de folosirea `npm ci`. Versiunea curenta are `bun.lock`, deci foloseste Bun cu `--frozen-lockfile` pana cand proiectul adopta si comite explicit un lockfile npm. Nu executa un install nereproductibil in timpul unui deploy critic.

## 2. Utilizator si directoare

```bash
sudo useradd --system --user-group --home-dir /srv/greentech-charity --shell /usr/sbin/nologin greentech-charity
sudo install -d -o greentech-charity -g www-data -m 0750 /srv/greentech-charity
sudo install -d -o greentech-charity -g www-data -m 0750 /srv/greentech-charity/releases
sudo install -d -o root -g greentech-charity -m 0750 /etc/greentech-charity
sudo install -d -o root -g root -m 0750 /etc/greentech-charity/tls
```

Daca utilizatorul exista deja, nu repeta `useradd`. Nu rula aplicatia ca `root`.

## 3. Secrete si stare persistenta

Copiaza sablonul, completeaza valorile direct pe server si limiteaza permisiunile:

```bash
sudo install -o root -g greentech-charity -m 0640 \
  deploy/env/greentech-charity.env.example \
  /etc/greentech-charity/greentech-charity.env
sudoedit /etc/greentech-charity/greentech-charity.env
```

Nu salva credentiale in repo, in `dist/`, in unitatea systemd sau in configuratia Nginx. `SUBMISSIONS_FILE` trebuie sa ramana o cale absoluta sub `/var/lib/greentech-charity/`.

Completeaza si blocul `SMTP_*` din fisierul de mediu. Pentru contul Gmail se
foloseste o Google App Password, nu parola normala. Configuratia initiala este
`smtp.gmail.com:25` cu STARTTLS; daca reteaua VPS blocheaza portul 25, foloseste
`SMTP_PORT=587`. Dupa restart, `/healthz` trebuie sa raporteze
`"smtpConfigured":true`, apoi trimite un formular real de test.

Serviciul trebuie sa aiba o singura instanta. Coada de scrieri in fisier este locala procesului; PM2 cluster sau mai multe replici care folosesc acelasi JSON nu sunt acceptate.

## 4. TLS la origin

Instaleaza certificatul si cheia fara a le adauga in Git:

```text
/etc/greentech-charity/tls/origin.crt
/etc/greentech-charity/tls/origin.key
```

Cheia trebuie sa fie citibila numai de `root`. Configuratia furnizata presupune aceste cai. Poti folosi un certificat public sau Cloudflare Origin CA; in ambele cazuri pastreaza Cloudflare in modul `Full (strict)`.

## 5. Construirea unui release

Fiecare deploy se construieste intr-un director nou. Exemplul presupune ca sursa a fost deja clonata in directorul release-ului, fara credentiale incluse in comenzi:

Setarile scenei sunt citite la build, nu la pornirea serviciului:

```dotenv
VITE_SCENE_MODEL_URL=/greencube-original-OE4BBULY.glb
```

Desktopul si mobilul folosesc acelasi model original compact. Runtimeul original
limiteaza automat DPR-ul la 2 si foloseste OffscreenCanvas numai cand browserul
il suporta; nu configura un model mobil separat si nu reduce DPR-ul la 1.

Pentru un origin separat/R2, seteaza inainte de build, de exemplu:

```bash
export VITE_SCENE_MODEL_URL=https://assets.greentechcharity.ro/greencube-original-OE4BBULY.glb
```

Originul de asset-uri trebuie sa accepte `GET`, `HEAD`, `OPTIONS` si byte ranges, sa trimita `Content-Length`, `Accept-Ranges: bytes`, MIME `model/gltf-binary` si CORS pentru `https://greentechcharity.ro`. Pentru diagnosticare expune si `Content-Range`, `Content-Length` si `Accept-Ranges`. Buildul adauga automat `?v=<sha256>` URL-ului, inclusiv daca acesta este extern.

```bash
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
RELEASE_DIR="/srv/greentech-charity/releases/$RELEASE_ID"
cd "$RELEASE_DIR"

git lfs install --local
git lfs pull
git lfs fsck

bun install --frozen-lockfile
bun run lint
bun run build
bun run verify:dist
```

`verify:dist` opreste release-ul daca modelul este numai pointer LFS, daca GLB-ul este corupt, daca lipsesc decodoarele, daca buildul contine Vite development sau daca fingerprintul modelului nu corespunde.

Permite Nginx sa citeasca numai artefactele publice:

```bash
sudo chgrp www-data "$RELEASE_DIR"
sudo chmod 0750 "$RELEASE_DIR"
sudo chgrp -R www-data "$RELEASE_DIR/dist"
sudo find "$RELEASE_DIR/dist" -type d -exec chmod 0750 {} +
sudo find "$RELEASE_DIR/dist" -type f -exec chmod 0640 {} +
```

## 6. Activare atomica

Inspecteaza calea release-ului inainte de schimbarea symlinkului:

```bash
readlink -f "$RELEASE_DIR"
test -f "$RELEASE_DIR/dist/index.html"
test -f "$RELEASE_DIR/dist/greencube-original-OE4BBULY.glb"

sudo ln -s "$RELEASE_DIR" /srv/greentech-charity/current.next
sudo mv -Tf /srv/greentech-charity/current.next /srv/greentech-charity/current
```

Nginx va vedea release-ul complet la urmatoarea cerere; nu exista o perioada in care serveste un `dist/` partial construit.

## 7. systemd

```bash
sudo install -o root -g root -m 0644 \
  deploy/systemd/greentech-charity.service \
  /etc/systemd/system/greentech-charity.service

sudo systemctl daemon-reload
sudo systemctl enable --now greentech-charity.service
sudo systemctl status greentech-charity.service
journalctl -u greentech-charity.service -n 100 --no-pager
```

Unitatea porneste Node numai pe loopback si ruleaza smoke testul local dupa start. Daca `node` nu este `/usr/bin/node`, actualizeaza ambele comenzi `ExecStart` si `ExecStartPost` cu rezultatul `command -v node`.

## 8. Nginx

```bash
sudo install -o root -g root -m 0644 \
  deploy/nginx/greentech-charity.conf \
  /etc/nginx/sites-available/greentech-charity.conf

sudo ln -s /etc/nginx/sites-available/greentech-charity.conf \
  /etc/nginx/sites-enabled/greentech-charity.conf

sudo nginx -t
sudo systemctl reload nginx
```

Configuratia:

- foloseste `sendfile` pentru fisiere statice;
- proxiaza numai `/api/` si `/healthz`;
- livreaza GLB ca `model/gltf-binary`, cu `Content-Length` si byte ranges;
- nu comprima GLB-ul;
- nu expune `storage/` sau fisiere ascunse;
- nu cache-uieste HTML, bootstrapul stabil, adminul sau API-ul.

Restrictioneaza accesul direct la origin prin firewall la retelele Cloudflare sau activeaza Authenticated Origin Pulls. Daca originul ramane accesibil direct, nu te baza pe antete furnizate de client pentru IP-ul real.

## 9. Cloudflare Cache Rules

Seteaza global `Browser Cache TTL` la `Respect existing headers`/`Respect origin`, apoi creeaza regulile in aceasta ordine.

### Bypass pentru continut dinamic

```text
(http.host in {"greentechcharity.ro" "www.greentechcharity.ro"} and
 (starts_with(http.request.uri.path, "/api/") or
  starts_with(http.request.uri.path, "/admin/") or
  http.request.uri.path eq "/healthz"))
```

Setare: `Cache eligibility: Bypass cache`.

### Cache pentru model

```text
(http.host in {"greentechcharity.ro" "www.greentechcharity.ro"} and
 http.request.uri.path eq "/greencube-original-OE4BBULY.glb")
```

Setari:

- `Cache eligibility: Eligible for cache`;
- `Edge TTL: Use cache-control header if present`;
- `Browser TTL: Respect origin`;
- pastreaza cheia de cache implicita.

Cheia implicita include query string-ul `?v=<hash>`. Nu activa `Ignore Query String`, deoarece versiunea este mecanismul de invalidare. Pune regula modelului dupa orice regula generala care modifica eligibilitatea.

Dupa deploy, primul transfer complet poate fi `MISS`; urmatoarea cerere din acelasi punct Cloudflare trebuie sa devina `HIT`. Sterge din cache vechile versiuni de `index.js`, `index.css` si `stage-worker.js` dupa corectarea regulilor existente.

## 10. Health checks

Origin/Node:

```bash
npm run smoke:production -- http://127.0.0.1:3002
```

Domeniu public si CDN:

```bash
SMOKE_REQUIRE_CDN=true npm run smoke:production -- https://greentechcharity.ro
```

Smoke testul nu descarca modelul complet. Foloseste `HEAD` si un singur range de 1024 bytes si verifica:

- `/healthz` este `200` si `no-store`;
- nu exista `/@vite/client` sau `/src/main.tsx`;
- bootstrapul are politica de revalidare;
- modelul are MIME, dimensiune, cache si `Accept-Ranges` corecte;
- range-ul raspunde `206`, incepe cu `glTF` si are `Content-Range` corect;
- modelul nu ramane `DYNAMIC`/`BYPASS` la Cloudflare.

## 11. Rollback

Pastreaza cel putin release-ul anterior. Pentru rollback, rezolva si verifica explicit calea lui, apoi schimba acelasi symlink atomic:

```bash
PREVIOUS_RELEASE=/srv/greentech-charity/releases/RELEASE_ID_VERIFICAT
readlink -f "$PREVIOUS_RELEASE"
test -f "$PREVIOUS_RELEASE/dist/index.html"

sudo ln -s "$PREVIOUS_RELEASE" /srv/greentech-charity/current.next
sudo mv -Tf /srv/greentech-charity/current.next /srv/greentech-charity/current
sudo systemctl restart greentech-charity.service
npm run smoke:production -- https://greentechcharity.ro
```

Nu sterge release-ul curent pana cand health checkul si formularele nu au fost verificate. Fisierul din `/var/lib/greentech-charity/` ramane neschimbat la deploy si rollback si trebuie inclus in backupuri regulate.

## 12. Verificare continua pe Linux

Workflow-ul `.github/workflows/linux-build.yml` ruleaza checkout cu Git LFS, `bun ci`, lint, build si `verify:dist` pe `ubuntu-latest`. Astfel, un pointer LFS, o diferenta de litere mari/mici sau un artefact de productie lipsa opreste schimbarea inainte de deploy.
