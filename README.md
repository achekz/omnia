# Omni AI Platform

Omni AI est une plateforme MERN avec integration IA/ML pour la gestion intelligente des comptes, presences, taches, notifications, tableaux de bord et analyses. Le systeme est organise par roles afin que chaque utilisateur accede uniquement aux fonctionnalites qui le concernent.

## Objectif

La plateforme centralise le suivi administratif et operationnel d'une organisation:

- creation et authentification securisee des comptes;
- gestion des utilisateurs par l'administrateur;
- marquage et validation des presences;
- planification, attribution et suivi des taches;
- notifications temps reel;
- consultation des dashboards, KPIs et recommandations;
- analyse des donnees, detection d'anomalies et assistance IA.

## Roles Fonctionnels

| Role | Acces principal |
| --- | --- |
| Admin | Gestion des comptes, presences, taches, KPIs globaux, recommandations, configuration systeme, notifications admin |
| Employee | Dashboard, presence, taches assignees, productivite, planning, recommandations, notifications |
| Stagiaire | Dashboard, presence, taches assignees, planning/budget, recommandations, notifications |
| Comptable | Dashboard, presence, taches assignees, finances/rapports, anomalies, recommandations, notifications |

## Fonctionnalites Cles

### Authentification et creation de compte

Le parcours de creation de compte suit un processus en trois etapes:

1. saisie des informations personnelles, email et telephone;
2. verification par code OTP envoye par email;
3. creation du mot de passe avec regles de securite.

Le systeme verifie les emails invalides ou deja utilises, les codes OTP incorrects et les mots de passe faibles avant de creer le compte.

### Gestion des taches

L'admin peut creer une tache et l'attribuer a un employee, stagiaire ou comptable. L'utilisateur choisi recoit une notification et voit la tache dans son espace.

Cycle de vie d'une tache:

- `todo`: tache creee, en attente de confirmation;
- `in_progress`: tache confirmee par l'utilisateur;
- `done`: tache terminee;
- `overdue`: tache en retard;
- `declined`: tache reportee/annulee par l'utilisateur avec le bouton "Plus tard".

### Presence

Les employee, stagiaire et comptable peuvent marquer leur presence. Les presences sont conservees avec les informations du compte afin que l'admin voie toujours le nom, le role et l'email corrects.

### Notifications

Les notifications sont synchronisees en temps reel avec Socket.io. Elles couvrent les taches assignees, les confirmations, les annulations, les taches terminees, les anomalies et les alertes ML/IA.

### IA et ML

Le module IA/ML fournit:

- recommandations personnalisees;
- detection d'anomalies;
- analyse de donnees;
- insights pour dashboards;
- assistance conversationnelle.

## Stack Technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Wouter, React Query |
| Backend | Node.js, Express, Mongoose, JWT, Socket.io |
| Base de donnees | MongoDB Atlas |
| IA/ML | Service Python, modeles de recommandation/anomalie, endpoints ML |
| Securite | JWT, bcrypt, RBAC, validation Express, rate limiting |

## Lancement Local

Avant de lancer le backend, verifier que le fichier reel `server/.env` existe. Il doit etre cree a partir de [server/.env.example](server/.env.example) avec les vraies valeurs MongoDB/JWT/email. Ce fichier est ignore par Git et ne doit jamais etre publie.

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
npm install
npm run dev
```

### ML Service

```bash
cd ml_service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python train_models.py
python app.py
```

`train_models.py` genere les artefacts scikit-learn dans `ml_service/trained_models/`:
`risk_predictor.pkl`, `recommendation_content_based.pkl` et `anomaly_detector.pkl`.
`app.py` delegates to `app_improved.py`, which keeps the rule-based fallback available if trained artifacts are not loaded.

## Scripts Utiles

```bash
npm run typecheck
cd server
npm run typecheck
npm run reset-auth-system
```

## Comptes de Test

Les mots de passe des comptes de test sont lus depuis `server/.env`:
`RANYME_PASSWORD`, `NAJET_PASSWORD`, `COMPTABLE_PASSWORD`.

| Email | Role | Variable |
| --- | --- | --- |
| admin@gmail.com | admin | `ADMIN_PASSWORD` |
| ranyme13@gmail.com | stagiaire | `RANYME_PASSWORD` |
| najetkhbrahem1979@gmail.com | stagiaire | `NAJET_PASSWORD` |
| chaymagaabel777@gmail.com | comptable | `COMPTABLE_PASSWORD` |

## Documentation

- [Architecture technique](docs/architecture.md)
- [Specification fonctionnelle du rapport](docs/rapport-fonctionnel.md)
- [Liste des elements restants](TODO.md)
