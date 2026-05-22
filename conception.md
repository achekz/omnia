classDiagram
direction LR

class User {
  ObjectId _id
  String firstName
  String lastName
  String email
  String phoneNumber
  String role
  String profileType
  Boolean isActive
  Date lastLogin
}

class Organization {
  ObjectId _id
  String name
  String type
  ObjectId ownerId
  ObjectId[] members
  String plan
}

class Tenant {
  ObjectId _id
  String name
  String type
  ObjectId owner
  Boolean isActive
}

class Task {
  ObjectId _id
  String title
  String status
  String priority
  ObjectId assignedTo
  ObjectId createdBy
  Date dueDate
  Number progress
}

class Attendance {
  ObjectId _id
  ObjectId userId
  ObjectId tenantId
  String dateKey
  Date checkIn
  Date checkOut
  String status
  String reason
}

class Notification {
  ObjectId _id
  ObjectId userId
  ObjectId tenantId
  String type
  String title
  String message
  Boolean isRead
  String source
}

class Rule {
  ObjectId _id
  ObjectId tenantId
  String name
  String trigger
  String resource
  Condition[] conditions
  Action action
  Boolean isActive
}

class RoleChangeRequest {
  ObjectId _id
  ObjectId userId
  ObjectId decidedBy
  String currentRole
  String requestedRole
  String status
}

class Recommendation {
  ObjectId _id
  ObjectId tenantId
  ObjectId generatedFor
  String kind
  String summary
  String[] recommendations
  Number score
}

class MLPrediction {
  ObjectId _id
  ObjectId userId
  ObjectId tenantId
  String modelType
  String riskLevel
  Number riskScore
  Boolean isAnomaly
}

class InsightSnapshot {
  ObjectId _id
  ObjectId tenantId
  Date windowStart
  Date windowEnd
  Kpi[] kpis
  Analysis[] analysis
  RecommendationItem[] recommendations
}

class VerificationCode {
  ObjectId _id
  String purpose
  String email
  String phoneNumber
  String codeHash
  Date expiresAt
  Date verifiedAt
}

class ActivityLog {
  ObjectId _id
  ObjectId userId
  ObjectId tenantId
  Date date
  Number tasksCompleted
  Number score
}

class PerformanceLog {
  ObjectId _id
  ObjectId userId
  ObjectId tenantId
  Date date
  Number completedTasks
  Number delayedTasks
  Number score
}

Organization "1" o-- "0..*" User : members
Organization "1" --> "0..1" User : owner
Tenant "1" --> "0..1" User : owner

User "1" <-- "0..*" Task : assignedTo
User "1" <-- "0..*" Task : createdBy
User "1" <-- "0..*" Task : completedBy
Organization "1" <-- "0..*" Task : tenantId

User "1" <-- "0..*" Attendance : userId
Tenant "1" <-- "0..*" Attendance : tenantId

User "1" <-- "0..*" Notification : userId
Tenant "1" <-- "0..*" Notification : tenantId

User "1" <-- "0..*" RoleChangeRequest : userId
User "1" <-- "0..*" RoleChangeRequest : decidedBy

Organization "1" <-- "0..*" Rule : tenantId
User "1" <-- "0..*" Rule : createdBy
Rule ..> Task : analyse
Rule ..> Notification : cree

User "1" <-- "0..*" Recommendation : generatedFor
Tenant "1" <-- "0..*" Recommendation : tenantId

User "1" <-- "0..*" MLPrediction : userId
User "1" <-- "0..*" ActivityLog : userId
User "1" <-- "0..*" PerformanceLog : userId

Organization "1" <-- "0..*" InsightSnapshot : tenantId
VerificationCode ..> User : email / phoneNumber
