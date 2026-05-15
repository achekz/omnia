@startuml
title Diagramme de sequence - Marquer presence | OmniAI Platform

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

actor "Utilisateur\n(Employe, Stagiaire, Comptable)" as Utilisateur #DBEAFE
actor "Admin" as Admin #FEF3C7
participant "Frontend" as Frontend #EFF6FF
participant "Backend" as Backend #F8FAFC
participant "Service Email" as Email #FEF3C7
database "BD" as Database #D1FAE5

ref over Utilisateur, Database
Authentification
end ref

note over Utilisateur, Database
Regle metier:
Tous les comptes sauf Admin peuvent marquer la presence.
L'Utilisateur peut etre Employe, Stagiaire ou Comptable.
L'Admin consulte le temps de presence, le temps de check-out et les causes.
end note

alt Utilisateur marque sa presence
  Frontend --> Utilisateur : afficher tableau de bord
  Utilisateur -> Frontend : cliquer sur "Presence"
  Frontend --> Utilisateur : afficher page "Marquer presence"

  Utilisateur -> Frontend : cliquer sur "Marquer presence"
  Frontend -> Backend : envoyer demande de check-in(idUtilisateur, role, date, heureEntree)

  Backend -> Backend : verifier ponctualite de l'entree

  alt entree ponctuelle
    Backend -> Email : envoyer code de verification a l'email
    Email --> Utilisateur : recevoir code de verification
    Frontend --> Utilisateur : demander le code de verification
    Utilisateur -> Frontend : saisir code de verification
    ref over Utilisateur, Database
    Verification du code email
    end ref
    Backend -> Database : enregistrer presence(heureEntree, statut ponctuel)
    Database --> Backend : presence enregistree
    Backend --> Frontend : confirmer le marquage
    Frontend --> Utilisateur : afficher "Presence marquee avec succes"
  else entree en retard
    Frontend --> Utilisateur : demander la cause du retard
    Utilisateur -> Frontend : saisir cause du retard
    Frontend -> Backend : envoyer cause du retard
    Backend -> Email : envoyer code de verification a l'email
    Email --> Utilisateur : recevoir code de verification
    Frontend --> Utilisateur : demander le code de verification
    Utilisateur -> Frontend : saisir code de verification
    ref over Utilisateur, Database
    Verification du code email
    end ref
    Backend -> Database : enregistrer presence(heureEntree, statut retard, causeRetard)
    Database --> Backend : presence enregistree
    Backend --> Frontend : confirmer le marquage
    Frontend --> Utilisateur : afficher "Presence marquee avec succes"
  end

  == Fin de travail ==

  Utilisateur -> Frontend : cliquer sur "Check-out"
  Frontend -> Backend : envoyer demande de check-out(idUtilisateur, date, heureSortie)
  Backend -> Database : verifier presence du jour
  Database --> Backend : retourner presence

  Backend -> Backend : verifier heure de sortie

  alt check-out ponctuel
    Backend -> Email : envoyer code de verification a l'email
    Email --> Utilisateur : recevoir code de verification
    Frontend --> Utilisateur : demander le code de verification
    Utilisateur -> Frontend : saisir code de verification
    ref over Utilisateur, Database
    Verification du code email
    end ref
    Backend -> Database : enregistrer check-out(heureSortie, statut ponctuel)
    Database --> Backend : check-out enregistre
    Backend --> Frontend : confirmer le check-out
    Frontend --> Utilisateur : afficher "Check-out marque avec succes"
  else check-out trop tot
    Frontend --> Utilisateur : demander la cause de sortie avant l'heure
    Utilisateur -> Frontend : saisir cause de sortie
    Frontend -> Backend : envoyer cause de sortie
    Backend -> Email : envoyer code de verification a l'email
    Email --> Utilisateur : recevoir code de verification
    Frontend --> Utilisateur : demander le code de verification
    Utilisateur -> Frontend : saisir code de verification
    ref over Utilisateur, Database
    Verification du code email
    end ref
    Backend -> Database : enregistrer check-out(heureSortie, statut trop tot, causeSortie)
    Database --> Backend : check-out enregistre
    Backend --> Frontend : confirmer le check-out
    Frontend --> Utilisateur : afficher "Check-out marque avec succes"
  end
else Admin consulte les presences
  Frontend --> Admin : afficher tableau de bord Admin
  Admin -> Frontend : cliquer sur "Gestion des presences"
  Frontend -> Backend : demander la liste des presences
  Backend -> Backend : verifier role Admin
  Backend -> Database : recuperer presences avec heures et causes
  Database --> Backend : retourner heureEntree, causeRetard, heureSortie, causeSortie
  Backend --> Frontend : retourner la liste des presences
  Frontend --> Admin : afficher temps de presence et causes
end

note over Utilisateur, Database
Resultat final:
l'Utilisateur marque l'entree et le check-out avec un code envoye par email.
La cause est obligatoire si l'entree est en retard ou si le check-out est trop tot.
L'Admin consulte les heures marquees et les causes sans marquer sa presence.
end note

@enduml

' ============================================================
' Diagramme separe - Verification du code email
' ============================================================

@startuml
title Diagramme de sequence - Verification du code email | OmniAI Platform

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

actor "Utilisateur" as Utilisateur #DBEAFE
participant "Frontend" as Frontend #EFF6FF
participant "Backend" as Backend #F8FAFC
database "BD" as Database #D1FAE5

Frontend -> Backend : envoyer code de verification
Backend -> Database : recuperer code de verification
Database --> Backend : retourner code enregistre
Backend -> Backend : comparer le code saisi avec le code enregistre

alt code incorrect
  Backend --> Frontend : retourner erreur "Code incorrect"
  Frontend --> Utilisateur : afficher message d'erreur
else code valide
  Backend -> Database : marquer code comme utilise
  Database --> Backend : code mis a jour
  Backend --> Frontend : confirmer la validation du code
end

@enduml
