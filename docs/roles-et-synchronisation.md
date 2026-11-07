# Rôles et synchronisation en temps réel

## Matrice des droits

L'administrateur (`SUPER_ADMIN`, `ORG_OWNER`) et le gérant (`MANAGER`) voient et font tout.
Les autres rôles ne voient que ce qui concerne leur poste.

| Rôle | Accès |
| --- | --- |
| Caissier (`CASHIER`) | Caisse et **ses propres ventes**, **sa** session de caisse (ouverture, clôture à l'aveugle), clients en lecture et en création, encaissement des factures. Pas de dépenses, de comptes, ni de modification des clients. |
| Commercial (`SALES_REP`) | Ventes (**les siennes uniquement**) et clients (lecture, création, modification). |
| Comptable (`ACCOUNTANT`) | Tableau de bord, factures (création, annulation, règlements), finances (dépenses, comptes, caisse), clients, fournisseurs, produits en lecture. |
| Gestionnaire de stock (`INVENTORY_MANAGER`) | Produits et stock (création, mouvements), fournisseurs (lecture, modification). |
| Acheteur (`PURCHASER`) | Fournisseurs (lecture, création, modification). |
| Auditeur (`AUDITOR`) | **Tout en lecture seule** : ventes, factures, règlements, finances, clients, fournisseurs, produits, utilisateurs, alertes. Aucune modification. |

La sécurité est appliquée **par l'API** (`apps/api/src/common/security/role-groups.ts`).
L'interface (`apps/web/src/role-permissions.ts`) masque seulement ce que le rôle ne peut pas faire ;
les deux fichiers doivent rester alignés. Le test `apps/api/test/rbac-realtime.spec.ts` verrouille la matrice.

## Synchronisation en temps réel entre postes

1. Après chaque modification réussie (vente, règlement, mouvement de stock, dépense, caisse, client,
   fournisseur, facture, alerte, paramètres, utilisateurs, postes), l'API publie un événement
   à tous les postes connectés **de la même entreprise**.
2. Chaque poste reçoit le signal par un flux Server-Sent Events (`GET /api/v1/events/stream`,
   authentifié par le jeton de session) et recharge l'écran concerné **avec ses propres droits**.
   L'événement ne contient aucune donnée métier : rien ne fuit d'un rôle à l'autre.
3. Le poste à l'origine de la modification ignore son propre écho (en-tête `X-Client-Instance`).
4. En cas de coupure, le poste se reconnecte automatiquement (1 s, puis jusqu'à 30 s d'attente).
   Le flux est renouvelé toutes les 15 minutes pour revérifier la session.

La synchronisation hors ligne existante (file d'attente des ventes, règlements et dépenses saisis
sans réseau) reste en place : ces opérations sont envoyées au retour du réseau, puis diffusées
aux autres postes comme toute autre modification.

### Limites connues

- Le bus d'événements est en mémoire : une seule instance de l'API. Pour plusieurs instances,
  relayer les événements par un bus partagé (Redis pub/sub par exemple).
- Derrière nginx, le chemin `/api/v1/events/` est servi sans mise en mémoire tampon (voir `apps/web/nginx.conf`).
