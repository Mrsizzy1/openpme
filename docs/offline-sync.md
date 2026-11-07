# Synchronisation hors-ligne

## File locale

L’application web (y compris le client PyQt6 qui l’intègre dans QtWebEngine) conserve les opérations dans IndexedDB. Le contenu métier est chiffré avec AES-GCM; la clé non exportable est stockée dans l’object store `meta` du même IndexedDB. Les identifiants UUID sont générés avant le premier envoi (y compris en ligne), puis restent les mêmes dans la file et pendant toutes les tentatives.

Le desktop sert le build Web embarqué sur une origine loopback stable (`http://localhost:5173`) et conserve un profil QtWebEngine persistant dans `%LOCALAPPDATA%\SmartPME\web-profile`. Il n’a donc pas besoin d’un serveur Web distant pour afficher l’interface après un démarrage à froid. Une page de secours explique comment réessayer si les ressources locales sont absentes.

Après chargement réussi depuis l’API, le poste desktop met en cache dans IndexedDB chiffré le catalogue produits, les clients, les sessions de caisse et l’historique récent. Au démarrage hors ligne, l’application peut réutiliser le profil utilisateur précédemment enregistré et ces données. Le bandeau indique la date du catalogue; les disponibilités de stock peuvent être dépassées et sont revérifiées par l’API à la synchronisation. Les ventes espèces restent dans la file si l’API est indisponible. Un nouveau poste sans profil ni données préparées ne peut pas vendre hors ligne. Le verrouillage et la période de grâce du terminal continuent à s’appliquer.

Les anciennes files `smart_pme_offline_sales_queue` et `SMART_PME_OFFLINE_SALES_QUEUE` sont migrées vers IndexedDB. Elles ne sont supprimées qu’après validation de la transaction locale. Les ventes déjà marquées synchronisées restent historiques et ne sont pas rejouées; les ventes incomplètes ou ayant échoué passent dans « À vérifier ».

## Rejeu et conflits

- **Stock :** les entrées et sorties sont des deltas signés, jamais une valeur absolue de stock. Le serveur verrouille le produit, applique le delta au stock courant, refuse un stock négatif et enregistre le mouvement dans la même transaction. Deux postes peuvent donc synchroniser leurs mouvements sans écraser leurs quantités. La même clé d’idempotence ne crée pas un second mouvement.
- **Ventes, règlements et dépenses :** chaque écriture créée hors-ligne porte une clé unique par entreprise. Le serveur la conserve avec l’écriture; un rejeu renvoie l’écriture déjà créée sans répéter ses effets comptables.
- **Données simples (modification d’un produit) :** les changements mettent des champs à jour, pas des deltas; le dernier changement accepté par le serveur remplace les valeurs précédentes. Réappliquer le même changement est sans effet supplémentaire.
- **Échecs réseau, HTTP 408/429 et 5xx :** l’opération reste dans la file et le délai entre tentatives augmente progressivement, jusqu’à cinq minutes. Le retour du réseau relance immédiatement la file.
- **Autres erreurs HTTP :** l’opération et son contenu chiffré restent conservés dans « Opérations à vérifier ». Le gérant peut la réessayer ou l’archiver explicitement; l’archive et le journal des conflits restent consultables.

Les paiements et dépenses hors-ligne ne sont acceptés qu’en espèces et avec une session de caisse connue. Un paiement bancaire ou Mobile Money ne peut pas être réputé encaissé sans confirmation du fournisseur. Une modification de stock refusée à la synchronisation (par exemple, stock devenu insuffisant) demande une vérification manuelle.

## Paiements Mobile Money

Aucun opérateur Mobile Money n’est actuellement intégré. Les demandes, vérifications de statut et confirmations Mobile Money échouent volontairement avec HTTP 503; aucun paiement Mobile Money ne peut être comptabilisé par ce parcours. Les ventes réglées par un moyen non vérifiable doivent être enregistrées à crédit, puis le règlement ne doit être comptabilisé qu’après vérification effective. Ne pas traiter une référence saisie manuellement comme une preuve de paiement.

## Client desktop PyQt6

Le desktop est un conteneur QtWebEngine, pas un second client de gestion. Son contrôle de santé vérifie l’API et son heartbeat surveille l’autorisation/verrouillage du terminal; aucun des deux ne suit ni ne stocke les opérations commerciales. La file IndexedDB et son indicateur sont ceux de l’application web intégrée. L’état API et celui de la supervision à distance sont explicitement présentés comme distincts de la synchronisation métier.

## Limites de sécurité

Le chiffrement protège les données au repos contre une lecture directe des enregistrements IndexedDB, mais une compromission du profil ou du code exécuté dans la même origine peut accéder à la clé non exportable et aux opérations déchiffrées. Il ne remplace ni la protection du poste ni l’authentification de l’API.
