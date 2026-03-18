# Guide de Déploiement : Fiskeo

Ce guide résume les étapes pour déployer le frontend sur **Vercel** et le backend sur **Alwaysdata**, tout en utilisant le domaine **fiskeo.fr**.

## 1. Frontend (Vercel)

### Configuration du projet
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Redirections** : Gérées par le fichier `vercel.json` à la racine.

### Variables d'environnement (Settings > Environment Variables)
- **`VITE_API_URL`** : `https://ibanmarlats.alwaysdata.net/api`

### Domaine (Settings > Domains)
Ajoutez `fiskeo.fr` et configurez les DNS chez votre fournisseur (IONOS) :
- **A Record** : `@` -> `216.198.79.1`
- **CNAME Record** : `www` -> `afcb448a631156fc.vercel-dns-017.com.`

---

## 2. Backend (Alwaysdata)

### Fichiers requis dans `www/server`
Assurez-vous d'avoir ces 4 éléments dans votre dossier backend :
1. `index.js` (le serveur)
2. `.env` (vos secrets)
3. **`package.json`** (indispensable pour les `import` ESM)
4. `database.sqlite` (votre base de données)

### Configuration du site
- **Commande** : `node index.js`
- **Répertoire** : `www/server`

### Variables d'environnement (Web sites > Sites > Environnement)
- **`FRONTEND_URL`** : `https://fiskeo.fr`
*(Cette variable est cruciale pour autoriser les appels CORS depuis le site Vercel).*

---

## 3. Mise à jour et Maintenance
À chaque fois que vous modifiez les variables d'environnement sur Vercel :
1. Allez dans l'onglet **Deployments**.
2. Cliquez sur les "..." du dernier déploiement.
3. Choisissez **Redeploy**.

À chaque fois que vous modifiez `FRONTEND_URL` sur Alwaysdata :
1. Cliquez sur le bouton **Restart** de votre site dans l'interface Alwaysdata.
