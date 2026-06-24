# 🎨 Galerie à Ciel Ouvert

PWA mobile-first pour explorer les fresques et street art du quartier — Antananarivo.

## Stack

- **React + Vite** — UI
- **react-leaflet** — carte interactive (tuiles OSM, gratuit)
- **Supabase** — base de données + storage photos
- **qrcode** — génération QR code côté client
- **vite-plugin-pwa** — installable sur mobile (Android/iOS)

## Lancer en local

```bash
npm install
cp .env.example .env   # remplis tes clés Supabase
npm run dev
```

Sans `.env`, l'app tourne en **mode démo** avec des données fictives.

## Supabase — mise en place

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Va dans **SQL Editor** et colle le contenu de `supabase-schema.sql`
3. Copie l'URL et la clé anon dans ton `.env`

## Structure des pages

| Route | Page |
|-------|------|
| `/` | Accueil + liste des fresques |
| `/carte` | Carte Leaflet interactive |
| `/fresque/:slug` | Fiche fresque + QR code |
| `/artistes` | Liste du crew |
| `/artiste/:id` | Profil artiste |
| `/admin` | Ajouter fresque / artiste |

## Déploiement Netlify

```bash
npm run build
# drag & drop le dossier dist/ sur netlify.com
# ou connecte le repo GitHub
```

Variables d'environnement à configurer dans Netlify :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## QR codes

Depuis l'admin (`/admin`), après avoir ajouté une fresque :
1. Le QR code est généré automatiquement
2. Télécharge le PNG
3. Imprime et colle sur le mur !

Depuis la fiche fresque (`/fresque/:slug`), n'importe quel membre du crew peut aussi télécharger le QR.
