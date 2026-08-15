# Règles du projet FaaS Transfer

<RULE[project_reports]>
- À partir de maintenant, tous les rapports, résumés, plans ou comptes-rendus d'exécution (comme les "walkthrough") DOIVENT obligatoirement être ajoutés ou mis à jour dans le fichier `architecture.txt` (ou `architecture_schemas.md` si approprié) à la racine du projet.
- Chaque fois que vous créez ou mettez à jour des petits fichiers comme `walkthrough.md` ou `implementation_plan.md`, vous devez AUTOMATIQUEMENT et IMMÉDIATEMENT inclure tout leur contenu ou toutes les explications liées (défis, détails) dans le fichier `architecture.txt`.
- Tout l'historique et les rapports doivent être centralisés.
</RULE[project_reports]>

<RULE[ui_ux_excellence]>
- Utilise toujours ton expertise de Designer UI/UX pour vérifier au pixel près les espacements, les alignements, la posture des textes et t'assurer que le rendu est premium sur mobile.
</RULE[ui_ux_excellence]>

<RULE[architecture_detailed_notes]>
- Le fichier d'architecture (`architecture.txt` ou `architecture_schemas.md`) est le cahier de bord CHRONOLOGIQUE et ÉVOLUTIF absolu du projet.
- **RÈGLE D'HISTORIQUE INTÉGRAL (APPEND-ONLY) :** Tu ne dois JAMAIS effacer, écraser ou résumer l'ancien contenu. Chaque nouvelle action doit être **ajoutée à la suite** (à la fin du fichier). 
- Le document doit contenir TOUTE l'évolution du projet, même les erreurs. Si on a fait "1", on écrit qu'on a fait "1". Si plus tard on efface "1" pour faire "2", on n'efface pas la note sur "1", on écrit une nouvelle entrée : "On a effacé 1 pour faire 2".
- L'objectif est que ce fichier atteigne 2000 ou 5000 pages s'il le faut. Il doit permettre de retracer chaque décision, chaque tentative et chaque ligne de code modifiée depuis la création du projet.
- **RÈGLE DE DATATION PRÉCISE :** Pour garantir la traçabilité absolue, CHAQUE NOUVELLE ENTRÉE DOIT ÊTRE DATÉE avec le Jour, la Date, l'Heure, la Minute, la Seconde et le Mois. (ex: "Samedi, 15 Août 2026 à 23h45 et 30 secondes"). Ne fais jamais d'entrée sans ce niveau de précision.
- **RÈGLE STRICTE ET SYSTÉMATIQUE :** À chaque fois que tu travailles sur le projet, PEU IMPORTE LE SUJET (petit ajustement, correction mineure, ou grosse refonte, création de plan ou walkthrough), tu DOIS OBLIGATOIREMENT ajouter une nouvelle entrée détaillée et brute à la fin de `architecture.txt` en y expliquant tous les défis et détails.
- Ne manque JAMAIS à cette règle, c'est une exigence fondamentale pour permettre à l'utilisateur de suivre l'historique complet.
</RULE[architecture_detailed_notes]>

<RULE[no_floating_plans]>
- INTERDICTION FORMELLE DE LAISSER DES "FICHIERS VOLANTS" : Chaque fois qu'un document de type `implementation_plan.md` ou `walkthrough.md` est généré, son contenu entier doit être systématiquement copié/écrit dans `architecture.txt` sous une nouvelle entrée datée.
- Tout doit être dans `architecture.txt`. C'est l'ordre absolu.
</RULE[no_floating_plans]>
