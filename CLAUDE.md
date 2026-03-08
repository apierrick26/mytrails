# MyTrails — Spécifications Projet

## Vue d'ensemble

Application web personnelle permettant à chaque utilisateur de consigner, visualiser et explorer ses activités outdoor et voyages sur une carte interactive. Chaque compte est privé : les données d'un utilisateur ne sont jamais visibles par les autres.

---

## Stack technique

| Couche | Technologie | Raison |
|---|---|---|
| Frontend | React + Vite | Standard moderne, excellent écosystème |
| Carte | Mapbox GL JS | Meilleur support GPX + carte topo + interactions avancées |
| Backend | FastAPI (Python) | Logique métier en Python, traitement GPX |
| Base de données | Supabase (PostgreSQL) | Gratuit, stockage fichiers/photos inclus |
| Auth | Supabase Auth | Login email ou Google, comptes isolés |
| Hébergement front | Vercel | Déploiement gratuit |
| Hébergement back | Railway | Déploiement Python gratuit |

---

## Types d'activités

L'utilisateur peut créer ses propres types d'activités. Les types par défaut à la création du compte sont :

- Voyage / City trip
- Randonnée
- Course à pied
- Vélo / VTT
- Ski / Alpinisme
- Escalade

Chaque type a une couleur et une icône associée (personnalisables).

---

## Fonctionnalités principales

### 1. Carte interactive (page principale)

- Affichage de tous les points et traces de l'utilisateur connecté
- Zoom et navigation libre
- Clic sur un marqueur ou une trace → ouvre un panneau latéral avec le détail

**Sélecteur de fond de carte (bouton en haut à droite) :**

| Nom affiché | Style Mapbox | Usage |
|---|---|---|
| Topographique | mapbox://styles/mapbox/outdoors-v12 | Défaut — rando, trail |
| Satellite | mapbox://styles/mapbox/satellite-streets-v12 | Vue aérienne |
| Classique | mapbox://styles/mapbox/streets-v12 | Voyages, villes |
| Minimaliste | mapbox://styles/mapbox/light-v11 | Lisibilité maximale |
| Nuit | mapbox://styles/mapbox/dark-v11 | Mode sombre |

Le choix est sauvegardé dans les préférences utilisateur (localStorage + Supabase).

**Filtres disponibles (panneau latéral gauche) :**
- Par type d'activité (cases à cocher avec icône + couleur)
- Par année / période (slider ou sélecteur d'année)
- Par pays / région (liste déroulante ou recherche)

### 2. Ajout d'une activité

Quatre méthodes au choix, accessibles via un bouton "+" :

#### A. Import fichier GPX
- Upload d'un fichier .gpx (export Strava, Garmin, Komoot, etc.)
- La trace est affichée sur la carte automatiquement
- **Extraction automatique de toutes les statistiques disponibles dans le fichier :**

| Statistique | Source | Affiché si disponible |
|---|---|---|
| Distance totale | Géométrie GPX | Toujours |
| Dénivelé positif (D+) | Altitude GPX ou modèle élévation | Toujours |
| Dénivelé négatif (D-) | Altitude GPX ou modèle élévation | Toujours |
| Durée totale | Timestamps GPX | Si timestamps présents |
| Durée en mouvement | Timestamps + seuil vitesse nulle | Si timestamps présents |
| Vitesse moyenne | Distance / durée totale | Si timestamps présents |
| Vitesse moyenne en mouvement | Distance / durée en mouvement | Si timestamps présents |
| Vitesse maximale | Pic sur les segments | Si timestamps présents |
| Altitude minimale | Min des points | Si altitude présente |
| Altitude maximale | Max des points | Si altitude présente |
| Fréquence cardiaque moy. / max | Extensions GPX (Garmin, Polar) | Si capteur utilisé |
| Cadence moyenne | Extensions GPX | Si capteur utilisé |
| Puissance moyenne (vélo) | Extensions GPX | Si capteur utilisé |
| Calories | Extensions GPX | Si disponible |
| Nombre de points GPS | Comptage | Toujours |

- Affichage sous forme de **carte de stats** (comme Strava) dans la vue détail de l'activité
- Graphique d'altitude interactif (profil altimétrique scrollable avec survol)
- L'utilisateur complète ensuite les métadonnées (voir section Métadonnées)

#### B. Dessin d'itinéraire sur la carte (sortie déjà réalisée, sans GPX)
Cas d'usage : l'utilisateur a fait une sortie mais n'a pas de fichier GPX — il reconstruit son parcours à la main sur la carte.
- Mode dessin activé sur la carte (curseur change, UI indique clairement "vous dessinez un itinéraire")
- L'utilisateur clique sur la carte pour poser des points de passage un par un
- Les points sont reliés automatiquement en suivant les chemins/routes existants (**snap to road** via Mapbox Directions API) — optionnel, désactivable pour les sentiers hors-piste
- Possibilité d'ajuster un point (drag), en supprimer un, ou en insérer un entre deux existants
- La trace dessinée est traitée exactement comme un GPX importé :
  - Calcul automatique de la distance (à partir de la géométrie)
  - Calcul du D+ / D- à partir du modèle d'élévation Mapbox
  - Pas de données de vitesse ni de fréquence cardiaque (non disponibles sans capteur)
- Export en fichier .gpx possible une fois la trace validée
- L'utilisateur complète ensuite les métadonnées (durée estimée saisie manuellement si souhaité)

#### C. Point unique sur la carte
- Clic simple sur la carte pour poser un marqueur
- Pas de trace, juste une position géographique
- Utile pour : ville visitée, sommet atteint, lieu de souvenir

#### D. Recherche par nom de lieu
- Barre de recherche avec autocomplétion (Mapbox Geocoding API)
- Au fil de la frappe, suggestions de lieux dans le monde entier
- Sélection → pose un marqueur à cet endroit
- L'utilisateur complète ensuite les métadonnées

### 3. Métadonnées d'une activité

Pour chaque activité (quelle que soit la méthode d'ajout), l'utilisateur peut renseigner :

| Champ | Type | Obligatoire |
|---|---|---|
| Titre | Texte | Oui |
| Type d'activité | Sélecteur | Oui |
| Date | Date picker | Oui |
| Pays / Région | Texte (auto-rempli si géocodage) | Non |
| Description / Ressenti | Texte long (textarea) | Non |
| Météo | Sélecteur (Soleil / Nuageux / Pluie / Neige / Orage) + température optionnelle | Non |
| Note personnelle | Étoiles 1 à 5 | Non |
| Photos | Upload multiple (jpg, png, heic) — stockées sur Supabase Storage | Non |
| Vidéos | Upload ou lien URL (YouTube, etc.) | Non |
| Tags libres | Texte libre, multi-tags | Non |

### 4. Vue détail d'une activité

Panneau latéral (ou page dédiée) affichant :
- La trace ou le point centré sur la carte
- Toutes les métadonnées renseignées
- Galerie photos scrollable
- **Carte de statistiques** (si trace GPX ou itinéraire dessiné) :
  - Distance, D+, D-, durée, durée en mouvement
  - Vitesse moyenne, vitesse moy. en mouvement, vitesse max
  - Altitude min / max
  - FC moy/max, cadence, puissance, calories (si données capteur disponibles)
- **Graphique altimétrique interactif** : profil de la trace avec survol (distance + altitude au curseur)
- Boutons : Modifier | Supprimer | Exporter GPX

### 5. Onglet Photos — Galerie intelligente

Page dédiée aux photos, indépendante de la carte. L'idée centrale : **toutes les photos de l'utilisateur sont ici, retrouvables, privées, et ne peuvent pas être perdues.**

#### Stockage et sécurité
- Photos stockées sur **Supabase Storage** avec bucket privé (inaccessible sans token utilisateur)
- Aucune photo n'est publique ou partageable sans action explicite
- Les photos survivent à la suppression d'une activité (conservées dans la galerie comme orphelines)

#### Affichage
- Grille de photos (style Google Photos)
- Tri par date de prise (EXIF) ou date d'upload
- Regroupement automatique par mois / activité
- Clic sur une photo → vue plein écran + métadonnées + activité liée

#### Recherche par IA — deux types

**A. Recherche sémantique (contenu de l'image)**
- Exemples : "photos au ski", "coucher de soleil", "en montagne", "vue sur la mer"
- Technologie : **CLIP** (OpenAI) — chaque photo est convertie en vecteur numérique à l'upload
- Les vecteurs sont stockés dans Supabase avec l'extension **pgvector**
- La recherche texte est convertie en vecteur → comparaison par similarité cosinus
- Résultat : photos dont le contenu visuel correspond à la description

**B. Reconnaissance de personnes**
- Exemples : "photos avec Luca", "selfies avec Marie"
- L'utilisateur **nomme lui-même les visages** (pas d'identification automatique sans consentement)
- Workflow :
  1. À l'upload, les visages détectés sont encadrés automatiquement
  2. L'utilisateur clique sur un visage et lui donne un prénom
  3. Ce prénom est associé à l'encodage du visage (vecteur facial)
  4. Les photos suivantes avec ce même visage sont reconnues et taguées automatiquement

**C. Combinaison des deux**
- "Photos avec Luca en montagne" → filtre visages + filtre contenu
- "Selfies au ski en 2023" → filtre date + visages + contenu

#### Pipeline IA à l'upload d'une photo
```
Photo uploadée
    ↓
1. Extraction métadonnées EXIF (date, GPS si présent)
2. Génération embedding CLIP (vecteur 512 dims) → stocké dans pgvector
3. Détection des visages → encadrement + proposition de tag à l'utilisateur
4. Si visage reconnu (similarité > seuil) → tag automatique avec confirmation
    ↓
Photo indexée et recherchable
```

#### Technologie backend (Python)
```
clip                    # OpenAI CLIP — embeddings visuels
face_recognition        # Détection et encodage des visages (dlib)
Pillow                  # Traitement images
numpy                   # Calculs vectoriels
```

#### Tables base de données supplémentaires
```sql
-- Embeddings visuels pour recherche sémantique
photo_embeddings (
  id uuid PRIMARY KEY,
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users,
  clip_embedding vector(512)       -- pgvector extension
)

-- Personnes taguées par l'utilisateur
people (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,              -- "Luca", "Marie"
  face_encoding vector(128),       -- encodage facial de référence
  avatar_photo_id uuid             -- photo de référence choisie par l'utilisateur
)

-- Lien photos <-> personnes
photo_people (
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  confidence float,                -- score de reconnaissance (0-1)
  confirmed_by_user boolean DEFAULT false,
  PRIMARY KEY (photo_id, person_id)
)
```

---

### 6. Vue liste / journal

Page listant toutes les activités sous forme de cards :
- Photo de couverture (première photo uploadée)
- Titre, type, date, lieu
- Filtres identiques à la carte
- Tri par date (défaut), distance, note
- Clic → ouvre le détail

---

## Authentification & données privées

- Inscription / connexion par email + mot de passe, ou Google OAuth
- **Chaque utilisateur ne voit que ses propres données** — isolation totale via Row Level Security (RLS) Supabase
- Pas de fonctionnalité sociale (pas de partage, pas de profil public) dans la v1

---

## Structure de la base de données (Supabase / PostgreSQL)

```sql
-- Table principale des activités
activities (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  title text NOT NULL,
  activity_type text NOT NULL,
  date date NOT NULL,
  country text,
  region text,
  description text,
  weather text,
  temperature int,
  rating int CHECK (rating BETWEEN 1 AND 5),
  tags text[],
  gpx_file_url text,         -- URL fichier GPX dans Supabase Storage
  geometry jsonb,            -- GeoJSON LineString ou Point
  stats jsonb,               -- {distance, elevation_gain, duration, avg_speed}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Photos liées à une activité
photos (
  id uuid PRIMARY KEY,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users,
  url text NOT NULL,
  caption text,
  taken_at timestamptz,
  position int              -- ordre d'affichage
)

-- Types d'activités personnalisables
activity_types (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  color text NOT NULL,      -- hex color
  icon text NOT NULL        -- nom d'icône
)
```

---

## Architecture des dossiers (projet)

```
mytrails/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/        # Carte Mapbox + marqueurs + traces
│   │   │   ├── Activity/   # Formulaire ajout, vue détail, card
│   │   │   ├── Filters/    # Panneau filtres
│   │   │   └── UI/         # Composants génériques (boutons, modals...)
│   │   ├── pages/
│   │   │   ├── MapPage.jsx
│   │   │   ├── ListPage.jsx
│   │   │   ├── ActivityDetail.jsx
│   │   │   └── Auth.jsx
│   │   ├── hooks/          # useActivities, useFilters, useMap
│   │   ├── lib/            # supabaseClient.js, mapboxConfig.js
│   │   └── App.jsx
│   └── package.json
│
├── backend/                # FastAPI Python
│   ├── main.py
│   ├── routers/
│   │   ├── activities.py
│   │   ├── gpx.py          # Parsing et traitement GPX
│   │   └── photos.py
│   ├── services/
│   │   └── gpx_parser.py   # gpxpy : extraction trace + stats
│   ├── models.py
│   └── requirements.txt
│
└── CLAUDE.md               # Ce fichier
```

---

## Ordre de développement recommandé (par phases)

### Phase 1 — Fondations
1. Setup projet React + Vite + Supabase Auth (login/logout)
2. Carte Mapbox de base avec sélecteur de fonds de carte (5 styles)
3. Structure base de données Supabase + RLS

### Phase 2 — Ajout d'activités
4. Formulaire ajout avec marqueur (méthode C : clic sur carte)
5. Recherche géocodage Mapbox (méthode D)
6. Import GPX + parsing backend FastAPI (méthode A)
7. Dessin d'itinéraire sur la carte (méthode B)

### Phase 3 — Affichage et filtres
8. Affichage de tous les marqueurs/traces sur la carte
9. Panneau filtres (type, année, pays)
10. Vue détail d'une activité (panneau latéral)

### Phase 4 — Photos de base
11. Upload et affichage photos (Supabase Storage)
12. Onglet galerie photos (grille, tri, regroupement par mois)
13. Vue liste / journal des activités

### Phase 5 — IA Photos
14. Intégration CLIP : génération embeddings à l'upload + pgvector
15. Recherche sémantique : "photos au ski", "en montagne"...
16. Détection de visages à l'upload (face_recognition)
17. Interface de nommage des visages + reconnaissance automatique
18. Recherche combinée : contenu + personnes + date

### Phase 6 — Finitions web
19. Export GPX
20. UI polish + responsive mobile (l'app web doit être utilisable sur téléphone)
21. Préférences utilisateur (fond de carte par défaut, etc.)

---

## Projet 2 — Application mobile MyTrails (iOS + Android)

### Contexte
L'app mobile est un projet séparé de l'app web. Elle partage la même base de données Supabase et le même backend FastAPI, mais est développée en React Native (Expo).

Son rôle est unique et complémentaire à l'app web :
- **Synchronisation automatique des photos** en arrière-plan (comme Google Photos / iCloud)
- L'utilisateur installe l'app, se connecte, et toutes ses nouvelles photos sont uploadées automatiquement vers Supabase Storage sans qu'il ait besoin de faire quoi que ce soit
- L'app web affiche ensuite toutes ces photos dans l'onglet galerie

### Stack mobile
| Couche | Technologie |
|---|---|
| Framework | React Native + Expo |
| Auth | Supabase Auth (même compte que web) |
| Stockage | Supabase Storage (même bucket "photos") |
| Accès galerie | expo-media-library |
| Sync arrière-plan | expo-background-fetch + expo-task-manager |
| Distribution | Expo EAS Build (TestFlight iOS + APK Android) |

### Fonctionnalités de l'app mobile (v1)

**Écran principal — Sync automatique**
- Au premier lancement : demande permission d'accès à la galerie
- Sync initiale : upload de toutes les photos existantes (avec confirmation de l'utilisateur — peut être volumineux)
- Sync continue : détecte les nouvelles photos toutes les X minutes en arrière-plan et les uploade automatiquement
- Indicateur de statut : "X photos synchronisées", "Dernière sync : il y a 5 min"
- Option : sync uniquement en WiFi (recommandé par défaut)
- Option : sync uniquement quand l'appli est branchée

**Écran secondaire — Paramètres**
- Connexion / déconnexion compte MyTrails
- Fréquence de sync (toutes les 15 min / 1h / manuellement)
- WiFi uniquement : oui/non
- Espace utilisé sur Supabase
- Bouton "Synchroniser maintenant"

**Ce que l'app mobile fait AUSSI (mêmes fonctionnalités que le web)**
- Ajout d'activités via les 4 mêmes méthodes :
  - A. Import fichier GPX
  - B. Dessin d'itinéraire sur la carte
  - C. Point unique sur la carte
  - D. Recherche par nom de lieu
- Consultation de la carte et des activités
- Galerie photos

**Ce que l'app mobile ne fait PAS (réservé au web)**
- Recherche IA dans les photos (trop gourmand pour mobile)
- Gestion avancée des types d'activités

### Phases de développement mobile

**Phase M1 — Setup**
- Projet Expo + React Native
- Connexion Supabase Auth (login avec le même compte que l'app web)
- Permission accès galerie (expo-media-library)

**Phase M2 — Upload manuel**
- Sélection de photos depuis la galerie
- Upload vers Supabase Storage dans le bucket "photos"
- Les photos apparaissent immédiatement dans l'app web

**Phase M3 — Sync automatique**
- Détection des nouvelles photos en arrière-plan (expo-background-fetch)
- Upload automatique sans action de l'utilisateur
- Gestion des doublons (ne pas uploader deux fois la même photo)
- Sync WiFi uniquement option

**Phase M4 — Ajout d'activités depuis le mobile**
- Les 4 mêmes méthodes d'ajout que l'app web
- Carte Mapbox intégrée dans l'app mobile
- Formulaire activité identique au web
- Synchronisation immédiate avec Supabase (visible sur le web instantanément)

**Phase M5 — Polish et distribution**
- UI soignée et adaptée au tactile
- Gestion des erreurs réseau (retry automatique)
- Build iOS (TestFlight) + Android (APK)
- Tests sur vrais appareils

---

## Projet 3 — Intégration Strava

### Contexte
L'intégration Strava permet d'importer automatiquement les activités depuis Strava vers MyTrails, sans aucune action de l'utilisateur après la configuration initiale.

### Fonctionnement

```
Utilisateur termine une sortie → Strava enregistre l'activité
        ↓
Strava envoie un webhook au backend MyTrails
        ↓
Le backend récupère le GPX via l'API Strava
        ↓
Parse le fichier + extrait toutes les stats
        ↓
Sauvegarde dans Supabase (activities + geometry + stats)
        ↓
L'activité apparaît automatiquement sur la carte MyTrails
```

### Fonctionnalités

**Connexion Strava (page Paramètres de l'app web)**
- Bouton "Connecter mon compte Strava" → OAuth Strava
- Une fois connecté : affichage du nom Strava + bouton déconnecter
- Option : "Importer toutes mes activités passées" (import historique en masse)

**Sync automatique (webhook)**
- Dès qu'une nouvelle activité apparaît sur Strava → importée automatiquement dans MyTrails
- Le GPX est récupéré et parsé (distance, D+, D-, stats complètes, profil altimétrique)
- Le type d'activité Strava est mappé vers les types MyTrails (Run→Course, Ride→Vélo, Hike→Randonnée, Ski→Ski, Climb→Escalade...)
- L'utilisateur peut ensuite enrichir l'activité (photos, ressenti, météo...)

**Import historique**
- Import de toutes les activités passées Strava en une fois
- Barre de progression pendant l'import
- Détection des doublons (ne pas importer deux fois la même activité)

### Stack technique
- **Strava API v3** : OAuth 2.0 + Webhooks + Activities endpoint
- **Backend FastAPI** : nouveau router `routers/strava.py`
- **Webhook endpoint** : `POST /strava/webhook` — reçoit les notifications Strava
- **Token storage** : tokens Strava stockés dans une table `strava_tokens` en base

### Table base de données
```sql
strava_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  athlete_id bigint NOT NULL,
  scope text
)

-- Colonne à ajouter dans activities :
-- strava_activity_id bigint UNIQUE  → pour éviter les doublons
```

### Phases de développement Strava

**Phase S1 — OAuth Strava**
- Page paramètres avec bouton "Connecter Strava"
- Flow OAuth complet (autorisation → callback → stockage token)
- Refresh automatique du token expiré

**Phase S2 — Import manuel**
- Bouton "Importer mes activités Strava" dans les paramètres
- Récupération des activités via API Strava
- Parsing GPX + sauvegarde dans Supabase

**Phase S3 — Webhook temps réel**
- Endpoint webhook dans le backend
- Dès qu'une activité apparaît sur Strava → importée automatiquement
- Mapping des types d'activités Strava → MyTrails

**Phase S4 — Import historique**
- Import en masse de toutes les activités passées
- Barre de progression
- Gestion des doublons

---

## Variables d'environnement nécessaires

```env
# Frontend (.env)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MAPBOX_TOKEN=...

# Backend (.env)
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

---

## Conventions de code

- **Python** : snake_case, type hints, FastAPI async
- **React** : composants fonctionnels + hooks, pas de classes
- **CSS** : Tailwind CSS
- **Commits** : feat / fix / chore + description courte en français
- **Langue** : interface en français, code et commentaires en anglais

---

*Document de référence pour Claude Code — à fournir au début de chaque session.*
