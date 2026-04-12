import fs from 'fs';
import path from 'path';
import ragService from '../services/ragService-complete.js';

/**
 * DOCUMENT LOADER & INDEXER
 * Loads project files and indexes them for RAG
 */

class DocumentIndexer {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || './';
    this.includedExtensions = ['.md', '.js', '.ts', '.py', '.json'];
    this.excludedDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.env', '.next'];
    this.maxFileSize = 1024 * 1024; // 1MB
  }

  /**
   * INDEX ALL PROJECT DOCUMENTS
   */
  async indexProjectDocuments() {
    try {
      console.log('[INDEXER] Starting project indexing...');
      
      const files = this.findProjectFiles(this.projectRoot);
      console.log(`[INDEXER] Found ${files.length} files to index`);

      const documents = [];

      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Skip files that are too large
          if (content.length > this.maxFileSize) {
            console.log(`[INDEXER] Skipping large file: ${filePath}`);
            continue;
          }

          const ext = path.extname(filePath);
          documents.push({
            id: `doc_${filePath.replace(/[^a-z0-9]/gi, '_')}`,
            name: path.basename(filePath),
            path: filePath,
            type: this.getFileType(ext),
            content: content,
            size: content.length,
          });

          console.log(`[INDEXER] ✅ Indexed: ${filePath}`);
        } catch (error) {
          console.warn(`[INDEXER] Error reading ${filePath}:`, error.message);
        }
      }

      if (documents.length === 0) {
        console.log('[INDEXER] No documents to index');
        return { success: false, message: 'No documents found' };
      }

      // Index documents
      const result = await ragService.indexDocuments(documents);
      console.log('[INDEXER] ✅ Indexing complete:', result);

      return result;
    } catch (error) {
      console.error('[INDEXER] Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * FIND ALL PROJECT FILES
   */
  findProjectFiles(dir, files = []) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        // Skip excluded directories
        if (stat.isDirectory()) {
          if (!this.excludedDirs.includes(item)) {
            this.findProjectFiles(fullPath, files);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (this.includedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`[INDEXER] Error scanning directory ${dir}:`, error.message);
    }

    return files;
  }

  /**
   * GET FILE TYPE
   */
  getFileType(ext) {
    const mapping = {
      '.md': 'markdown',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.json': 'json',
    };
    return mapping[ext] || 'other';
  }

  /**
   * INDEX SPECIFIC DOCUMENTS
   */
  async indexSpecificDocuments(filePaths) {
    try {
      const documents = [];

      for (const filePath of filePaths) {
        if (!fs.existsSync(filePath)) {
          console.warn(`[INDEXER] File not found: ${filePath}`);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath);

        documents.push({
          id: `doc_${filePath.replace(/[^a-z0-9]/gi, '_')}`,
          name: path.basename(filePath),
          path: filePath,
          type: this.getFileType(ext),
          content: content,
        });
      }

      if (documents.length === 0) {
        return { success: false, message: 'No valid documents' };
      }

      return await ragService.indexDocuments(documents);
    } catch (error) {
      console.error('[INDEXER] Error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export default new DocumentIndexer();
