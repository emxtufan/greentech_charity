# webcharity

Site-ul Hopeu (non profit charity) rescris în Vite + React (JSX) pornind de la template-ul HTML din `legacy/index.html`.

## Instalare și rulare

```bash
npm install     # instalează dependențele
npm run dev     # server de dezvoltare Vite
npm run build   # build de producție în dist/
npm run preview # previzualizează build-ul
```

## Structura `src/`

```
src/
├── assets/images/      # imagini din template
├── styles/
│   ├── global.css      # intră în main.jsx; importă CSS-ul vendor + stiluri proprii
│   └── vendor/         # bootstrap, style.min.css, responsive.css + fonturi
├── context/            # AuthContext (starea de autentificare)
├── routes/             # AppRoutes (definițiile de rute)
├── App.jsx             # returnează <AppRoutes />
└── main.jsx            # createRoot + BrowserRouter + AuthProvider
```

Aliasul `@` indică `src/` (configurat în `vite.config.js`).

## Autentificare: mock vs API

- Dacă `VITE_API_URL` din `.env` este **gol**, autentificarea rulează în mod **mock**, cu date salvate în `localStorage`.
- Dacă `VITE_API_URL` este setat, request-urile de auth merg către acel API.
