# Smart PME Finance

Plateforme de gestion commerciale et financière des PME en RDC : ventes, facturation, stocks, trésorerie, supervision et détection d'anomalies.

## Architecture

- **API** : NestJS 11, TypeScript, Prisma, PostgreSQL, JWT, Swagger et contrôle RBAC.
- **Web** : React 18, TypeScript, Vite et `@smart-pme/shared`.
- **Desktop Windows** : client natif Python/PyQt6 + QtWebEngine qui affiche l'application web. Le dépôt ne contient pas d'application Electron.
- **Monorepo** : packages npm workspaces.

## Démarrage local

### 1. Configurer l'environnement

Copiez `.env.example` vers `.env`, configurez PostgreSQL et définissez un secret JWT aléatoire d'au moins 32 caractères. Ne partagez jamais `.env`.

Sous PowerShell :

```powershell
Copy-Item .env.example .env
$secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
(Get-Content .env) -replace '^JWT_SECRET=.*$', "JWT_SECRET=$secret" | Set-Content .env
```

Le compte PostgreSQL et la base indiqués par `DATABASE_URL` doivent déjà exister. Pour Docker Compose, renseignez aussi les variables `POSTGRES_*` et utilisez un secret JWT différent.

### 2. Installer et initialiser

```powershell
npm ci
npm run build:shared
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Le seed contient des comptes de démonstration **réservés au développement local**; il refuse l'environnement production. Les mots de passe sont générés aléatoirement et affichés dans le terminal au moment du seed. Aucun mot de passe de démonstration n'est publié dans la documentation.

Pour une base existante déjà créée avant l'ajout des migrations, sauvegardez-la, marquez le baseline déjà présent comme appliqué (`npx prisma migrate resolve --applied 20261029000000_init`), puis lancez `npm run prisma:migrate` pour appliquer la migration de suivi de session. Ne marquez le baseline qu'après avoir vérifié que la base correspond au schéma existant.

### 3. Démarrer les services

Dans des terminaux distincts :

```powershell
npm run dev:api
npm run dev:web
```

- Web : <http://localhost:5173>
- API : <http://localhost:3001/api/v1>
- Swagger : <http://localhost:3001/api/docs>

Le client desktop Windows est lancé avec `npm run dev:desktop` ou `LANCER_DESKTOP.bat`. Il nécessite Python et les dépendances PyQt6/QtWebEngine.

## Authentification et sessions

Les mots de passe sont hachés avec bcrypt; les anciens hachages de développement sont mis à niveau au prochain login réussi. Les jetons d'accès expirent après 15 minutes et restent en mémoire côté web. Un jeton de renouvellement rotatif est placé dans un cookie HttpOnly et la session est suivie côté serveur. Les managers voient l'état « en ligne » et le nombre de sessions actives dans la gestion d'équipe.

Les comptes propriétaire et super-admin sont protégés. Un mot de passe existant n'est jamais consultable; un manager peut générer un mot de passe temporaire aléatoire affiché une seule fois.

## Validation

```powershell
npm run build:shared
npm run build:api
npm run build:web
npm test
```

## Documentation académique

Le mémoire se trouve dans [`docs/MEMOIRE_SMART_PME_FINANCE.md`](docs/MEMOIRE_SMART_PME_FINANCE.md).
