# Elements Restants Pour Finaliser Le Rapport Et Le Projet

## A Completer Dans Le Rapport

- Ajouter le diagramme de classe general dans le chapitre conception.
- Ajouter les diagrammes de sequence manquants:
  - authentification/login;
  - marquer presence;
  - admin attribue une tache;
  - utilisateur confirme, termine ou reporte une tache;
  - notification temps reel.
- Harmoniser les noms des roles dans tout le rapport:
  - `stagiaire`, pas `etudiant` si l'application utilise `stagiaire`;
  - `employee`, pas alternance entre `employe`, `employee`, `rh`;
  - `comptable`, pas `accountant`.
- Ajouter une table de correspondance entre cas d'utilisation et modules reels de l'application.
- Ajouter une section "Besoins fonctionnels" et "Besoins non fonctionnels".
- Ajouter des captures d'ecran finales:
  - page d'accueil;
  - creation de compte avec OTP;
  - login;
  - dashboard admin;
  - gestion utilisateurs;
  - presences admin;
  - creation tache admin;
  - notification utilisateur;
  - My Tasks avec Confirmer / Plus tard / Terminer;
  - dashboards employee, stagiaire et comptable.
- Ajouter une section tests et validation:
  - creation de deux stagiaires;
  - connexion de chaque role;
  - presence affichee cote admin;
  - tache assignee a un comptable;
  - confirmation, annulation et terminaison visibles cote admin.

## A Verifier Dans Le Code

- Verifier que les routes sensibles utilisent toutes le meme middleware RBAC.
- Ajouter des tests automatises pour:
  - authentification;
  - creation compte OTP;
  - taches assignees;
  - presence;
  - notifications.
- Verifier que les recommandations ML se rafraichissent apres les actions importantes.
- Ajouter un export PDF/Excel si le rapport PFE promet cette fonctionnalite exacte. Le code fournit deja un export CSV/JSON.

## Deja Complete Cote Code

- Les roles sont normalises cote backend et frontend avec les valeurs canoniques `admin`, `employee`, `stagiaire`, `comptable`.
- Le role `comptable` peut acceder au module finance backend.
- Le comptable peut ajouter des transactions financieres depuis l'interface.
- Une page "Reports" existe pour le comptable.
- Les rapports finance ont un export CSV/JSON.
- Les endpoints `/api/finance/reports` et `/api/finance/export` sont disponibles.

## A Corriger Dans Les Diagrammes

- Dans le diagramme global, eviter de repeter plusieurs fois "S'authentifier"; utiliser une authentification commune incluse par les roles.
- Corriger les fautes:
  - "Consulter", pas "Conssulter";
  - "Cas d'utilisation", pas "Ces d'utilisation";
  - "Creer compte" ou "Creer un compte", choisir une seule forme.
- Ajouter le statut `declined` ou "Annulee/Reportee" dans les diagrammes de taches, car l'application a le bouton "Plus tard".
- Ajouter l'admin comme recepteur des notifications de changement d'etat des taches.
- Ajouter la validation OTP dans les cas d'utilisation creation compte.

## Limite De Lecture Des PDF

Les fichiers PDF fournis semblent encodes sous forme non extractible sans OCR externe sur cette machine. Les corrections Markdown actuelles se basent donc sur les diagrammes fournis dans le message et sur le code existant du projet.
