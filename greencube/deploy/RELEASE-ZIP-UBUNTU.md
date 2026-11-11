# Instalare din arhiva ZIP pe Ubuntu

Arhiva de productie contine modelul GLB real in `dist/`. Nu necesita Git sau Git LFS pe server.

Serverul are nevoie de Node.js `>=22.12.0 <25`, Bun si acces la registrul de pachete pentru instalarea dependentelor. Nu copia `node_modules` de pe Windows.

## 1. Incarcare si extragere

Incarca ZIP-ul prin SFTP/SCP intr-un director temporar, apoi creeaza un release nou:

```bash
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
RELEASE_DIR="/srv/greentech-charity/releases/$RELEASE_ID"

sudo install -d -o greentech-charity -g www-data -m 0750 "$RELEASE_DIR"
sudo -u greentech-charity unzip /cale/verificata/greentech-charity-original-1to1-20260901.zip -d "$RELEASE_DIR"
cd "$RELEASE_DIR"
```

Verifica si checksum-ul ZIP-ului incarcat folosind fisierul `.sha256` livrat langa arhiva. Nu extrage arhiva peste release-ul activ si nu include `.env` in ZIP.

## 2. Verificare si dependente

Arhiva include `RELEASE-SHA256SUMS.txt`. Verifica toate fisierele inainte de activare:

```bash
sha256sum --check RELEASE-SHA256SUMS.txt
node scripts/verify-dist.mjs
bun install --production --frozen-lockfile
```

`node scripts/verify-dist.mjs` verifica headerul GLB, dimensiunea declarata, fingerprintul modelului, workerul si artefactele Vite. Nu descarca modelul din retea.

Permite Nginx sa traverseze release-ul si sa citeasca numai buildul public:

```bash
sudo chgrp www-data "$RELEASE_DIR"
sudo chmod 0750 "$RELEASE_DIR"
sudo chgrp -R www-data "$RELEASE_DIR/dist"
sudo find "$RELEASE_DIR/dist" -type d -exec chmod 0750 {} +
sudo find "$RELEASE_DIR/dist" -type f -exec chmod 0640 {} +
```

## 3. Activare atomica

```bash
test -f "$RELEASE_DIR/dist/index.html"
test -f "$RELEASE_DIR/dist/greencube-original-OE4BBULY.glb"

sudo ln -s "$RELEASE_DIR" /srv/greentech-charity/current.next
sudo mv -Tf /srv/greentech-charity/current.next /srv/greentech-charity/current
sudo systemctl restart greentech-charity.service
sudo nginx -t
sudo systemctl reload nginx
```

La prima instalare, copiaza configuratiile si sablonul de mediu conform `deploy/README-UBUNTU.md`. Valorile reale raman exclusiv in `/etc/greentech-charity/greentech-charity.env`.

## 4. Verificare dupa activare

```bash
node scripts/smoke-production.mjs http://127.0.0.1:3002
SMOKE_REQUIRE_CDN=true node scripts/smoke-production.mjs https://greentechcharity.ro
```

Primul request Cloudflare poate fi `MISS`. Dupa popularea cache-ului, modelul trebuie sa devina `HIT`, nu `DYNAMIC` sau `BYPASS`.
