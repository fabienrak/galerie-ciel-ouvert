# 🎨 Galerie à Ciel Ouvert - ANKADIVATO

Galerie à ciel ouvert dans le quartier d'Ankadivato Antananarivo 101. 
Transformer le quartier en Vraie galerie d'art (Street Art, Graffiti, Fresque, ...) pour les publics. Projet initié par les Crews, cette application est une guide pour les traces de ces art dans le quartier

## Stack technique

---

## 📸 Aperçu

| Splash | Accueil | Carte | Fresque | Artiste |
|--------|---------|-------|---------|---------|
| Animation AKDVT | Slideshow fresques | Mapbox custom | Viewer 3D 360° | Bio + réseaux |

---

## ✨ Fonctionnalités

### Côté public
- **Splash screen animé** — les lettres AKDVT se tracent trait par trait en style graffiti au lancement
- **Page d'accueil** avec slideshow automatique des fresques en arrière-plan (effet Ken Burns)
- **Carte interactive Mapbox** avec style custom, bâtiments 3D, markers pill-style et bottom sheet
- **Fiche fresque** avec viewer panoramique 3D (Three.js) — drag, pinch zoom, gyroscope mobile
- **Profil artiste** avec bio, spécialité, liens réseaux sociaux (Instagram, SoundCloud, YouTube)
- **QR code** téléchargeable sur chaque fiche fresque pour coller sur le mur physique
- **PWA installable** sur Android et iOS avec cache offline des tuiles carte

### Côté admin (accès restreint)
- Interface protégée par mot de passe (route `/admin`, absente du menu public)
- Formulaire d'ajout de fresque (titre, description, coordonnées GPS, photo, tags, artiste)
- Formulaire d'ajout d'artiste (bio, photo, liens sociaux)
- Génération automatique du QR code après ajout d'une fresque

---

## 🛠 Stack technique

| Couche | Techno | Version |
|--------|--------|---------|
| UI Framework | React | 18.3 |
| Build | Vite | 5.4 |
| Routing | React Router DOM | 6.26 |
| Carte | Mapbox GL JS | 3.x |
| 3D / Panorama | Three.js | 0.184 |
| Backend | Supabase (PostgreSQL + Storage) | 2.45 |
| QR Code | qrcode | 1.5 |
| Icons | Lucide React | 0.447 |
| PWA | vite-plugin-pwa + Workbox | 0.20 |
| Font | Knewave (Google Fonts) | — |
| Deploy | Netlify | — |

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- Un projet [Supabase](https://supabase.com) (gratuit)
- Un token [Mapbox](https://mapbox.com) (gratuit, 50k vues/mois)

### Installation

```bash
git clone <repo>
cd galerie-ciel-ouvert
npm install
cp .env.example .env
```

### Variables d'environnement

Remplis `.env` avec tes clés :

```env
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...ta-cle-anon
VITE_MAPBOX_TOKEN=pk.eyJ1...ton-token-mapbox
```

> **Sans ces variables**, l'app tourne en **mode démo** avec 5 fresques et 4 artistes fictifs — pratique pour développer sans backend.

### Lancer en local

```bash
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

## Déploiement Netlify (Actuellement)

```bash
npm run build
npm run preview  # tester le build localement
```

---

## 🗄 Base de données Supabase

### Schéma

Colle le contenu de `supabase-schema.sql` dans **SQL Editor → Run** :

```sql
-- Tables créées :
-- artistes (id, nom, specialite, bio, photo_url, instagram, soundcloud, youtube)
-- fresques  (id, slug, titre, description, lat, lng, adresse, photo_url, tags[], artiste_id)
```

### Données de démo

Pour peupler la base avec 4 artistes et 6 fresques de test :

```sql
-- Colle le SQL de seed depuis la section "Données exemple" du projet
-- Les coordonnées sont centrées sur Ankadivato (-18.9137, 47.5361)
```

### RLS (Row Level Security)

Le schéma configure automatiquement :
- **Lecture publique** — tout le monde peut voir les fresques et artistes
- **Écriture authentifiée** — seuls les utilisateurs connectés peuvent ajouter du contenu

Pour désactiver RLS en développement :

```sql
alter table artistes disable row level security;
alter table fresques  disable row level security;
```

---

## 📁 Structure du projet

```
src/
├── components/
│   ├── AdminGate.jsx      # Protection mot de passe de la route /admin
│   ├── Layout.jsx         # Navigation bottom bar (Carte / Accueil / Artistes)
│   ├── PanoViewer.jsx     # Viewer 3D panoramique (Three.js, drag, gyro, zoom)
│   └── SplashScreen.jsx   # Animation AKDVT style graffiti au lancement
├── pages/
│   ├── HomePage.jsx       # Hero slideshow + liste des fresques
│   ├── MapPage.jsx        # Carte Mapbox GL JS avec markers et bottom sheet
│   ├── FrequePage.jsx     # Fiche fresque + PanoViewer + QR code
│   ├── ArtistesPage.jsx   # Liste du crew
│   ├── ArtistePage.jsx    # Profil artiste + ses fresques
│   └── AdminPage.jsx      # Interface admin (ajout fresque / artiste)
├── lib/
│   └── supabase.js        # Client Supabase + mock data + fonctions CRUD
├── App.jsx                # Router React
├── main.jsx               # Entry point + SplashScreen wrapper
└── index.css              # Variables CSS, thème dark, animations globales
```

---

## 🗺 Routes

| URL | Page | Accès |
|-----|------|-------|
| `/` | Accueil | Public |
| `/carte` | Carte interactive | Public |
| `/fresque/:slug` | Fiche fresque | Public |
| `/artistes` | Liste artistes | Public |
| `/artiste/:id` | Profil artiste | Public |
| `/admin` | Interface admin | Mot de passe |

---

## 🔐 Admin

L'interface admin est accessible via `/admin` (URL directe uniquement, absent du menu).

**Mot de passe par défaut : `galerie2025`**

Pour le changer : `src/components/AdminGate.jsx` ligne 7

```js
const ADMIN_PASSWORD = 'galerie2025'  // ← change ici
```

La session est conservée en `sessionStorage` — expire à la fermeture du navigateur.

---

## 📱 PWA

L'app est installable sur mobile comme une app native :

- **Android** — Chrome affiche "Ajouter à l'écran d'accueil"
- **iOS** — Safari → Partager → Sur l'écran d'accueil

Les tuiles OpenStreetMap sont cachées offline (30 jours, max 500 tuiles).

---

## 🖨 QR Codes

Workflow pour placer un QR code sur un mur physique :

1. Aller sur `/admin` → "Ajouter fresque"
2. Remplir le formulaire avec les coordonnées GPS exactes du mur
3. Le QR code est généré automatiquement après soumission
4. Télécharger le PNG → imprimer → coller sur le mur
5. Les passants scannent et arrivent directement sur la fiche

Le QR code est aussi accessible depuis n'importe quelle fiche fresque publique.

---

## 🌐 Déploiement Netlify

```bash
npm run build
# drag & drop du dossier dist/ sur netlify.com
```

Ou connecte le dépôt GitHub et configure :

- **Build command** : `npm run build`
- **Publish directory** : `dist`
- **Variables d'environnement** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN`

---

## 🎨 Design

- **Police** : [Knewave](https://fonts.google.com/specimen/Knewave) (Google Fonts) — utilisée sur tous les textes du site
- **Palette** : Fond `#0a0a0a`, texte `#f5f0e8`, accent rouge `#ff3b1f`, accent jaune `#f5c800`
- **Esthétique** : Street art / graffiti — dark mode, grain de texture, typography bold
- **Style carte** : Custom Mapbox Studio par [@fabienrak](https://mapbox.com)

---

## 👥 Le projet

**Galerie à Ciel Ouvert** est un projet communautaire du quartier Ankadivato, Antananarivo.

- 🎤 Crew RAP & graffiti local
- 🖼 Fresques sur les murs du quartier
- 📱 Application digitale développée par **Fabien** (fullstack dev & FLEX IMPORT)

> *"Le quartier comme musée, la rue comme galerie."*

---

## 📄 Licence

Projet privé — tous droits réservés. Usage réservé au collectif Galerie à Ciel Ouvert.
