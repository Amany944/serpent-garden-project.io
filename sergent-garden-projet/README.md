# Serpent Garden — version React

Portage React (Vite) du jeu Snake « Serpent Garden », sans modification du code source d'origine.

## Stack

- **React 19** + **Vite 8** + `@vitejs/plugin-react`
- **react-router-dom** (navigation Accueil / Jeu / Aide)
- **PHP 8 + SQLite** : backend de scores repris à l'identique (`api/`)
- **Font Awesome 6.7.2** via CDN (identique à l'original)
- **oxlint** pour le lint

## Architecture

```
sergent-garden-projet/
├── api/                  # Backend PHP/SQLite (copie conforme de Serpent-Garden/api)
│   ├── db.php            # Connexion SQLite + schéma
│   ├── index.php         # API principale (GET stats, POST score)
│   └── score.php         # Alias d'entrée
├── data/                 # Base SQLite (générée automatiquement, ignorée par git)
├── public/
│   └── help.txt          # Guide affiché sur la page Aide
├── scripts/
│   └── start-all.bat     # Lance API PHP + Vite (dev Windows)
├── src/
│   ├── game/
│   │   └── snakeGame.js  # Moteur de jeu (portage fidèle de assets/js/game.js)
│   ├── lib/
│   │   └── api.js        # Client API (portage fidèle de assets/js/api.js)
│   ├── pages/
│   │   ├── HomePage.jsx  # Accueil (portage de index.html + home.js)
│   │   ├── GamePage.jsx  # Jeu (portage de game.html + game.js)
│   │   └── HelpPage.jsx  # Aide (portage de help.html)
│   ├── styles/
│   │   ├── tailwind.css            # Copie conforme de assets/css/tailwind.css
│   │   ├── style.css               # Copie conforme de assets/css/style.css
│   │   ├── home-enhancements.css   # Design des boutons de l'accueil (scoped .home-layout)
│   │   └── game-enhancements.css   # Design de la page jeu (scoped .page-shell--game)
│   ├── App.jsx           # Routes (/ , /jeu , /aide)
│   └── main.jsx          # Point d'entrée React
└── vite.config.js        # Proxy /api → serveur PHP (dev)
```

## Lancement en développement

Deux terminaux (ou `scripts\start-all.bat` sous Windows) :

```bash
# Terminal 1 — API PHP (sert le dossier api/)
npm run api

# Terminal 2 — Frontend Vite
npm run dev
```

Puis ouvrir l'URL affichée par Vite (http://localhost:5173).

- La navigation se fait via les routes `#/`, `#/jeu`, `#/aide`.
- Les appels à `api/score.php` sont relayés par le proxy Vite vers le serveur PHP.
- La base SQLite est créée automatiquement dans `data/snake.sqlite` (à la racine du projet) après la première partie terminée.

> **Note :** pour reproduire le comportement d'origine (chemin `api/score.php` relatif), le plus
> simple reste d'utiliser le proxy Vite fourni ; en production, voir la section Déploiement.

## Scripts npm

| Script         | Rôle                                          |
| -------------- | --------------------------------------------- |
| `npm run dev`  | Serveur de développement Vite (frontend)      |
| `npm run api`  | Serveur PHP embarqué sur `127.0.0.1:8000` (`api/` en racine) |
| `npm run build`| Build de production dans `dist/`              |
| `npm run preview` | Prévisualise le build de production        |
| `npm run lint` | Lint oxlint                                   |

## Déploiement

Le build Vite produit des fichiers statiques (`dist/`). Comme le frontend appelle l'API via le
chemin relatif `api/score.php`, il suffit de servir `dist/` **et** le dossier `api/` ensemble,
par exemple avec le serveur PHP :

```bash
npm run build
php -S 0.0.0.0:8000 -t dist api
```

- `http://localhost:8000/` → application React
- `http://localhost:8000/api/score.php` → API (dossier `api/` servi après `dist/`)

Le routeur utilise le mode *hash* (`#/jeu`) : aucun rewrite serveur n'est nécessaire.
