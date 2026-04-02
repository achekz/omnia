/**
 * Build a dynamic prompt that will be sent to the AI model
 * This creates context for real, intelligent responses
 * NOTE: This is kept for backward compatibility but not used in the new ai.service.js
 */
export function buildPrompt(user, message, context) {
  if (!message) {
    return "Please provide a question.";
  }

  const roleDescriptions = {
    employee: "You are a productivity assistant for an employee",
    company_admin: "You are a strategic consultant for company management",
    cabinet_admin: "You are a financial advisor for accounting",
    student: "You are an academic assistant for students"
  };

  const roleDesc = roleDescriptions[user?.role] || "You are a general assistant";
  const contextSummary = formatContext(context, user?.role);

  return `
# User Profile
- Role: ${user?.role || "guest"}
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
function formatContext(context, role) {
  if (!context || Object.keys(context).length === 0) {
    return "No specific context available.";
  }

  const parts = [];

  // Extract relevant context based on role
  if (role === "employee" && context.tasks?.length > 0) {
    parts.push(`- ${context.tasks.length} tasks available`);
  }
  
  if (role === "company_admin") {
    if (context.teamActivity?.length > 0) {
      parts.push(`- ${context.teamActivity.length} team activities`);
    }
    if (context.teamMembers?.length > 0) {
      parts.push(`- ${context.teamMembers.length} team members`);
    }
  }

  if (role === "cabinet_admin") {
    if (context.financialData?.length > 0) {
      parts.push(`- Financial records available`);
    }
  }

  if (role === "student") {
    if (context.courses?.length > 0) {
      parts.push(`- ${context.courses.length} courses enrolled`);
    }
  }

  if (context.recentActivity?.length > 0) {
    parts.push("- Recent activity history available");
  }

  return parts.length > 0 ? parts.join("\n") : "Context: User profile loaded.";
}