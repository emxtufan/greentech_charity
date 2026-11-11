# Panoul de cereri GREENTECH Charity

Panoul este disponibil la `/admin/`. Formularele publice trimit cererile la
`/api/submissions`, iar administrarea lor se face prin `/api/admin`.

Nu este folosita o baza de date. Cererile sunt pastrate intr-un fisier JSON
privat pe server, configurat prin `SUBMISSIONS_FILE`.

## Configurare

1. Copiaza `.env.example` intr-un fisier numit `.env`.
2. Completeaza variabilele:

   - `ADMIN_USERNAME`: utilizatorul cu care intri in `/admin/`;
   - `ADMIN_PASSWORD`: o parola unica de minimum 10 caractere;
   - `ADMIN_SESSION_SECRET`: secret aleator de minimum 32 de caractere, folosit
     pentru semnarea sesiunii de administrare;
   - `SUBMISSION_HASH_SECRET`: alt secret aleator de minimum 32 de caractere,
     folosit pentru protectia anti-abuz;
   - `SUBMISSIONS_FILE`: calea catre fisierul privat cu cereri. Valoarea
     recomandata este `storage/form-submissions.json`;
   - `PORT` si `HOST`: portul si interfata pe care asculta serverul Node.

### Notificari Gmail SMTP

Fiecare formular valid este salvat mai intai in fisierul privat si apoi trimis
prin SMTP. Completeaza in `.env` variabilele `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USER`, `SMTP_PASSWORD`,
`SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` si `SMTP_TO` din `.env.example`.

Pentru `aigreentech1@gmail.com`, activeaza verificarea in doi pasi si genereaza
o **Google App Password**. Pune parola de aplicatie in `SMTP_PASSWORD`; nu folosi
parola obisnuita a contului Gmail. Expeditorul ramane contul autentificat, iar
adresa completata de solicitant este setata automat ca `Reply-To`.

Configuratia solicitata foloseste `smtp.gmail.com`, portul `25` si STARTTLS.
Daca furnizorul VPS blocheaza traficul SMTP pe portul 25, schimba numai
`SMTP_PORT=587`; `SMTP_SECURE=false` si `SMTP_REQUIRE_TLS=true` raman valabile.

Poti verifica fara a expune secretele:

```bash
curl -s http://127.0.0.1:3002/healthz
```

Raspunsul trebuie sa contina `"smtpConfigured":true`. Livrarea reala trebuie
confirmata prin trimiterea unui formular de test si verificarea inboxului.

Fisierul `.env` este exclus din Git. Nu introduce parola sau secretele in
HTML, JavaScript public ori intr-un commit.

## Rulare locala

```bash
npm run dev
```

Deschide site-ul la `http://localhost:3000`, iar panoul la
`http://localhost:3000/admin/`.

## Rulare in productie

```bash
npm run build
npm start
```

Aplicatia trebuie publicata pe un server Node cu disc persistent. Un mediu
serverless cu sistem de fisiere temporar nu poate pastra permanent cererile.
Directorul `storage/` nu este servit public de aplicatie.

Fa periodic backup fisierului configurat in `SUBMISSIONS_FILE`. La restaurare,
opreste serverul, inlocuieste fisierul cu copia valida si porneste din nou
aplicatia.

## Ce se salveaza

Sunt centralizate cererile de donatie, voluntariat, parteneriat, contact si
newsletter. Administratorul poate cauta si filtra cererile, le poate vedea
campurile si poate seta starea la `noua`, `in_lucru`, `contactata`,
`finalizata` sau `spam`, impreuna cu note interne.
