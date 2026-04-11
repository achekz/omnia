import fs from 'fs';
import path from 'path';
import ragService from '../services/ragService.js';

/**
 * DOCUMENT LOADER
 * Loads and indexes documents from the workspace
 */

class DocumentLoader {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || './';
    this.includedExtensions = ['.md', '.js', '.ts', '.py', '.json', '.txt'];
    this.excludedDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '__pycache__',
      '.env',
      '.venv',
    ];
  }

  /**
   * LOAD ALL DOCUMENTS
   */
  async loadAllDocuments() {
    try {
      console.log('🔍 Starting document loading...');

      const documents = [];

      // 1️⃣ LOAD MARKDOWN DOCUMENTATION
      const mdDocs = this.loadMarkdownDocs();
      documents.push(...mdDocs);
      console.log(`✅ Loaded ${mdDocs.length} markdown documents`);

      // 2️⃣ LOAD SOURCE CODE
      const codeDocs = this.loadSourceCode();
      documents.push(...codeDocs);
      console.log(`✅ Loaded ${codeDocs.length} code files`);

      // 3️⃣ LOAD API DOCUMENTATION
      const apiDocs = this.loadAPIDocs();
      documents.push(...apiDocs);
      console.log(`✅ Loaded ${apiDocs.length} API documentation files`);

      console.log(`📚 Total documents loaded: ${documents.length}`);

      return documents;
    } catch (error) {
      console.error('Error loading documents:', error);
      return [];
    }
  }

  /**
   * LOAD MARKDOWN DOCUMENTATION
   */
  loadMarkdownDocs() {
    const documents = [];
    const docsDir = path.join(this.projectRoot);

    // Load .md files from root
    const mdFiles = fs
      .readdirSync(docsDir)
      .filter(
        file =>
          file.endsWith('.md') &&
          ![
            'node_modules',
            'src',
            'server',
            'public',
            'ml_service',
          ].some(dir => file.includes(dir))
      );

    for (const file of mdFiles) {
      const filePath = path.join(docsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        documents.push({
          id: `md_${Date.now()}_${Math.random()}`,
          documentName: file.replace('.md', ''),
          type: 'markdown',
          filePath: filePath,
          content: content,
          language: 'fr', // French docs
        });
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
      }
    }

    return documents;
  }

  /**
   * LOAD SOURCE CODE FILES
   */
  loadSourceCode() {
    const documents = [];

    // Load key backend files
    const backendDirs = [
      'server/controllers',
      'server/services',
      'server/routes',
      'server/middleware',
      'server/models',
    ];

    for (const dir of backendDirs) {
      const fullPath = path.join(this.projectRoot, dir);

      if (!fs.existsSync(fullPath)) continue;

      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const filePath = path.join(fullPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          documents.push({
            id: `code_${Date.now()}_${Math.random()}`,
            documentName: `${path.basename(dir)}/${file}`,
            type: 'javascript',
            filePath: filePath,
            content: content,
            language: 'en',
          });
        } catch (error) {
          console.error(`Error reading ${filePath}:`, error.message);
        }
      }
    }

    return documents;
  }

  /**
   * LOAD API DOCUMENTATION
   */
  loadAPIDocs() {
    const documents = [];

    try {
      // Check for API documentation files
      const apiDocFiles = [
        'BACKEND_ANALYSIS.md',
        'API_DOCUMENTATION.md',
        'README.md',
      ];

      for (const file of apiDocFiles) {
        const filePath = path.join(this.projectRoot, file);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');

          documents.push({
            id: `api_${Date.now()}_${Math.random()}`,
            documentName: `API - ${file}`,
            type: 'markdown',
            filePath: filePath,
            content: content,
            language: 'fr',
          });
        }
      }
    } catch (error) {
      console.error('Error loading API docs:', error);
    }

    return documents;
  }

  /**
   * INDEX DOCUMENTS IN RAG SERVICE
   */
  async indexDocuments(documents) {
    try {
      if (documents.length === 0) {
        console.warn('⚠️ No documents to index');
        return { success: false, message: 'No documents loaded' };
      }

      console.log(`🔄 Indexing ${documents.length} documents...`);

      const result = await ragService.indexDocuments(documents);

      console.log('✅ Document indexing complete');
      console.log(`   - Documents: ${result.documentsIndexed}`);
      console.log(`   - Chunks: ${result.chunksCreated}`);

      return result;
    } catch (error) {
      console.error('Error indexing documents:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LOAD AND INDEX ALL DOCUMENTS
   */
  async loadAndIndex() {
    try {
      const documents = await this.loadAllDocuments();
      const result = await this.indexDocuments(documents);

      return result;
    } catch (error) {
      console.error('Error in loadAndIndex:', error);
      throw error;
    }
  }

  /**
   * RELOAD DOCUMENTS (for development)
   */
  async reloadDocuments() {
    try {
      console.log('🔄 Reloading documents...');

      // Delete old chunks
      const { DeleteResult } = await import('mongodb');
      // This would delete old entries

      // Load and index fresh
      return await this.loadAndIndex();
    } catch (error) {
      console.error('Error reloading documents:', error);
      throw error;
    }
  }
}

export default new DocumentLoader();
