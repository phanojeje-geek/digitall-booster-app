# Digital Booster App

MVP SaaS interne pour agence digitale (Next.js + Supabase + PWA).

## Stack

- Frontend: Next.js (App Router) + Tailwind CSS
- Backend: Supabase (Auth, Postgres, Storage, Realtime)
- PWA: `manifest.json` + `sw.js` (mode offline basique)

## Modules inclus

- Authentification: inscription, connexion, deconnexion, middleware de protection
- Roles: `admin`, `commercial`, `marketing`, `dev`
- CRM Clients: CRUD, filtres, recherche, vue table + cards
- Projets: CRUD, assignation utilisateur, vue Kanban simple
- Taches: CRUD, assignation, checklist/statut Kanban
- Storage: upload fichiers client + previsualisation image
- Dashboard global: KPIs + activite recente
- CMS basic: edition section + JSON contenu
- Notifications: insertion et lecture temps reel via Supabase Realtime
- Securite: politiques RLS par `owner_id`

## Installation

1. Installer les dependances:

```bash
npm install
```

2. Copier les variables d environnement:

```bash
cp .env.example .env.local
```

3. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. Dans Supabase SQL Editor, executer `supabase/schema.sql`.

5. Lancer l app:

```bash
npm run dev
```

## URLs

- Local: [http://localhost:3000](http://localhost:3000)
- Cible prod: [https://app.digitallbooster.com](https://app.digitallbooster.com)

## Arborescence utile

- `src/app/(auth)`: login/signup
- `src/app/(app)/app`: dashboard + modules
- `src/features/*/actions.ts`: server actions par domaine
- `src/lib/supabase/*`: clients Supabase (browser/server/middleware)
- `supabase/schema.sql`: schema complet + RLS + policies storage

## Notes de production

- Ajouter les vraies icones PNG PWA (192/512) pour compatibilite maximale.
- Activer DNS + SSL pour `app.digitallbooster.com`.
- Optionnel: brancher web push natif pour notifications navigateur.
