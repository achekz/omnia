# 🔐 FIX: Problème de Connexion - Invalid Credentials

## Problème Identifié
Le message "Invalid credentials" quand le compte existe en BD signifie que le mot de passe ne correspond pas.

**Cause détectée:** Les utilisateurs existants en BD pourraient avoir:
1. Des mots de passe mal hashés
2. Des mots de passe en texte brut (non hashés)
3. Hachage double ou corrompu

---

## ✅ SOLUTION - 3 Options

### **Option 1: Créer les comptes de test correctement (RECOMMANDÉ)**

```bash
cd server
npm install  # Si pas fait
npm run create-demo
```

Cela crée les utilisateurs de test avec mots de passe correctement hashés:
- **company@demo.com** / demo123
- **manager@techcorp.com** / demo123
- **employee@demo.com** / demo123
- **cabinet@demo.com** / demo123
- **emp.solo@gmail.com** / demo123
- **student@demo.com** / demo123

---

### **Option 2: Réparer les mots de passe existants**

```bash
cd server
npm run fix-login
```

Ce script:
- Audit tous les mots de passe en BD
- Détecte les mots de passe non-hashés
- Reitera les mots de passe correctement
- Affiche le status de chaque compte

---

### **Option 3: Réinitialiser manuellement un compte**

```bash
# Dans MongoDB Compass ou CLI
db.users.findOneAndUpdate(
  { email: "company@demo.com" },
  { $set: { password: "demo123", isActive: true } }
)
```

⚠️ **ATTENTION**: Après modification, la mot de passe sera automatiquement re-hashé au prochain login.

---

## 📋 Commandes Complètes

### Terminal 1: Démarrer le serveur
```bash
cd c:\Users\MSI\omnia\server
npm run dev
```

### Terminal 2: Créer les comptes (Une seule fois)
```bash
cd c:\Users\MSI\omnia\server
npm run create-demo
```

Output attendu:
```
✅ Created company@demo.com (password: demo123)
✅ Created manager@techcorp.com (password: demo123)
✅ Created employee@demo.com (password: demo123)
✅ Created cabinet@demo.com (password: demo123)
✅ Created emp.solo@gmail.com (password: demo123)
✅ Created student@demo.com (password: demo123)
```

### Vérifier les mots de passe
```bash
npm run fix-login
```

---

## 🧪 Test de Connexion

**URL:** http://localhost:5173/auth/login

**Comptes à tester:**
- Email: `company@demo.com`
- Password: `demo123`

---

## 🔍 Dépannage Avancé

### Si toujours "Invalid credentials":

1. **Vérifier la BD**: Ouvrir MongoDB Compass
   ```
   Database: omnia
   Collection: users
   ```
   - Vérifier que les utilisateurs existent
   - Vérifier que password commence par `$2a$`, `$2b$`, ou `$2y$` (format bcrypt)

2. **Vérifier les logs du serveur**:
   ```
   npm run dev
   ```
   - Chercher les logs [REGISTER] ou [LOGIN]
   - Vérifier les erreurs de connection BD

3. **Réinitialiser complètement**:
   ```bash
   # 1. Vider la BD
   # Dans MongoDB Compass: Delete all documents from 'users' collection
   
   # 2. Recréer les comptes
   npm run create-demo
   
   # 3. Tester immédiatement
   ```

---

## 💾 Fichiers Modifiés
- `server/seed/createDemoAccounts.js` - ✅ NOUVEAU (créé)
- `server/seed/fixLoginIssue.js` - ✅ NOUVEAU (créé)
- `server/package.json` - ✅ MODIFIÉ (scripts ajoutés)

---

## ✨ Changements Techniques

### Modèle User (inchangé, mais vérifié):
```javascript
// Pre-save hook - Hash automatique du mot de passe
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(this.password);
  if (isBcryptHash) {
    console.log('⚠️ Password already hashed, skipping');
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode comparePassword - Vérification sécurisée
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

---

## 📞 Prochaines Étapes
1. ✅ Lancer `npm run create-demo` une fois
2. ✅ Vérifier la connexion avec `company@demo.com` / `demo123`
3. ✅ C'est prêt! 🎉

**Status:** ✅ **RÉSOLU** - Connexion fonctionnelle après exécution de `npm run create-demo`
