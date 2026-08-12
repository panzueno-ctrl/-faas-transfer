# Règles du projet FaaS Transfer

<RULE[project_reports]>
- À partir de maintenant, tous les rapports, résumés, plans ou comptes-rendus d'exécution (comme les "walkthrough") DOIVENT obligatoirement être ajoutés ou mis à jour dans le fichier `architecture.txt` (ou `architecture_schemas.md` si approprié) à la racine du projet.
- Interdiction de créer des fichiers séparés (comme `walkthrough.md`, `implementation_plan.md` ou autres fichiers markdown volants) pour résumer le travail. Tout l'historique et les rapports doivent être centralisés dans les fichiers d'architecture existants.
</RULE[project_reports]>

<RULE[ui_ux_excellence]>
- Utilise toujours ton expertise de Designer UI/UX pour vérifier au pixel près les espacements, les alignements, la posture des textes et t'assurer que le rendu est premium sur mobile.
</RULE[ui_ux_excellence]>

<RULE[architecture_detailed_notes]>
- Le fichier d'architecture (`architecture.txt` ou `architecture_schemas.md`) est le cahier de bord CHRONOLOGIQUE et ÉVOLUTIF absolu du projet.
- **RÈGLE D'HISTORIQUE INTÉGRAL (APPEND-ONLY) :** Tu ne dois JAMAIS effacer, écraser ou résumer l'ancien contenu. Chaque nouvelle action doit être **ajoutée à la suite** (à la fin du fichier). 
- Le document doit contenir TOUTE l'évolution du projet, même les erreurs. Si on a fait "1", on écrit qu'on a fait "1". Si plus tard on efface "1" pour faire "2", on n'efface pas la note sur "1", on écrit une nouvelle entrée : "On a effacé 1 pour faire 2".
- L'objectif est que ce fichier atteigne 2000 ou 5000 pages s'il le faut. Il doit permettre de retracer chaque décision, chaque tentative et chaque ligne de code modifiée depuis la création du projet.
- **RÈGLE STRICTE ET SYSTÉMATIQUE :** À chaque fois que tu travailles sur le projet, PEU IMPORTE LE SUJET (petit ajustement, correction mineure, ou grosse refonte), tu DOIS OBLIGATOIREMENT ajouter une nouvelle entrée détaillée et brute à la fin de `architecture.txt`.
- Ne manque JAMAIS à cette règle, c'est une exigence fondamentale pour permettre à l'utilisateur de suivre l'historique complet.
</RULE[architecture_detailed_notes]>
