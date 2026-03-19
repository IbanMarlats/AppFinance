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

### Fichiers et dossiers requis dans `www/server`
Vous devez copier l'intégralité du dossier `server/` dans `www/server/` sur Alwaysdata. Cela inclut :
1. **Les fichiers racine** : `index.js`, `.env`, `package.json`, `database.sqlite`.
2. **Tous les sous-dossiers** : `routes/`, `utils/`, `middleware/`, `services/`, `cron/`, `uploads/`.

### Méthode de transfert
- **FTP / SFTP** : C'est la méthode la plus simple pour transférer tous les dossiers d'un coup. (Vos identifiants sont dans le mail de bienvenue d'Alwaysdata ou dans la section **FTP**).
- **SSH** : Pour les utilisateurs avancés, vous pouvez utiliser `scp` ou `git`.

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
