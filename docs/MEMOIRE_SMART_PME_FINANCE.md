# SMART PME FINANCE
## Conception et réalisation d'une plateforme intégrée de gestion commerciale et financière des PME avec détection intelligente des anomalies et supervision à distance

**Document Technique & Académique d'Appui au Mémoire de Licence (Bac 3 en Informatique)**

---

## 1. INTRODUCTION ET CONTEXTE

### 1.1. Contexte économique et technologique en RDC
En République démocratique du Congo (RDC), les petites et moyennes entreprises (PME) représentent plus de 80% du tissu économique national et constituent le principal moteur de création d'emplois. Cependant, la grande majorité de ces structures évolue dans des conditions opérationnelles complexes :
- **Multi-devises omniprésente :** Coexistence permanente du Franc Congolais (CDF) et du Dollar Américain (USD), avec des variations fréquentes du taux de change officiel (Banque Centrale du Congo) et parallèle.
- **Gestion manuelle ou fragmentée :** Recours massif aux registres physiques, carnets de reçus papier ou classeurs Excel vulnérables aux erreurs humaines, aux pertes de données et aux altérations frauduleuses.
- **Risques de coulage financier :** Les écarts de caisse, les remises non autorisées accordées par les vendeurs et les dépenses non justifiées pèsent lourdement sur la rentabilité des PME.
- **Absence de supervision à distance :** Les propriétaires et dirigeants de PME sont souvent contraints d'être physiquement présents sur site pour vérifier les recettes et les niveaux de stock.

### 1.2. Problématique
Comment concevoir et déployer une plateforme logicielle intégrée, multi-plateforme (Web et Windows Desktop), capable de centraliser les opérations commerciales et financières d'une PME congolaise, tout en assurant l'isolation stricte des données multi-entreprises, la supervision à distance en temps réel et la détection intelligente et explicable des anomalies de gestion ?

### 1.3. Objectifs du projet
- **Objectif Général :** Développer une plateforme intégrée (API NestJS, base PostgreSQL, frontend React/Vite et client Desktop Electron) offrant un contrôle commercial et financier total, avec un moteur de détection d'anomalies.
- **Objectifs Spécifiques :**
  1. Implémenter une gestion commerciale complète : produits, services, stocks traçables, clients, fournisseurs et ventes au comptoir (POS).
  2. Fournir un module de facturation et de paiements conforme aux règles fiscales (TVA 16%, NIF, RCCM, ID NAT).
  3. Gérer rigoureusement la trésorerie : ouvertures/clôtures de caisses avec calcul d'écarts théoriques vs physiques, comptes bancaires (Rawbank, EquityBCDC) et Mobile Money (M-Pesa, Airtel Money).
  4. Concevoir un moteur explicable de détection d'anomalies (remises suspectes, ruptures de stocks, écarts de caisse, doubles paiements).
  5. Offrir un tableau de bord exécutif de supervision à distance avec calcul d'indicateurs fiables (marge nette, créances clients, dettes fournisseurs).

---

## 2. ÉTUDE DES BESOINS ET SPÉCIFICATIONS

### 2.1. Acteurs du système et Matrice RBAC (Role-Based Access Control)
| Rôle | Description & Droits d'Accès |
|---|---|
| **SUPER_ADMIN** | Administration globale de la plateforme, maintenance technique, audit système. |
| **ORG_OWNER** | Propriétaire de la PME : accès total aux finances, paramètres, supervision et alertes. |
| **MANAGER** | Gérant d'exploitation : supervision des stocks, validation des dépenses et des ventes. |
| **ACCOUNTANT** | Comptable : facturation, validation des écritures, créances/dettes, rapprochements. |
| **CASHIER** | Caissier : encaissements au comptoir (POS), ouverture et comptage de clôture de caisse. |
| **INVENTORY_MANAGER**| Gestionnaire de stock : réceptions, inventaires, alertes de réapprovisionnement. |
| **AUDITOR** | Auditeur : consultation en lecture seule des journaux d'audit et détection d'anomalies. |

### 2.2. Exigences fonctionnelles
- **Authentification & Sécurité :** Sessions JWT, mots de passe salés/hachés (SHA-256/Bcrypt), contrôle strict de l'appartenance à l'entreprise (`organizationId`).
- **Isolation Multi-Entreprises :** Cloisonnement total des données en base relationnelle PostgreSQL.
- **Gestion Multi-Devises :** Paramétrage de la devise de référence (CDF/USD), historisation des taux de change et recalcul dynamique.
- **Transactions Atomiques (ACID) :** Une vente décrémente simultanément le stock physique, génère la ligne de mouvement traçable et crée la facture correspondante.
- **Clôture de Caisse avec Détection d'Écart :** Comparaison automatique du solde physique saisi avec le solde théorique (`Fond initial + Encaissements espèces`).

---

## 3. ARCHITECTURE LOGICIELLE ET CHOIX TECHNIQUES

```text
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Application Web (React)     │       │   Application Desktop (Windows) │
│     Vite + TypeScript + CSS     │       │    Electron + Preload Bridge    │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └───────────────────┬─────────────────────┘
                                     │ HTTPS / REST API /api/v1
                                     ▼
                   ┌──────────────────────────────────┐
                   │       API Centrale NestJS        │
                   │  - Authentication & Guards RBAC  │
                   │  - Commercial & Stock Services   │
                   │  - Financial & Invoicing Engine  │
                   │  - Intelligent Anomaly Scanner   │
                   │  - Swagger OpenAPI Documentation │
                   └─────────────────┬────────────────┘
                                     │ Prisma ORM
                                     ▼
                   ┌──────────────────────────────────┐
                   │    PostgreSQL Database (v17)     │
                   │   Isolation stricte multi-PME    │
                   └──────────────────────────────────┘
```

---

## 4. MODÈLE CONCEPTUEL ET RELATIONNEL DES DONNÉES

Le schéma relationnel est modélisé sous Prisma ORM avec clés primaires UUID, index optimisés et clés étrangères en cascade :

1. **`organizations`** : Identité juridique de l'entreprise (NIF, RCCM, ID NAT, adresse, logo).
2. **`organization_settings`** : Devises (CDF/USD), taux de change, taux TVA (16%), seuils d'alerte.
3. **`users`** : Comptes collaborateurs avec rôle RBAC.
4. **`products`** & **`warehouse_stocks`** : Catalogue, prix d'achat, prix de vente, unités et stocks.
5. **`customers`** & **`suppliers`** : Tiers avec suivi du solde restant dû (créances/dettes).
6. **`sales`** & **`sale_items`** : Ventes au comptoir avec calcul automatique des totaux.
7. **`invoices`** & **`invoice_items`** : Factures commerciales avec statut (`ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
8. **`payments`** : Règlements rattachés aux factures et aux sessions de caisse.
9. **`cash_sessions`** : Sessions d'encaissement avec suivi du solde théorique vs compté.
10. **`expenses`** : Dépenses de fonctionnement avec affectation aux comptes financiers.
11. **`anomaly_alerts`** : Alertes générées par le moteur intelligent avec suivi de résolution.
12. **`audit_logs`** : Journal d'audit traçant les opérations sensibles.

---

## 5. MOTEUR DE DÉTECTION INTELLIGENTE DES ANOMALIES

Le moteur d'inspection repose sur un ensemble de règles métier déterministes et explicables (Explainable AI) :

1. **Règle STOCK_CRITIQUE & STOCK_NEGATIF :**
   - *Condition :* `currentStock <= minStockLevel` ou `currentStock < 0`.
   - *Gravité :* `CRITICAL` ou `HIGH`.
   - *Impact :* Empêche les ruptures invisibles ou les ventes d'articles non disponibles.

2. **Règle REMISE_ANORMALE (HIGH_DISCOUNT) :**
   - *Condition :* `discountPercent > alertMaxDiscountPercent` (par défaut 15%).
   - *Gravité :* `MEDIUM`.
   - *Impact :* Alerte la direction sur les remises excessives accordées par les vendeurs.

3. **Règle ÉCART_DE_CAISSE (CASH_DISCREPANCY) :**
   - *Condition :* `|countedBalance - theoreticalBalance| > alertCashDiscrepancyThreshold`.
   - *Gravité :* `HIGH` ou `CRITICAL`.
   - *Impact :* Détecte immédiatement les manques à gagner ou les erreurs de rendu de monnaie lors de la clôture de caisse.

4. **Règle DÉPENSE_EXCEPTIONNELLE (ABNORMAL_EXPENSE) :**
   - *Condition :* `amount >= alertLargeExpenseThreshold` (par défaut 2,000,000 CDF).
   - *Gravité :* `HIGH`.
   - *Impact :* Soumet les décaissements majeurs à vérification par le gérant ou propriétaire.

5. **Règle FACTURES_IMPAYÉES_RETARD (OVERDUE_INVOICES) :**
   - *Condition :* `dueDate < NOW()` et `balance > 0`.
   - *Gravité :* Proportionnelle au nombre de jours d'arriéré.
   - *Impact :* Prévient l'accumulation des créances douteuses.

---

## 6. GUIDE D'INSTALLATION ET DÉMARRAGE RAPIDE

### 6.1. Prérequis
- Système d'exploitation : Windows 10/11 ou Linux.
- Node.js version 20+ ou 24+.
- PostgreSQL 16+ ou 17+ (service actif sur port 5432).

### 6.2. Procédure d'installation
```bash
# 1. Cloner ou ouvrir le dossier du projet
cd "smart-pme-finance"

# 2. Configurer le fichier .env
# Vérifier la chaîne DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_pme_finance?schema=public"

# 3. Installer les dépendances
npm install

# 4. Déployer le schéma dans PostgreSQL
npm run prisma:push

# 5. Peupler avec les données de démonstration de la RDC
npm run prisma:seed

# 6. Démarrer l'API NestJS
npm run dev:api

# 7. Démarrer l'application Web React
npm run dev:web
```

### 6.3. Identifiants par défaut
| Rôle | Email | Mot de passe |
|---|---|---|
| **Administrateur / Propriétaire** | `admin@smartpme.cd` | `Admin@2026!` |
| **Gérant / Manager** | `manager@smartpme.cd` | `Manager@2026!` |
| **Comptable** | `comptable@smartpme.cd` | `Comptable@2026!` |
| **Caissier** | `caissier@smartpme.cd` | `Caissier@2026!` |

---

## 7. RÉSULTATS OBTENUS ET PERSPECTIVES

### 7.1. Fonctionnalités pleinement opérationnelles
- Connexion sécurisée JWT avec switch de profil instantané.
- Gestion multi-devises (CDF/USD) avec conversion en temps réel.
- Vente en caisse (POS) avec décrémentation immédiate des stocks et génération de facture.
- Facturation professionnelle avec visualiseur imprimable conforme aux mentions légales congolaises (NIF, RCCM, TVA 16%).
- Suivi de trésorerie avec clôture de caisse et calcul d'écart.
- Détection des anomalies en temps réel avec moteur d'inspection et régularisation signée.

### 7.2. Perspectives d'amélioration pour le mémoire
- Intégration directe des API Webhooks Mobile Money (Vodacom M-Pesa Open API, Airtel Money Partner Gateway) en environnement de production avec agrément officiel.
- Ajout d'un modèle statistique de prévision de trésorerie par régression linéaire sur l'historique des encaissements.
- Synchronisation hors-ligne P2P pour les succursales provinciales disposant d'une connectivité Internet intermittente.
