# Specification Fonctionnelle Pour Le Rapport

Ce document synthetise les fonctionnalites de Omni AI d'apres les diagrammes de cas d'utilisation, le diagramme de sequence "Creer compte" et l'etat actuel de l'application.

## 1. Presentation Generale

Omni AI est une plateforme web intelligente destinee a organiser le suivi des utilisateurs, des presences, des taches, des indicateurs et des recommandations. Elle s'adresse a quatre profils: admin, employee, stagiaire et comptable.

L'application centralise les informations et reduit les traitements manuels grace a:

- une authentification securisee;
- un systeme de roles;
- une gestion des presences;
- une gestion des taches attribuees;
- un centre de notifications;
- des tableaux de bord et KPIs;
- un module IA/ML pour analyser les donnees, detecter les anomalies et proposer des recommandations.

## 2. Acteurs

| Acteur | Description |
| --- | --- |
| Admin | Responsable de la configuration, des comptes, des presences, des taches et des statistiques globales |
| Employee | Utilisateur interne qui marque sa presence, consulte ses taches et suit sa productivite |
| Stagiaire | Utilisateur apprenant/stagiaire qui consulte son espace, marque sa presence et execute les taches assignees |
| Comptable | Utilisateur charge du suivi financier, des rapports, des anomalies et des taches assignees |

## 3. Cas D'Utilisation Global

Tous les roles peuvent:

- consulter la page d'accueil;
- creer un compte;
- s'authentifier;
- reinitialiser le mot de passe;
- consulter un dashboard;
- consulter des KPIs;
- recevoir des notifications;
- recevoir des recommandations;
- analyser des donnees selon leurs droits.

Les roles employee, stagiaire et comptable peuvent aussi:

- marquer leur presence;
- valider la presence;
- consulter les taches assignees;
- executer une tache;
- mettre a jour l'etat de la tache.

L'admin peut:

- gerer les comptes utilisateurs;
- consulter les presences utilisateurs;
- planifier et attribuer des taches;
- suivre l'etat des taches;
- consulter les statistiques globales;
- consulter les KPIs;
- recevoir les notifications admin;
- configurer le systeme;
- consulter les recommandations.

## 4. Creation De Compte

Le diagramme de sequence "Creer compte" decrit un processus en trois etapes.

### Etape 1: Informations utilisateur

L'utilisateur ouvre le site, clique sur "Creer un compte" et remplit le formulaire d'inscription.

Le systeme verifie:

- validite de l'email;
- unicite de l'email;
- validite du telephone;
- coherence des champs obligatoires.

Si les donnees sont invalides, le systeme affiche un message d'erreur. Sinon, il genere un OTP a 6 chiffres et l'envoie par email.

### Etape 2: Verification OTP

L'utilisateur saisit le code OTP et clique sur valider.

Le systeme verifie le code:

- si le code est incorrect, un message "code invalide" est affiche;
- si le code est correct, l'utilisateur passe a l'etape 3.

### Etape 3: Mot de passe

L'utilisateur saisit et confirme le mot de passe.

Regles de securite:

- au moins 8 caracteres;
- au moins une majuscule;
- au moins une minuscule;
- au moins un chiffre;
- au moins un caractere special.

Si le mot de passe est valide, le systeme cree le compte et affiche un message de succes.

## 5. Gestion Des Taches

### Creation Par Admin

L'admin cree une tache en renseignant:

- titre;
- description;
- utilisateur assigne;
- duree estimee;
- date ou heure de debut si necessaire.

L'utilisateur assigne peut etre un employee, un stagiaire ou un comptable.

### Notification Utilisateur

Apres creation, l'utilisateur recoit une notification avec le titre de la tache et deux actions:

- `Confirmer`: accepte la tache et la passe en cours;
- `Plus tard`: reporte/annule la tache.

### Etats De Tache

| Etat | Signification |
| --- | --- |
| `todo` | Tache creee, attente de confirmation |
| `in_progress` | Tache confirmee et en cours |
| `done` | Tache terminee |
| `overdue` | Tache en retard |
| `declined` | Tache annulee/reportee avec "Plus tard" |

### Suivi Admin

L'admin voit:

- la tache creee;
- l'utilisateur assigne;
- l'etat actuel;
- la date de confirmation;
- la date de terminaison;
- les taches en retard;
- les taches annulees/reportees.

## 6. Presence

Les utilisateurs non admin peuvent marquer leur presence. Le systeme valide la presence et conserve les informations suivantes:

- utilisateur;
- role;
- email;
- date;
- heure d'arrivee;
- retard;
- raison du retard;
- heure de sortie si disponible.

L'admin consulte toutes les presences dans une vue globale. Les informations doivent rester visibles avec le bon nom et le bon role de l'utilisateur.

## 7. Notifications

Le centre de notifications informe les utilisateurs et l'admin en temps reel.

Types de notifications:

- tache assignee;
- tache confirmee;
- tache terminee;
- tache annulee/reportee;
- presence validee;
- anomalie detectee;
- recommandation IA/ML;
- notification admin.

## 8. IA Et ML

L'IA/ML intervient dans:

- analyse de donnees;
- detection d'anomalies;
- recommandations;
- KPIs;
- insights dashboard;
- aide conversationnelle.

Les recommandations doivent tenir compte des evenements recents, comme une tache creee, confirmee, terminee ou annulee.

## 9. Besoins Fonctionnels

| Code | Besoin |
| --- | --- |
| BF01 | L'utilisateur peut creer un compte avec verification OTP |
| BF02 | L'utilisateur peut se connecter et se deconnecter |
| BF03 | L'admin peut gerer les comptes |
| BF04 | L'admin peut consulter les presences |
| BF05 | L'admin peut attribuer une tache a un compte choisi |
| BF06 | L'utilisateur assigne recoit une notification de tache |
| BF07 | L'utilisateur peut confirmer, terminer ou reporter une tache |
| BF08 | L'admin voit l'etat des taches en temps reel |
| BF09 | Les utilisateurs peuvent marquer leur presence |
| BF10 | Le systeme calcule et affiche KPIs, recommandations et anomalies |

## 10. Besoins Non Fonctionnels

| Code | Besoin |
| --- | --- |
| BNF01 | Securiser les mots de passe par hash bcrypt |
| BNF02 | Proteger les routes par JWT |
| BNF03 | Appliquer un controle d'acces par role |
| BNF04 | Garantir la coherence des donnees MongoDB |
| BNF05 | Afficher les notifications en temps reel |
| BNF06 | Fournir une interface claire et responsive |
| BNF07 | Garder l'application extensible pour les modules IA/ML |

## 11. Correspondance Diagrammes - Application

| Diagramme | Implementation correspondante |
| --- | --- |
| Sequence creer compte | `/api/auth/send-code`, `/api/auth/verify-code`, `/api/auth/register` |
| Cas admin | dashboard admin, users, presences, tasks, rules, AI |
| Cas employee | dashboard employee, presence, tasks, performance, AI |
| Cas stagiaire | dashboard student/stagiaire, presence, planner, budget, tasks, AI |
| Cas comptable | dashboard comptable, presence, finance/budget, tasks, payroll, AI |
| Cas global | routes communes auth, dashboard, notifications, recommendations |

## 12. Ce Qui Manque Encore

- verifier le contenu exact des PDF introduction et chapitre 1 avec OCR ou copier-coller du texte source;
- ajouter diagrammes de sequence pour presence, login, taches et notifications;
- ajouter diagramme de classe general dans le rapport;
- aligner le module finance backend avec le role comptable si le comptable doit gerer les finances;
- ajouter les captures d'ecran finales;
- ajouter les tests de validation dans le rapport;
- uniformiser les termes: `stagiaire`, `employee`, `comptable`, `admin`.
