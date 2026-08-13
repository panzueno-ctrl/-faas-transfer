# 🚧 Limitations Techniques (Serveur Gratuit)

Ce document liste les fonctionnalités de l'application qui sont actuellement limitées, ralenties ou bloquées à cause des contraintes physiques du serveur backend actuel (Render Free Tier : 512MB RAM, 0.1 vCPU). 

L'objectif est de garder une trace de ces limites pour **les débloquer immédiatement** lorsque le projet passera sur une infrastructure payante (serveur plus puissant).

---

## 1. Compression de gros PDF (Outil : Compresser PDF)
- **Le problème actuel :** Le moteur Ghostscript utilise l'algorithme de calcul `Bicubic` (haute qualité) pour réduire la taille des images dans le PDF. Pour des fichiers dépassant quelques Mo (comme votre fichier de test de 3MB qui échoue), le serveur gratuit met plus de 100 secondes à calculer. Render coupe automatiquement toute connexion qui dépasse 100 secondes, ce qui provoque une erreur.
- **La solution temporaire en place :** Nous avons gardé la compression en haute qualité (Bicubic), mais nous avons ajouté un `Timeout` strict de 60 secondes côté Front-end avec un message d'erreur clair pour l'utilisateur ("Le serveur gratuit met trop de temps..."). Ainsi, la fonctionnalité marche parfaitement pour les très petits PDF, mais échoue proprement sur les normaux/gros.
- **Ce qu'il faudra faire (Serveur Payant) :** 
  - Rien à coder ! Dès que le serveur aura un CPU normal (ex: 1 vCPU entier), la commande `Ghostscript` s'exécutera en quelques secondes même pour un PDF de 20 Mo. La limite disparaîtra d'elle-même.

## 2. Traitement d'images lourdes par Lots (À surveiller)
- **Le problème potentiel :** Si un utilisateur envoie 50 grosses images d'un coup (ex: Image to PDF), le serveur risque de saturer sa mémoire vive (RAM) de 512 Mo et de crasher.
- **Ce qu'il faudra faire (Serveur Payant) :** L'augmentation de la RAM sur un plan payant permettra de traiter des lots beaucoup plus volumineux.

## 3. Autres futurs outils lourds (OCR, Vidéo...)
- Si nous intégrons l'OCR (Reconnaissance de texte) ou la compression Vidéo (FFmpeg), ces processus nécessiteront absolument d'être exécutés sur un serveur payant (au moins 1 ou 2 vCPU dédiés) sous peine de subir les mêmes timeouts de 100 secondes.

---
*Ce fichier est à consulter avant chaque passage à l'échelle (Scale-up) de l'application.*
