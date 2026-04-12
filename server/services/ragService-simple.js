/**
 * RAG SERVICE (ULTRA-SIMPLE VERSION)
 * No external dependencies, works offline
 */

class RAGServiceSimple {
  constructor() {
    this.responses = {
      features: "Omni AI inclut: ML prédictif, anomalies détectées, 12+ modules, sécurité d'entreprise, gestion des finances, tâches, notifications, analyses.",
      pricing: "Plans disponibles: Starter, Pro, Enterprise. Contact pour tarifs.",
      setup: "Pour mettre en place: npm install, configurez MongoDB, lancez npm run dev",
      help: "Que puis-je faire pour toi?",
    };
  }

  async generateResponseWithRAG(userQuery, userId) {
    try {
      console.log('[RAG-SIMPLE] Query:', userQuery);

      const queryLower = userQuery.toLowerCase();
      let response = "Je ne suis pas sûr. Peux-tu reformuler ta question?";

      // Simple keyword matching
      if (queryLower.includes('feature') || queryLower.includes('fonction')) {
        response = this.responses.features;
      } else if (queryLower.includes('price') || queryLower.includes('prix')) {
        response = this.responses.pricing;
      } else if (queryLower.includes('setup') || queryLower.includes('install')) {
        response = this.responses.setup;
      } else if (queryLower.includes('hello') || queryLower.includes('hi') || queryLower.includes('salut')) {
        response = "Salut! Je suis l'assistant Omni AI. Comment puis-je t'aider?";
      } else if (queryLower.includes('help') || queryLower.includes('aide')) {
        response = this.responses.help;
      }

      return {
        response,
        sources: [],
        success: true,
        mode: 'simple-mode',
      };
    } catch (error) {
      console.error('[RAG-SIMPLE] Error:', error);
      return {
        response: "Erreur: " + error.message,
        sources: [],
        success: false,
        error: error.message,
      };
    }
  }

  async semanticSearch(query, limit = 5) {
    return [];
  }

  async indexDocuments(documents) {
    return { success: true, documentsIndexed: 0, chunksCreated: 0 };
  }

  async createTextIndexes() {
    return { success: true };
  }

  async getIndexingStatus() {
    return { status: 'ready', totalChunks: 0, documentsIndexed: 0 };
  }

  async clearIndex() {
    return { success: true, deletedCount: 0 };
  }
}

// Export single instance
export default new RAGServiceSimple();
