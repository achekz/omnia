@startuml
title Diagramme de sequence - Configurer une regle | OmniAI Platform

autonumber

skinparam backgroundColor #F8FAFC
skinparam shadowing false
skinparam sequence {
  ArrowColor #1E293B
  ActorBorderColor #2563EB
  ActorBackgroundColor #DBEAFE
  ParticipantBorderColor #334155
  ParticipantBackgroundColor #E2E8F0
  DatabaseBorderColor #047857
  DatabaseBackgroundColor #D1FAE5
  LifeLineBorderColor #64748B
  LifeLineBackgroundColor #CBD5E1
  GroupBorderColor #7C3AED
  GroupBackgroundColor #F5F3FF
  NoteBorderColor #F59E0B
  NoteBackgroundColor #FEF3C7
}

actor "Admin" as Admin #DBEAFE
participant "Frontend" as Frontend #EFF6FF
participant "Backend" as Backend #F8FAFC
database "BD" as Database #D1FAE5
participant "Compte cible" as TargetAccount #FEF3C7

ref over Admin, TargetAccount
Authentification
end ref

note over Admin, TargetAccount
Architecture generale de configuration d'une regle:
l'Admin configure une regle depuis le Frontend,
le Backend valide et enregistre la regle,
la BD conserve les regles et les notifications,
les regles actives s'executent automatiquement apres sauvegarde et par planification.
end note

Frontend --> Admin : afficher page d'accueil Admin

Admin -> Frontend : cliquer sur "Rule Engine"
Frontend -> Backend : demander les regles existantes
Backend -> Database : recuperer les regles
Database --> Backend : retourner les regles
Backend --> Frontend : retourner la liste des regles
Frontend --> Admin : afficher page automation

Admin -> Frontend : cliquer sur "New Rule"
Frontend --> Admin : afficher formulaire de regle

Admin -> Frontend : remplir le formulaire
Admin -> Frontend : cliquer sur "Save Rule"
Frontend -> Backend : envoyer les donnees de la regle

Backend -> Backend : verifier les donnees de la regle

alt donnees invalides
  Backend --> Frontend : retourner une erreur de validation
  Frontend --> Admin : afficher "Verifier les donnees"
else donnees valides
  Backend -> Database : enregistrer la regle
  Database --> Backend : regle enregistree
  Backend --> Frontend : confirmer la creation de la regle
  Frontend --> Admin : afficher "Regle creee avec succes"

  Backend -> Backend : executer automatiquement les regles actives
  Backend -> Database : recuperer les regles actives
  Database --> Backend : retourner les regles actives

  Backend -> Database : recuperer les taches a analyser
  Database --> Backend : retourner les taches actives ou en retard

  Backend -> Backend : verifier les conditions

  alt condition non verifiee
    Backend -> Database : ne creer aucune notification
    Database --> Backend : aucune alerte enregistree
  else condition verifiee
    Backend -> Database : enregistrer la notification
    Database --> Backend : notification enregistree

    Backend -> Database : mettre a jour la date de declenchement
    Database --> Backend : regle mise a jour

    Backend --> TargetAccount : envoyer notification d'alerte
    TargetAccount --> Admin : afficher l'alerte dans les notifications
  end
end

note over Admin, TargetAccount
Resultat final:
la regle est enregistree dans la BD,
elle s'execute automatiquement sans bouton manuel,
si la condition est verifiee, une notification arrive au compte cible.
end note

@enduml
