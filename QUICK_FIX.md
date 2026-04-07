# ⚡ Quick Fix - Registration Failed

## 🔴 Erreur: "Registration Failed - Could not create account"

### ✅ 3 Étapes Rapides

#### 1️⃣ Créer le fichier `.env`

```bash
cd server
cp .env.example .env
```

**Puis éditer `server/.env` avec vos valeurs MongoDB Atlas:**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/omniai?retryWrites=true&w=majority
JWT_SECRET=your_very_long_random_secret_key_at_least_32_characters
JWT_REFRESH_SECRET=another_very_long_random_secret_key_at_least_32_characters
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
```

---

#### 2️⃣ Tester la Connexion MongoDB

```bash
cd server
node seed/testMongoDB.js
```

✅ Si vous voyez `✅ Connection successful!` → Continuez à 3️⃣

❌ Si erreur → Vérifier:
- L'URI MongoDB est correct
- Votre IP est en whitelist sur MongoDB Atlas
- Identifiants sont bons

---

#### 3️⃣ Redémarrer et Tester

```bash
# Terminal 1: Serveur
cd server
npm run dev

# Terminal 2: Client (nouveau terminal)
npm run dev
```

Aller sur: http://localhost:5173/register

**Remplir et soumettre le formulaire**

✅ Si succès → "Account created!" et redirect dashboard

❌ Si erreur → Vérifier les logs du serveur (Terminal 1)

---

## 🔧 Si Encore des Problèmes

### Comptes existants ne se connectent pas?
```bash
cd server
node seed/fixPasswordHashing.js
```

### Voir exactement l'erreur?
**Ouvrir Console Navigateur** (F12 → Console)
- Plus d'infos sur l'erreur exacte

**Regarder les Logs Terminal Serveur**
- Y a-t-il `❌ [REGISTER]` ou autre erreur?

---

## ❓ Common Issues

| Erreur | Cause | Solution |
|--------|-------|----------|
| `MONGO_URI undefined` | .env manquant/vide | Créer .env avec valeurs |
| `connect EREFUSED` | MongoDB pas accessible | Vérifier IP whitelist Atlas |
| `authentication failed` | Bad credentials | Vérifier username/password |
| `401 au login` | Comptes mal hachés | `node seed/fixPasswordHashing.js` |

---

## ✨ Résultat Attendu

Quand tout fonctionne:
1. ✅ Remplissez le formulaire
2. ✅ Cliquez "Create Account"
3. ✅ Voyez "Account created!" message
4. ✅ Redirigé au dashboard automatiquement
5. ✅ Pouvez vous reconnecter avec vos identifiants

---

**Ça doit prendre ~5 minutes total si MongoDB est bien configuré** ⚡
