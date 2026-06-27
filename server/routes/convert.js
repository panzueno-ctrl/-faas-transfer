/**
 * routes/convert.js
 *
 * Gère la conversion de fichiers vers PDF.
 * Le client envoie un fichier Word (.docx, .doc)
 * → LibreOffice le convertit en PDF côté serveur
 * → on retourne le PDF au client.
 * Support .pages et .key prévu en V2.
 */

// On importe Express pour créer le router
const express = require('express');

// On importe multer pour recevoir le fichier
const multer = require('multer');

// On importe path pour manipuler les chemins de fichiers
const path = require('path');

// On importe fs pour lire et supprimer les fichiers temporaires
const fs = require('fs');

// On importe child_process pour appeler LibreOffice
// exec permet d'exécuter une commande shell depuis Node.js
const { exec } = require('child_process');

// On crée le router
const router = express.Router();

// On configure multer pour stocker le fichier temporairement sur le disque
// On ne peut pas utiliser memoryStorage ici car LibreOffice
// a besoin d'un vrai fichier sur le disque pour le convertir
const storage = multer.diskStorage({

    // Dossier temporaire pour stocker les fichiers avant conversion
    destination: (req, file, cb) => {
        cb(null, '/tmp');
    },

    // On garde le nom original du fichier
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// POST /convert
// Reçoit un fichier Word, le convertit en PDF, retourne le PDF
router.post('/', upload.single('file'), (req, res) => {

    // On vérifie qu'un fichier a bien été envoyé
    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    // Chemin du fichier uploadé
    const inputPath = req.file.path;

    // Dossier où LibreOffice va mettre le PDF converti
    const outputDir = '/tmp';

    // Commande LibreOffice pour convertir en PDF
    // --headless = sans interface graphique
    // --convert-to pdf = format de sortie
    // --outdir = dossier de sortie
    const command = `libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    // On exécute la commande LibreOffice
    exec(command, (error, stdout, stderr) => {

        // Si la conversion échoue
        if (error) {
            console.log('Erreur conversion:', error);
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        // Chemin du PDF généré par LibreOffice
        // LibreOffice remplace l'extension par .pdf automatiquement
        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        // On envoie le PDF au client
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        // On lit le PDF et on l'envoie
        const pdfBuffer = fs.readFileSync(pdfPath);
        res.send(pdfBuffer);

        // On supprime les fichiers temporaires après envoi
        fs.unlinkSync(inputPath);
        fs.unlinkSync(pdfPath);

    });

});

// On exporte le router
module.exports = router;