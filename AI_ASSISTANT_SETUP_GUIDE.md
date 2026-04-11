# ✅ AI ASSISTANT - SETUP & TESTING GUIDE

## 🎯 **5-MINUTE QUICK START**

### Step 1: Créer le fichier `.env` (1 minute)

Créer `c:\Users\MSI\omnia\.env`:

```env
# ========== DATABASE ==========
MONGO_URI=mongodb+srv://admin:12345@cluster0.mongodb.net/omnia

# ========== AI & ML SERVICES ==========
# Optional - AI assistant work without these
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxx
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# ========== SERVICE INFO ==========
NODE_ENV=development
PORT=8000
CLIENT_URL=http://localhost:5173
```

**Important:** Vous pouvez laisser vide pour maintenant!

### Step 2: Utiliser le RAG Service corrigé (1 minute)

Dans `server/controllers/aiAssistantController.js`, remplacer:

```javascript
// OLD
import ragService from '../services/ragService.js';

// NEW
import ragService from '../services/ragService-fixed.js';
```

### Step 3: Créer les indexes MongoDB (1 minute)

Ajouter dans `server/server.js` après `connectDB()`:

```javascript
import ragService from './services/ragService-fixed.js';

// After connectDB()
connectDB().then(async () => {
  console.log('✅ Database connected');
  
  // Create search indexes for AI assistant
  await ragService.createTextIndexes();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
```

### Step 4: Tester le service (2 minutes)

```bash
# Terminal 1: Start server
cd c:\Users\MSI\omnia
npm install  # if needed
npm run dev

# Terminal 2: Test indexing
curl -X POST http://localhost:8000/api/ai/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📚 **INDEXER VOS DOCUMENTS**

### Option 1: Indexer les documents existants

```bash
curl -X POST http://localhost:8000/api/ai/index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "documents": [
      {
        "id": "backend-analysis",
        "documentName": "BACKEND_ANALYSIS.md",
        "type": "markdown",
        "filePath": "BACKEND_ANALYSIS.md"
      },
      {
        "id": "ml-system",
        "documentName": "ML_SYSTEM_COMPLETE.md",
        "type": "markdown",
        "filePath": "ML_SYSTEM_COMPLETE.md"
      },
      {
        "id": "ai-fix",
        "documentName": "AI_ASSISTANT_FIX.md",
        "type": "markdown",
        "filePath": "AI_ASSISTANT_FIX.md"
      }
    ]
  }'
```

### Option 2: Indexer automatiquement au démarrage

Créer `server/seed/indexAIDocuments.js`:

```javascript
import fs from 'fs';
import path from 'path';
import ragService from '../services/ragService-fixed.js';

export const indexProjectDocuments = async () => {
  try {
    const documents = [];
    const docsPath = path.join(process.cwd(), '..');
    
    // Files to index
    const files = [
      'BACKEND_ANALYSIS.md',
      'ML_SYSTEM_COMPLETE.md',
      'AI_ASSISTANT_FIX.md',
      'README.md',
      'AI_INTEGRATION_CHECKLIST.md',
    ];

    for (const file of files) {
      const filePath = path.join(docsPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        documents.push({
          id: file.replace(/\./g, '-'),
          documentName: file,
          content,
          type: 'markdown',
          filePath: file,
        });
        console.log(`📄 Indexing ${file}`);
      }
    }

    if (documents.length > 0) {
      const result = await ragService.indexDocuments(documents);
      console.log(`✅ Indexed ${result.chunksCreated} chunks from ${result.documentsIndexed} documents`);
    }
  } catch (error) {
    console.warn('⚠️ Error indexing documents:', error.message);
  }
};
```

Appeler dans `server.js`:

```javascript
import { indexProjectDocuments } from './seed/indexAIDocuments.js';

connectDB().then(async () => {
  await ragService.createTextIndexes();
  await indexProjectDocuments();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
```

---

## 🧪 **TEST COMPLET**

### Test 1: Vérifier l'indexation

```bash
GET http://localhost:8000/api/ai/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response attendue:**
```json
{
  "status": "ready",
  "totalChunks": 45,
  "documentsIndexed": 3,
  "documents": [
    "BACKEND_ANALYSIS.md",
    "ML_SYSTEM_COMPLETE.md",
    "AI_ASSISTANT_FIX.md"
  ]
}
```

### Test 2: Chat simple

```bash
POST http://localhost:8000/api/ai/chat
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "query": "C'est quoi le projet?"
}
```

**Response attendue:**
```json
{
  "status": 200,
  "data": {
    "response": "Le projet Omni AI est une application complète...",
    "sources": [
      {
        "name": "BACKEND_ANALYSIS.md",
        "section": "Architecture",
        "importance": 0.8
      }
    ],
    "success": true,
    "retrievedDocuments": 3
  },
  "message": "Chat response generated successfully"
}
```

### Test 3: Questions spécifiques

```bash
# Question 1: Frontend
POST /api/ai/chat
{
  "query": "Comment faire le dark mode pour le frontend?"
}

# Question 2: Backend
POST /api/ai/chat
{
  "query": "Quels sont les endpoints API disponibles?"
}

# Question 3: ML
POST /api/ai/chat
{
  "query": "Comment fonctionne le système de prédiction de risque?"
}

# Question 4: Configuration
POST /api/ai/chat
{
  "query": "Comment configurer l'assistant AI?"
}
```

---

## ⚙️ **OPTIONS AVANCÉES**

### Activer Claude API (optionnel)

Si vous avez une clé Claude:

1. Aller à https://console.anthropic.com/
2. Créer une API key
3. Ajouter à `.env`:
   ```env
   CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
   ```
4. Redémarrer le serveur

Maintenant, Claude génèrera les réponses au lieu de just retourner le contenu.

### Activer Hugging Face (optionnel)

Pour embeddings avancés:

1. Aller à https://huggingface.co/settings/tokens
2. Créer un token
3. Ajouter à `.env`:
   ```env
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
   ```

### Ajouter plus de documents

Pour indexer tous vos fichiers `.md`:

```javascript
// In indexAIDocuments.js
const files = fs.readdirSync(docsPath)
  .filter(f => f.endsWith('.md'))
  .slice(0, 20); // Max 20 files
```

---

## 🐛 **TROUBLESHOOTING**

### Issue: "No relevant documents found"

**Cause:** Aucun document indexé
**Solution:**
```bash
# Vérifier l'indexation
curl http://localhost:8000/api/ai/status

# Si vide, indexer:
curl -X POST http://localhost:8000/api/ai/index \
  -H "Authorization: Bearer TOKEN" \
  -d '{"documents": [...]}'
```

### Issue: "Text index error"

**Cause:** Index MongoDB pas créé
**Solution:**
```javascript
// Manually create index
await ragService.createTextIndexes();

// Or in MongoDB:
db.documentchunks.createIndex({ content: "text", documentName: "text" })
```

### Issue: "Connection timeout from Claude"

**Cause:** API key invalide ou réseau
**Solution:**
```bash
# Test API key
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: sk-ant-xxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-3-sonnet-20240229", "messages": [{"role": "user", "content": "test"}], "max_tokens": 100}'

# If fails, check API key in .env
```

### Issue: "No documents returned"

**Cause:** Query trop générique
**Solution:**
```bash
# Essayer avec plus de contexte
POST /api/ai/chat
{
  "query": "Comment faire une authentification avec JWT?"
}

# Au lieu de
{
  "query": "What?"
}
```

---

## 📊 **SEARCH CHAIN FLOW**

```
User Query
  ↓
[1] Text Search (Full-text, fastest)
  - If found → Return results
  - If empty → Try [2]
  ↓
[2] Regex Search (Pattern matching)
  - If found → Return results
  - If empty → Try [3]
  ↓
[3] Keyword Search (Simple matching)
  - If found → Return results
  - If empty → No documents
  ↓
Generate Response
  - If Claude API key → Use Claude
  - If no key → Use text summary
  ↓
Response with Sources
```

**Clé:** Le système fonctionne sans API keys. Les API keys juste améliorent la qualité.

---

## ✅ **CONFIGURATION CHECKLIST**

- [ ] Créer `.env` file
- [ ] Importer `ragService-fixed.js`
- [ ] Créer text indexes dans `server.js`
- [ ] Accepter les routes `/api/ai`
- [ ] Indexer les documents
- [ ] Tester endpoint `/api/ai/chat`
- [ ] Tester endpoint `/api/ai/status`
- [ ] (Optional) Ajouter Claude API key
- [ ] (Optional) Ajouter Hugging Face API key

---

## 🚀 **COMMANDES UTILES**

```bash
# Test du serveur
curl http://localhost:8000/

# Vérifier l'indexation
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/ai/status

# Chat
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "How?"}'

# Réindexer
curl -X POST http://localhost:8000/api/ai/reload \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Clear index
curl -X POST http://localhost:8000/api/ai/clear \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📈 **EXPECTED PERFORMANCE**

| Operation | Time | Notes |
|-----------|------|-------|
| Text search | 50-100ms | Fastest |
| Regex search | 100-300ms | Medium |
| Keyword search | 200-500ms | Slower |
| Claude API call | 1-3s | With API key |
| Total response | 200ms-3s | Depends on path |

---

## 🎯 **NEXT STEPS**

1. **Immédiat**: Implémenter les 5-minute setup
2. **Court terme**: Tester avec vos questions
3. **Optionnel**: Ajouter Claude et Hugging Face keys
4. **Long terme**: Ajouter plus de documents pour mieux indexer

---

**Document Updated:** April 11, 2026  
**Status:** ✅ Ready to use (with or without API keys)
