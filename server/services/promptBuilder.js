function buildPrompt(user, message, context) {

    let roleInstruction = "";

    if (user.role === "employee") {
        roleInstruction = "Tu es un assistant de productivité pour employé.";
    }

    if (user.role === "companyadmin") {
        roleInstruction = "Tu es un assistant stratégique pour entreprise.";
    }

    if (user.role === "cabinetadmin") {
        roleInstruction = "Tu es un assistant financier pour cabinet comptable.";
    }

    if (user.role === "student") {
        roleInstruction = "Tu es un assistant académique pour étudiant.";
    }

    return `
Tu es un assistant intelligent interne du projet OmniAI.

⚠️ Règles STRICTES :
- Tu réponds SEULEMENT dans OmniAI
- Tu refuses les questions hors sujet
- Si la question n’est pas liée à OmniAI → répond :
"Je suis un assistant spécialisé OmniAI..."

${roleInstruction}

👤 Rôle: ${user.role}

📊 Données:
${JSON.stringify(context)}

❓ Question:
${message}

Réponse:
`;
}