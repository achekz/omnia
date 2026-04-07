# 🔧 Guide de Correction - Registration Failed

## ❌ Problème
Erreur "Registration Failed - Could not create account" lors de la création d'un nouveau compte.

## ✅ Solution Complète

### Étape 1️⃣ : Configurer le fichier `.env`

1. **Créer le fichier `.env` dans le dossier `server/`** :
   ```bash
   cp server/.env.example server/.env
   ```

2. **Éditer `server/.env` avec vos vraies valeurs** :
   ```env
   # ✅ MongoDB Atlas URI (REQUIS)
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/omniai?retryWrites=true&w=majority

   # ✅ JWT Secrets (générer des clés aléatoires)
   JWT_SECRET=your_super_secret_key_make_it_long_and_random_at_least_32_chars
   JWT_REFRESH_SECRET=your_refresh_secret_key_also_long_and_random_at_least_32_chars
   JWT_EXPIRE=15m
   JWT_REFRESH_EXPIRE=7d

   # ✅ Configuration
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:5173
   ```

**Comment obtenir l'URI MongoDB Atlas** :
- Aller sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Créer un cluster ou utiliser un existant
- Cliquer sur "Connect" → "Drivers"
- Copier la chaîne de connexion
- Remplacer `<password>` et `<username>` par vos identifiants
- Remplacer `@cluster` par votre cluster réel

---

### Étape 2️⃣ : Redémarrer le serveur

```bash
cd server
npm install  # Si vous n'avez pas les dépendances
npm run dev  # Redémarrer le serveur
```

**Vérifier les logs** :
```
✅ MongoDB Connected: mongodb.net
✅ Database: omniai
🚀 Server running in development mode on port 5000
```

---

### Étape 3️⃣ : Tester la registration

1. Aller sur http://localhost:5173/register
2. Remplir le formulaire :
   - **Full Name**: `John Doe`
   - **Email**: `john@example.com`
   - **Password**: `YourPassword123`
   - **Role**: Sélectionner `Employee` ou `Student`
   - **Cliquer**: "Create Account"

3. **Si ça fonctionne** ✅
   - Vous verrez le message "Account created!"
   - Vous serez redirigé vers le dashboard

---

### ❌ Si ça ne fonctionne pas encore

#### Vérifier 1: MongoDB connecté ?
Dans le terminal serveur, cherchez :
```
✅ MongoDB Connected: [hostname]
```

Si vous voyez ``❌ MongoDB Connection Error``, vérifier :
- ✅ MONGO_URI est présent dans `.env`
- ✅ Votre IP est en whitelist sur MongoDB Atlas (Network Access)
- ✅ L'URI contient les bons credentials

#### Vérifier 2: API répond ?
```bash
curl http://localhost:5000
# Should return: ✅ Omni AI API is running...
```

#### Vérifier 3: Vérifier les logs détaillés

Dans `server/app.js`, les logs incluent maintenant :
```
📝 [REGISTER] Attempting registration: { name, email, profileType }
🏢 [REGISTER] Creating organization: orgName
✅ [REGISTER] Organization created: [id]
👤 [REGISTER] Creating user: email
✅ [REGISTER] User created: [id]
✅ [REGISTER] Registration completed successfully
```

Si une erreur apparaît, elle sera loggée avec `❌ [REGISTER] Error: ...`

---

### Étape 4️⃣ : Fixer les mots de passe existants

Si vous aviez des comptes créés antérieurement :

```bash
cd server
node seed/fixPasswordHashing.js
```

Output :
```
📊 Found X users
✅ Fixed: Y
✅ Already correct: Z
```

---

## 🎯 Résumé des Corrections Apportées

| Correction | Fichier | Détail |
|-----------|---------|--------|
| Détection double hash | `models/User.js` | Évite le rehachage des mots de passe |
| Logging détaillé auth | `controllers/authController.js` | Trace chaque étape de la registration |
| Logs MongoDB | `config/db.js` | Affiche l'état de la connexion |
| Logs erreurs | `middleware/errorHandler.js` | Meilleur diagnostic des erreurs |
| Template .env | `server/.env.example` | Template de configuration |
| Script fix passwords | `seed/fixPasswordHashing.js` | Réinitialise les mots de passe |

---

## 🆘 Besoin d'aide ?

1. **Vérifier les logs du terminal** - ils disent exactement où ça plante
2. **Vérifier MongoDB Atlas** - UI connectée ?
3. **Vérifier les variables d'env** - NODE_ENV, JWT secrets définis ?

---
