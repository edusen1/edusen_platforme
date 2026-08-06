# Edusen Plateforme

Espace d'administration de la plateforme Edusen — réservé aux rôles **SUPER_ADMIN** et **GESTIONNAIRE**.

Application distincte de `edusen_frontend`, qui reste l'espace des établissements. Un compte plateforme ne peut pas se connecter au front tenant, et inversement.

## Démarrer

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:4300
```

`edusen_frontend` tourne sur le port 4200 : les deux peuvent fonctionner en parallèle. Leurs sessions sont stockées sous des clés différentes (`edusen-platform-auth` / `noura-auth`), elles ne s'écrasent donc pas.

## Stack

Identique à `edusen_frontend` : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, axios, zustand, react-hook-form + zod, sonner, recharts.

## Pages

| Route | Contenu |
|---|---|
| `/login` | Connexion, refuse les rôles non plateforme |
| `/dashboard` | KPI, croissance mensuelle, répartition par plan, derniers établissements |
| `/tenants` | Liste, recherche, filtres actifs/archivés/plan, création, modification |
| `/tenants/[id]` | Identité, logo, abonnement, activité auditée |
| `/utilisateurs` | Comptes plateforme, création, archivage |
| `/analytics` | Taux d'activité, croissance cumulée, abonnements à échéance |
| `/supervision` | Santé du service, usage par établissement, signaux de sécurité |
| `/audit` | Journal d'audit paginé et filtrable, détail en panneau |
| `/demandes-audit` | Approbation / rejet des demandes d'accès aux journaux |
| `/parametres` | Profil, mot de passe |

## Rôles

| Action | SUPER_ADMIN | GESTIONNAIRE |
|---|---|---|
| Consulter | ✅ | ✅ |
| Créer / modifier un établissement | ✅ | ✅ |
| Archiver / réactiver un établissement | ✅ | ❌ |
| Gérer les comptes plateforme | ✅ | ✅ |
| Approuver / rejeter une demande d'audit | ✅ | ❌ |

Les actions interdites sont **masquées**, pas laissées en échec 403.

## Principes de conception

Issus du test intégral du front tenant — ces défauts ne doivent pas se reproduire ici.

1. **On n'efface jamais, on archive.** Aucun bouton de suppression définitive. Les endpoints `DELETE` du backend font un `prisma.delete()` irréversible et ne sont volontairement pas branchés.
2. **Une panne n'est pas une erreur métier.** Un `5xx` affiche « Service temporairement indisponible », jamais « Identifiants incorrects ».
3. **Un état vide n'est affiché que si la requête a réussi.** Sinon, état d'erreur avec bouton « Réessayer ».
4. **Aucune donnée inventée.** Ce qui n'est pas mesurable est annoncé comme non disponible, avec l'endpoint attendu.
5. **Les formulaires d'édition sont pré-remplis**, listes déroulantes comprises.
6. **Rien de brut à l'écran** : ni `[object Object]`, ni UUID complet, ni date ISO — tout passe par `lib/format.ts`.
7. **Les identifiants générés sont affichés** et copiables à la création d'un compte.
8. **Le nom de l'utilisateur vient de `/v1/auth/me`**, le JWT ne le contient pas.

## Documentation

`obsidian/super-admin/` :
- Vue d'ensemble — séparation des espaces, matrice de rôles
- Use Cases — 18 cas d'usage détaillés
- API Plateforme — référence des endpoints et pièges backend
- Edusen Plateforme — spécification de cette application
- Supervision et Sécurité — ce qui est mesuré, ce qui manque
