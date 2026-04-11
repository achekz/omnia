# 🚨 AI ASSISTANT - ISSUES FOUND & FIX

## ❌ **PROBLÈMES DÉTECTÉS**

### 1. **API Keys Manquantes**
```env
❌ HUGGINGFACE_API_KEY - NOT SET
❌ CLAUDE_API_KEY - NOT SET
```

L'assistant AI ne peut pas fonctionner sans ces clés.

### 2. **MongoDB Vector Search non supporté**
Le code utilise `$search` (Azure Cosmos DB feature) mais MongoDB standard ne le supporte pas.

```javascript
// ❌ ERREUR: Cette syntaxe ne fonctionne qu'avec Azure Cosmos
const results = await DocumentChunk.aggregate([
  {
    $search: {
      cosmosSearch: {
        vector: queryEmbedding,
        k: limit,
      },
      returnScore: true,
    },
  },
]);
```

### 3. **Fallback Search**
Heureusement, il y a des fallbacks:
- ✅ Text search (utilise MongoDB text indexes)
- ✅ Regex search (last resort)

Mais ils ne sont activés que si la recherche vectorielle échoue.

---

## ✅ **SOLUTION COMPLÈTE**

### Step 1: Créer le fichier `.env`

```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/omnia

# AI & ML Services
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Service URLs
ML_SERVICE_URL=http://localhost:5001
CLAUDE_API_URL=https://api.anthropic.com/v1/messages

# Other
NODE_ENV=development
PORT=8000
CLIENT_URL=http://localhost:5173
```

**Où obtenir les clés:**

1. **Hugging Face API Key**
   - Aller à https://huggingface.co/settings/tokens
   - Créer un nouveau token
   - Copier dans HUGGINGFACE_API_KEY

2. **Claude API Key**
   - Aller à https://console.anthropic.com/
   - Créer une clé API
   - Copier dans CLAUDE_API_KEY

### Step 2: Fixer le RAG Service

Le problème: MongoDB standard n'a pas `$search`. Solution: utiliser le fallback à la place.

Créer un fichier RAG corrigé:
```
server/services/ragService-fixed.js
```

Les changements:
- Remplacer la recherche $search par une recherche basée sur la similarité cosinus
- Utiliser le fallback text search comme méthode principale
- Garder la recherche vectorielle optionnelle

### Step 3: Créer les MongoDB Text Indexes

Avant d'utiliser le RAG, créer les indexes:

```bash
# Dans MongoDB shell ou Compass
db.documentchunks.createIndex({ content: "text", documentName: "text", section: "text" })
db.documentchunks.createIndex({ "embedding": 1 })
```

Ou dans Node.js:
```javascript
// server/seed/createAIIndexes.js
import DocumentChunk from '../models/DocumentChunk.js';

export const createAIIndexes = async () => {
  try {
    // Text indexing for search
    await DocumentChunk.collection.createIndex({
      content: 'text',
      documentName: 'text',
      section: 'text',
    });
    console.log('✅ Text indexes created');

    // Embedding index for vector search
    await DocumentChunk.collection.createIndex({
      embedding: '2dsphere',
    });
    console.log('✅ Embedding indexes created');
  } catch (error) {
    console.error('Index creation error:', error);
  }
};
```

Exécuter au démarrage du serveur:
```javascript
// In server.js
import { createAIIndexes } from './seed/createAIIndexes.js';

connectDB().then(() => {
  createAIIndexes();
  app.listen(PORT, () => console.log('Server running...'));
});
```

### Step 4: Charger les documents

Avant de poser des questions, l'assistant doit avoir des documents indexés.

```javascript
// POST /api/ai/index (admin only)
const documentsToIndex = [
  {
    id: 'backend-analysis',
    documentName: 'BACKEND_ANALYSIS.md',
    content: fs.readFileSync('BACKEND_ANALYSIS.md', 'utf-8'),
    type: 'markdown',
    filePath: 'BACKEND_ANALYSIS.md',
  },
  {
    id: 'ml-system',
    documentName: 'ML_SYSTEM_COMPLETE.md',
    content: fs.readFileSync('ML_SYSTEM_COMPLETE.md', 'utf-8'),
    type: 'markdown',
    filePath: 'ML_SYSTEM_COMPLETE.md',
  },
  // ...more documents
];

await ragService.indexDocuments(documentsToIndex);
```

---

## 🔧 **QUICK FIX - 5 MINUTES**

Si vous voulez juste que ça marche MAINTENANT:

### 1. Créer `.env`
```bash
HUGGINGFACE_API_KEY=hf_test123
CLAUDE_API_KEY=sk-ant-test123
```

### 2. Modifier `ragService.js` pour désactiver la recherche vectorielle

```javascript
async semanticSearch(query, limit = this.topK, filters = {}) {
  try {
    // ✅ Skip vector search, go directly to text search
    return await this.textSearch(query, limit);
  } catch (error) {
    return await this.regexSearch(query, limit);
  }
}
```

### 3. Créer les indexes MongoDB
```javascript
// Add to server.js after connectDB()
await DocumentChunk.collection.createIndex({
  content: 'text',
  documentName: 'text',
  section: 'text',
});
```

### 4. Indexer quelques documents
```bash
POST /api/ai/index
Body:
{
  "documents": [
    {
      "id": "readme",
      "documentName": "README.md",
      "content": "...",
      "type": "markdown"
    }
  ]
}
```

### 5. Tester
```bash
POST /api/ai/chat
Body:
{
  "query": "Comment ça marche?"
}
```

---

## 🧪 **TEST COMPLET**

### Test 1: Health Check
```bash
curl http://localhost:8000/api/ai/status
```

Expected:
```json
{
  "status": "ok",
  "documentsIndexed": 2,
  "ready": true
}
```

### Test 2: Chat Simple (sans API keys)
```bash
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "C'est quoi le projet?"
  }'
```

Expected:
```json
{
  "response": "Je n'ai pas trouvé...",
  "sources": [],
  "success": false
}
```

Ou avec documents indexés et API keys:
```json
{
  "response": "Le projet Omni AI est...",
  "sources": [
    {
      "name": "BACKEND_ANALYSIS.md",
      "section": "Architecture",
      "relevance": 0.95
    }
  ],
  "success": true
}
```

---

## 📋 **CONFIGURATION CHECKLIST**

- [ ] Créer fichier `.env` avec API keys
- [ ] Obtenir Hugging Face API key
- [ ] Obtenir Claude API key
- [ ] Créer MongoDB text indexes
- [ ] Indexer au moins 1 document
- [ ] Tester endpoint `/api/ai/chat`
- [ ] Vérifier les réponses
- [ ] Accorder les documents supplémentaires

---

## 🚨 **ERREURS COURANTES & SOLUTIONS**

| Erreur | Cause | Solution |
|--------|-------|----------|
| "No relevant documents found" | Documents pas indexés | Appeler POST /api/ai/index |
| "Invalid API key" | HUGGINGFACE_API_KEY manquante | Mettre à jour `.env` |
| "Vector search failed" | MongoDB ne supporte pas $search | Utiliser text search fallback |
| "Connection timeout" | Claude API inaccessible | Vérifier CLAUDE_API_KEY |
| "Embedding error" | Hugging Face API timeout | Réessayer, vérifier rate limits |

---

## 📊 **ARCHITECTURE FINALE**

```
User Question
    ↓
ChatWithAI Controller
    ↓
RAG Service
    ├─ Text Search (Fallback #1) ✅ FONCTIONNE
    ├─ Regex Search (Fallback #2) ✅ FONCTIONNE
    └─ Vector Search (Optionnel) ❌ NÉCESSITE EMBEDDING
    ↓
Claude API (si API key présente)
    ↓
Response with Sources
```

**La clé:** Text search fonctionne SANS API keys. Vector search nécessite Hugging Face API key.

---

## 🎯 **PROCHAINES ÉTAPES**

1. **Immédiat** (5 min): Créer `.env` avec API keys
2. **Court terme** (15 min): Indexer documents et tester
3. **Moyen terme** (30 min): Ajouter plus de documents
4. **Long terme** (optionnel): Implémenter vector search complet

---

**Document Updated:** April 11, 2026
**AI Assistant Status:** ⚠️ Partiellement fonctionnel (en attente de configuration)
