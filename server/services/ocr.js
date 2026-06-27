/**
 * services/ocr.js
 *
 * Gère la reconnaissance de texte (OCR) sur les images et PDFs
 * via Tesseract — outil open source de reconnaissance de caractères.
 * Retourne le texte extrait sous forme de string ou PDF avec texte.
 */

// On importe child_process pour appeler Tesseract en ligne de commande
const { exec } = require('child_process');

// On importe fs pour lire et supprimer les fichiers temporaires
const fs = require('fs');

// On importe path pour manipuler les chemins de fichiers
const path = require('path');

// ─────────────────────────────────────────────
// Extraire le texte d'une image via Tesseract
// inputPath = chemin vers l'image (JPG, PNG)
// lang = langue du texte (default: 'eng' anglais, 'fra' français)
// ─────────────────────────────────────────────
const extractTextFromImage = (inputPath, lang = 'eng') => {
    return new Promise((resolve, reject) => {

        // Chemin du fichier de sortie texte (sans extension — Tesseract l'ajoute)
        const outputBase = `/tmp/${Date.now()}-ocr-output`;

        // Commande Tesseract pour extraire le texte
        // -l = langue, txt = format de sortie texte
        const command = `tesseract "${inputPath}" "${outputBase}" -l ${lang} txt`;

        exec(command, (error) => {
            if (error) {
                return reject(new Error('OCR échoué — vérifiez que le fichier est une image lisible.'));
            }

            // Tesseract crée un fichier .txt avec le texte extrait
            const outputPath = `${outputBase}.txt`;
            const text = fs.readFileSync(outputPath, 'utf8');

            // On supprime le fichier temporaire
            fs.unlinkSync(outputPath);

            resolve(text);
        });
    });
};

// ─────────────────────────────────────────────
// Extraire le texte d'un PDF via Tesseract
// Le PDF est d'abord converti en images via pdftoppm
// puis chaque image est analysée par Tesseract
// inputPath = chemin vers le PDF
// lang = langue du texte
// ─────────────────────────────────────────────
const extractTextFromPDF = (inputPath, lang = 'eng') => {
    return new Promise((resolve, reject) => {

        // On convertit d'abord le PDF en images avec pdftoppm
        const outputPrefix = `/tmp/${Date.now()}-pdf-page`;
        const command = `pdftoppm -jpeg -r 150 "${inputPath}" "${outputPrefix}"`;

        exec(command, async (error) => {
            if (error) {
                return reject(new Error('Conversion PDF → images échouée.'));
            }

            // On liste toutes les images générées
            const files = fs.readdirSync('/tmp')
                .filter(f => f.startsWith(path.basename(outputPrefix)))
                .sort();

            if (files.length === 0) {
                return reject(new Error('Aucune page trouvée dans le PDF.'));
            }

            try {
                let fullText = '';

                // On applique l'OCR sur chaque page
                for (const file of files) {
                    const imagePath = `/tmp/${file}`;
                    const pageText = await extractTextFromImage(imagePath, lang);
                    fullText += `\n--- Page ${files.indexOf(file) + 1} ---\n${pageText}`;

                    // On supprime l'image temporaire après OCR
                    fs.unlinkSync(imagePath);
                }

                resolve(fullText);

            } catch (ocrError) {
                reject(ocrError);
            }
        });
    });
};

// On exporte les fonctions
module.exports = {
    extractTextFromImage,
    extractTextFromPDF,
};