# Architecture Omni AI

## Vue Generale

Omni AI est une application MERN connectee a MongoDB Atlas et completee par un service IA/ML. L'architecture separe l'interface utilisateur, l'API backend, la base de donnees, les notifications temps reel et les traitements intelligents.

```text
Frontend React/Vite
        |
        | Axios + JWT
        v
Backend Express API
        |
        | Mongoose
        v
MongoDB Atlas
        |
        | donnees historiques
        v
Service IA/ML

Socket.io relie le backend au frontend pour les notifications temps reel.
```

## Couches Techniques

| Couche | Responsabilite |
| --- | --- |
| Frontend | Pages par role, formulaires, dashboards, notifications, taches, presence |
| API Backend | Authentification, RBAC, CRUD, orchestration metier |
| MongoDB | Persistance des utilisateurs, taches, presences, notifications, logs, finance |
| Socket.io | Notifications temps reel par utilisateur et par role |
| ML/AI | Recommandations, detection d'anomalies, analyse et insights |

## Roles et Autorisations

Les roles canoniques sont:

- `admin`
- `employee`
- `stagiaire`
- `comptable`

Regles principales:

- un seul compte `admin` doit exister;
- plusieurs comptes `employee`, `stagiaire` et `comptable` sont autorises;
- les utilisateurs non admin voient uniquement leurs propres taches et presences;
- l'admin voit les comptes, presences, taches et indicateurs globaux;
- les actions sensibles passent par JWT, middleware d'authentification et controle de role.

## Modules Fonctionnels

### Authentification

Endpoints principaux:

```text
POST /api/auth/send-code
POST /api/auth/verify-code
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Le flux de creation de compte correspond au diagramme de sequence:

1. l'utilisateur ouvre le site;
2. il clique sur "creer un compte";
3. il saisit les informations d'inscription;
4. le systeme verifie email et telephone;
5. le systeme genere un OTP a 6 chiffres;
6. l'utilisateur valide le code;
7. le systeme verifie les regles de mot de passe;
8. le compte est cree si toutes les donnees sont valides.

### Administration

Endpoints principaux:

```text
GET /api/admin/dashboard
GET /api/admin/users
GET /api/admin/presences
GET /api/admin/tasks
GET /api/admin/analytics
GET /api/admin/ai-insights
```

Cas d'utilisation admin:

- consulter dashboard et KPIs;
- gerer les comptes utilisateurs;
- consulter les presences;
- planifier et attribuer des taches;
- suivre l'etat des taches;
- consulter recommandations et statistiques globales;
- recevoir notifications admin;
- configurer le systeme.

### Taches

Endpoints principaux:

```text
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id/status
PUT    /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/tasks/stats
```

Statuts:

- `todo`: tache en attente;
- `in_progress`: tache confirmee et en cours;
- `done`: tache terminee;
- `overdue`: tache en retard;
- `declined`: tache refusee/reportee avec "Plus tard".

Workflow:

```text
Admin cree une tache
        |
        v
Utilisateur assigne recoit une notification
        |
        +-- Confirmer -> in_progress -> Terminer -> done
        |
        +-- Plus tard -> declined
```

### Presence

Endpoints principaux:

```text
GET  /api/attendance/me
POST /api/attendance/send-code
POST /api/attendance/confirm
GET  /api/attendance/all
```

Les presences incluent un snapshot utilisateur afin de garder le nom, role et email visibles dans l'espace admin meme si un compte est modifie apres coup.

### Notifications

Endpoints principaux:

```text
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/:id
```

Les notifications sont creees pour:

- nouvelle tache assignee;
- tache confirmee;
- tache terminee;
- tache annulee/reportee;
- anomalies;
- recommandations et alertes IA/ML.

### IA/ML

Endpoints principaux:

```text
POST /api/ml/predict-risk
POST /api/ml/recommend
POST /api/ml/detect-anomaly
GET  /api/ml/insights
GET  /api/ml/recommendations
POST /api/ai/chat
```

L'IA/ML intervient dans:

- recommandations;
- analyse de donnees;
- detection d'anomalies;
- KPIs;
- assistance conversationnelle;
- rafraichissement apres creation ou changement de statut de tache.

### Finance Et Rapports

Endpoints principaux:

```text
GET  /api/finance/records
POST /api/finance/records
GET  /api/finance/summary
GET  /api/finance/anomalies
GET  /api/finance/reports
GET  /api/finance/export?format=csv
GET  /api/finance/export?format=json
```

Le role `comptable` peut gerer les transactions financieres, consulter les rapports et exporter les donnees en CSV ou JSON.

## Modele de Donnees Principal

| Collection | Contenu |
| --- | --- |
| `users` | comptes, roles, profil, mot de passe hash, statut |
| `tasks` | taches, assignation, statut, dates, createur, utilisateur termine |
| `attendances` | presences, code OTP, retard, snapshot utilisateur |
| `notifications` | alertes, metadata, lecture, action URL |
| `activitylogs` | activite, score, taches creees/terminees |
| `financialrecords` | donnees finance si module active |
| `recommendations` | recommandations IA/ML |

## Securite

- mots de passe hashes avec bcrypt;
- tokens JWT;
- verification du role cote backend;
- validation des inputs;
- rate limiting configurable;
- isolation par tenant lorsque le tenant existe;
- interdiction de creation de plusieurs admins.

## Points d'Attention

- les diagrammes de sequence doivent etre ajoutes pour login, presence et taches;
- les cas d'utilisation doivent garder les memes noms de roles partout: `admin`, `employee`, `stagiaire`, `comptable`.
