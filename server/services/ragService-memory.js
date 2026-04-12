/**
 * RAG SERVICE (IN-MEMORY VERSION)
 * Loads all project documents into memory on startup
 * No MongoDB needed - works offline!
 */

import fs from 'fs';
import path from 'path';

class RAGServiceMemory {
  constructor() {
    this.documents = []; // Stored in RAM
    this.chunks = []; // All text chunks
    this.isLoaded = false;
  }

  /**
   * LOAD ALL PROJECT DOCUMENTS INTO MEMORY
   */
  async loadProjectDocuments() {
    try {
      console.log('[RAG-MEM] 🔄 Loading project documents into memory...');

      this.documents = [];
      this.chunks = [];

      const projectRoot = process.cwd();
      const files = this.findProjectFiles(projectRoot);

      console.log(`[RAG-MEM] Found ${files.length} files to index`);

      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Skip very large files
          if (content.length > 1024 * 1024) {
            console.log(`[RAG-MEM] ⏭️  Skipped large file: ${filePath}`);
            continue;
          }

          const filename = path.basename(filePath);
          const docChunks = this.splitIntoChunks(content, filename);

          this.documents.push({
            name: filename,
            path: filePath,
            size: content.length,
            chunkCount: docChunks.length,
          });

          this.chunks.push(...docChunks);
          console.log(`[RAG-MEM] ✅ Indexed: ${filename} (${docChunks.length} chunks)`);
        } catch (error) {
          console.warn(`[RAG-MEM] ⚠️  Error reading ${filePath}:`, error.message);
        }
      }

      this.isLoaded = true;
      console.log(`[RAG-MEM] ✅ Loaded ${this.documents.length} documents, ${this.chunks.length} chunks into memory`);

      return {
        success: true,
        documentsLoaded: this.documents.length,
        chunksLoaded: this.chunks.length,
      };
    } catch (error) {
      console.error('[RAG-MEM] Error loading documents:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * FIND PROJECT FILES
   */
  findProjectFiles(dir, files = []) {
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.env', '.next', 'public'];
    const includeExtensions = ['.md', '.js', '.ts', '.py', '.json'];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            this.findProjectFiles(fullPath, files);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (includeExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore errors on restricted dirs
    }

    return files;
  }

  /**
   * SPLIT TEXT INTO CHUNKS
   */
  splitIntoChunks(content, filename) {
    const chunks = [];
    const chunkSize = 800;
    const overlap = 200;

    let i = 0;
    let chunkIndex = 0;

    while (i < content.length) {
      const chunk = content.substring(i, i + chunkSize);

      if (chunk.trim().length > 0) {
        chunks.push({
          id: `${filename}_${chunkIndex}`,
          documentName: filename,
          content: chunk,
          section: this.extractSection(chunk),
          chunkIndex,
          score: 0, // Will be calculated during search
        });
        chunkIndex++;
      }

      i += chunkSize - overlap;
    }

    return chunks.length > 0 ? chunks : [];
  }

  /**
   * EXTRACT SECTION FROM TEXT
   */
  extractSection(text) {
    const match = text.match(/^#+\s+(.+)$/m);
    return match ? match[1] : 'Content';
  }

  /**
   * SEARCH DOCUMENTS IN MEMORY
   */
  searchDocuments(query) {
    if (!this.isLoaded || this.chunks.length === 0) {
      console.log('[RAG-MEM] ⚠️  No documents loaded');
      return [];
    }

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const topK = 5;

    // Score all chunks
    const scored = this.chunks
      .map(chunk => {
        let score = 0;
        const contentLower = chunk.content.toLowerCase();

        // Keyword matching
        queryWords.forEach(word => {
          const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
          score += matches * 0.1;
        });

        // Boost if in heading
        if (chunk.section.toLowerCase().includes(queryWords[0])) {
          score += 1;
        }

        return { ...chunk, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[RAG-MEM] Found ${scored.length} relevant chunks for: "${query}"`);
    return scored;
  }

  /**
   * GENERATE RESPONSE WITH RAG
   */
  async generateResponseWithRAG(userQuery, userId) {
    try {
      // If not loaded, try to load
      if (!this.isLoaded) {
        console.log('[RAG-MEM] Documents not loaded, loading now...');
        await this.loadProjectDocuments();
      }

      // Search for relevant chunks
      const relevantChunks = this.searchDocuments(userQuery);

      // Build response
      let response = '';
      const sources = [];

      if (relevantChunks.length > 0) {
        // Extract first lines from chunks
        const lines = relevantChunks
          .flatMap(c => c.content.split('\n'))
          .filter(l => l.trim().length > 0)
          .slice(0, 8);

        sources.push(...[...new Set(relevantChunks.map(c => c.documentName))]);
        response = `📚 **Basé sur la documentation:**\n\n${lines.join('\n')}\n\n💡 **Sources:** ${sources.join(', ')}`;
      } else {
        // Fallback response
        response = this.generateFallbackResponse(userQuery);
      }

      return {
        response,
        sources,
        success: true,
        documentsFound: relevantChunks.length,
        mode: 'in-memory-rag',
      };
    } catch (error) {
      console.error('[RAG-MEM] Error:', error);
      return {
        response: this.generateFallbackResponse(userQuery),
        sources: [],
        success: true,
        error: error.message,
        mode: 'fallback',
      };
    }
  }

  /**
   * FALLBACK RESPONSE
   */
  generateFallbackResponse(query) {
    const q = query.toLowerCase();

    const responses = {
      auth: "🔐 **Authentification**: Utilise JWT tokens. Routes: POST /api/auth/register, POST /api/auth/login. Tokens en localStorage + refreshToken en BD.",
      features: "✨ **Fonctionnalités**: ML Predictions | Anomaly Detection | 12+ Modules | Finance Management | Task Management | Notifications | Analytics | AI Chat",
      setup: "🚀 **Installation**: npm install (root + server) → Configurer .env → npm run dev (deux terminals)",
      db: "🗄️ **MongoDB**: Collections: users, organizations, tasks, finances, mlpredictions, notifications",
      api: "🔌 **API**: Base http://localhost:3000/api avec routes: /auth, /users, /tasks, /finances, /notifications, /ai",
      arch: "🏗️ **Architecture**: React + Node.js + MongoDB + Socket.io + Python ML Service",
      help: "💡 **Aide**: Pose des questions sur: features, setup, database, api, architecture, authentication",
    };

    if (q.includes('auth') || q.includes('login')) return responses.auth;
    if (q.includes('feature')) return responses.features;
    if (q.includes('setup') || q.includes('install')) return responses.setup;
    if (q.includes('database') || q.includes('mongo') || q.includes('db')) return responses.db;
    if (q.includes('api')) return responses.api;
    if (q.includes('arch') || q.includes('structure')) return responses.arch;
    if (q.includes('help') || q.includes('aide')) return responses.help;
    if (q.includes('1+1')) return "= 2";
    if (q.includes('hello') || q.includes('hi') || q.includes('salut')) return "Salut! Je suis l'assistant Omni AI. Comment puis-je t'aider?";

    return "Je n'ai pas compris. Pose une question sur: features, setup, database, api, architecture, authentication";
  }

  /**
   * GET STATUS
   */
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      documentsLoaded: this.documents.length,
      chunksLoaded: this.chunks.length,
      documents: this.documents,
    };
  }

  /**
   * SEMANTIC SEARCH
   */
  async semanticSearch(query, limit = 5) {
    if (!this.isLoaded) {
      await this.loadProjectDocuments();
    }

    return this.searchDocuments(query).slice(0, limit);
  }
}

// Export singleton
export default new RAGServiceMemory();
