// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
/**
 * Build a dynamic prompt that will be sent to the AI model
 * This creates context for real, intelligent responses
 * NOTE: This is kept for backward compatibility but not used in the new ai.service.js
 */
import { normalizeRole } from "../utils/roleNormalization.js";

// Role: Construit des donnees derivees.
export function buildPrompt(user, message, context) {
  if (!message) {
    return "Please provide a question.";
  }

  const role = normalizeRole(user?.role || user?.profileType, "employee");
  const roleDescriptions = {
    admin: "You are a strategic consultant for administration",
    employee: "You are a productivity assistant for an employee",
    comptable: "You are a productivity assistant for a team member",
    stagiaire: "You are an academic and internship assistant for stagiaires",
  };

  const roleDesc = roleDescriptions[role] || "You are a general assistant";
  const contextSummary = formatContext(context, role);

  return `
# User Profile
- Role: ${role || "guest"}
- Name: ${user?.name || "User"}

# System Message
${roleDesc}

# Available Context
${contextSummary}

# User Question
"${message}"

# Instructions
1. Answer naturally and conversationally like ChatGPT
2. Be concise (2-4 sentences)
3. Use the context if relevant
4. Don't force templates - respond intelligently
5. If math/coding, show exact calculations

Respond now:`;
}

/**
 * Format available context for the AI prompt
 * Extracts relevant information the AI can use
 */
// Role: Prepare une valeur pour l affichage ou l API.
function formatContext(context, role) {
  if (!context || Object.keys(context).length === 0) {
    return "No specific context available.";
  }

  const parts = [];

  // Extract relevant context based on role
  if (role === "employee" && context.tasks?.length > 0) {
    parts.push(`- ${context.tasks.length} tasks available`);
  }
  
  if (role === "admin") {
    if (context.teamActivity?.length > 0) {
      parts.push(`- ${context.teamActivity.length} team activities`);
    }
    if (context.teamMembers?.length > 0) {
      parts.push(`- ${context.teamMembers.length} team members`);
    }
  }

  if (role === "stagiaire") {
    if (context.courses?.length > 0) {
      parts.push(`- ${context.courses.length} courses enrolled`);
    }
  }

  if (context.recentActivity?.length > 0) {
    parts.push("- Recent activity history available");
  }

  return parts.length > 0 ? parts.join("\n") : "Context: User profile loaded.";
}
