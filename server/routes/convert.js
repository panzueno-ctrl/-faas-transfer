/**
 * routes/convert.js
 *
 * Gère toutes les conversions de fichiers.
 * Chaque endpoint correspond à un type de conversion spécifique.
 * Les conversions utilisent LibreOffice, poppler-utils et ImageMagick
 * installés sur le serveur.
 *
 * Endpoints disponibles :
 * POST /convert/word-to-pdf    → Word (.docx/.doc) → PDF
 * POST /convert/pdf-to-image   → PDF → JPG ou PNG (toutes les pages)
 * POST /convert/image-to-pdf   → JPG / PNG → PDF
 * POST /convert/pdf-to-pptx    → PDF → PowerPoint
 */

// On importe Express pour créer le router
const express = require('express');

// On importe multer pour recevoir les fichiers
const multer = require('multer');

// On importe path pour manipuler les chemins de fichiers
const path = require('path');

// On importe fs pour lire et supprimer les fichiers temporaires
const fs = require('fs');

// On importe child_process pour appeler les outils système
const { exec } = require('child_process');

// On importe les services pdf-lib et ocr
const { mergePDFs, splitPDF, extractPages, deletePages, rotatePages, addWatermark, numberPages, protectPDF } = require('../services/pdfLib');
const { extractTextFromImage, extractTextFromPDF } = require('../services/ocr');

// On crée le router
const router = express.Router();

// On configure multer pour stocker les fichiers temporairement sur le disque
// LibreOffice, poppler et ImageMagick ont besoin de vrais fichiers sur le disque
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// ─────────────────────────────────────────────
// POST /convert/word-to-pdf
// Convertit un fichier Word (.docx/.doc) en PDF via LibreOffice
// ─────────────────────────────────────────────
router.post('/word-to-pdf', upload.single('file'), (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    const inputPath = req.file.path;
    const outputDir = '/tmp';

    // Commande LibreOffice pour convertir en PDF
    const command = `libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        // LibreOffice génère le PDF avec le même nom mais extension .pdf
        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        // On envoie le PDF au client
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(fs.readFileSync(pdfPath));

        // On supprime les fichiers temporaires
        fs.unlinkSync(inputPath);
        fs.unlinkSync(pdfPath);
    });

});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-image
// Convertit un PDF en images JPG ou PNG via poppler-utils (pdftoppm)
// Chaque page du PDF devient une image séparée
// On retourne un fichier ZIP contenant toutes les images
// ─────────────────────────────────────────────
router.post('/pdf-to-image', upload.single('file'), (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    // Format demandé par l'utilisateur — jpg par défaut
    const format = req.query.format === 'png' ? 'png' : 'jpeg';
    const inputPath = req.file.path;

    // Préfixe pour les fichiers de sortie — pdftoppm ajoute -1, -2, -3...
    const outputPrefix = `/tmp/${Date.now()}-page`;

    // Commande pdftoppm pour convertir toutes les pages en images
    // -r 150 = résolution 150 DPI (bon équilibre qualité/taille)
    const command = `pdftoppm -${format === 'jpeg' ? 'jpeg' : 'png'} -r 150 "${inputPath}" "${outputPrefix}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        // On liste toutes les images générées par pdftoppm
        const files = fs.readdirSync('/tmp').filter(f => f.startsWith(path.basename(outputPrefix)));

        if (files.length === 0) {
            return res.status(500).json({ message: 'Aucune image générée.' });
        }

        // Si une seule page → on retourne directement l'image
        if (files.length === 1) {
            const imagePath = `/tmp/${files[0]}`;
            res.setHeader('Content-Disposition', `attachment; filename="page-1.${format === 'jpeg' ? 'jpg' : 'png'}"`);
            res.setHeader('Content-Type', `image/${format}`);
            res.send(fs.readFileSync(imagePath));
            fs.unlinkSync(inputPath);
            fs.unlinkSync(imagePath);
            return;
        }

        // Si plusieurs pages → on crée un ZIP avec toutes les images
        const zipPath = `/tmp/${Date.now()}-images.zip`;
        const fileList = files.map(f => `/tmp/${f}`).join(' ');
        exec(`zip ${zipPath} ${fileList}`, (zipError) => {
            if (zipError) {
                return res.status(500).json({ message: 'Erreur lors de la création du ZIP.' });
            }

            res.setHeader('Content-Disposition', 'attachment; filename="images.zip"');
            res.setHeader('Content-Type', 'application/zip');
            res.send(fs.readFileSync(zipPath));

            // On supprime tous les fichiers temporaires
            fs.unlinkSync(inputPath);
            fs.unlinkSync(zipPath);
            files.forEach(f => fs.unlinkSync(`/tmp/${f}`));
        });
    });

});

// ─────────────────────────────────────────────
// POST /convert/image-to-pdf
// Convertit une image JPG ou PNG en PDF via ImageMagick
// ─────────────────────────────────────────────
router.post('/image-to-pdf', upload.single('file'), (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    const inputPath = req.file.path;
    const pdfPath = `/tmp/${Date.now()}-output.pdf`;

    // Commande ImageMagick pour convertir l'image en PDF
    const command = `convert "${inputPath}" "${pdfPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        res.setHeader('Content-Disposition', 'attachment; filename="image-converti.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(fs.readFileSync(pdfPath));

        // On supprime les fichiers temporaires
        fs.unlinkSync(inputPath);
        fs.unlinkSync(pdfPath);
    });

});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-pptx
// Fonctionnalité bientôt disponible
// ─────────────────────────────────────────────
router.post('/pdf-to-pptx', upload.single('file'), (req, res) => {
    return res.status(503).json({
        message: 'La conversion PDF → PowerPoint sera bientôt disponible.'
    });
});

// ─────────────────────────────────────────────
// POST /convert/pptx-to-pdf
// Convertit un fichier PowerPoint (.pptx/.ppt) en PDF via LibreOffice
// ─────────────────────────────────────────────
router.post('/pptx-to-pdf', upload.single('file'), (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    const inputPath = req.file.path;
    const outputDir = '/tmp';

    // Commande LibreOffice pour convertir PowerPoint en PDF
    const command = `libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(fs.readFileSync(pdfPath));

        // On supprime les fichiers temporaires
        fs.unlinkSync(inputPath);
        fs.unlinkSync(pdfPath);
    });

});

// ─────────────────────────────────────────────
// POST /convert/excel-to-pdf
// Convertit un fichier Excel en PDF via LibreOffice
// ─────────────────────────────────────────────
router.post('/excel-to-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(fs.readFileSync(pdfPath));

        fs.unlinkSync(inputPath);
        fs.unlinkSync(pdfPath);
    });
});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-word
// Convertit un PDF en Word via LibreOffice
// ─────────────────────────────────────────────
router.post('/pdf-to-word', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `libreoffice --headless --convert-to docx --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const docxFileName = path.basename(inputPath, path.extname(inputPath)) + '.docx';
        const docxPath = path.join(outputDir, docxFileName);

        res.setHeader('Content-Disposition', `attachment; filename="${docxFileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(fs.readFileSync(docxPath));

        fs.unlinkSync(inputPath);
        fs.unlinkSync(docxPath);
    });
});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-excel
// Convertit un PDF en Excel via LibreOffice
// ─────────────────────────────────────────────
router.post('/pdf-to-excel', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `libreoffice --headless --convert-to xlsx --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const xlsxFileName = path.basename(inputPath, path.extname(inputPath)) + '.xlsx';
        const xlsxPath = path.join(outputDir, xlsxFileName);

        res.setHeader('Content-Disposition', `attachment; filename="${xlsxFileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(fs.readFileSync(xlsxPath));

        fs.unlinkSync(inputPath);
        fs.unlinkSync(xlsxPath);
    });
});

// ─────────────────────────────────────────────
// POST /convert/merge-pdf
// Fusionne plusieurs PDFs en un seul
// Accepte plusieurs fichiers via le champ "files"
// ─────────────────────────────────────────────
router.post('/merge-pdf', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length < 2) {
        return res.status(400).json({ message: 'Envoyez au moins 2 fichiers PDF.' });
    }

    try {
        const filePaths = req.files.map(f => f.path);
        const mergedBytes = await mergePDFs(filePaths);

        res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(mergedBytes));

        filePaths.forEach(p => fs.unlinkSync(p));
    } catch (error) {
        res.status(500).json({ message: 'La fusion a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/split-pdf
// Divise un PDF en plusieurs fichiers (un par page)
// Retourne un ZIP contenant tous les PDFs
// ─────────────────────────────────────────────
router.post('/split-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    try {
        const splitPdfs = await splitPDF(req.file.path);
        const zipPath = `/tmp/${Date.now()}-split.zip`;

        // On sauvegarde chaque PDF temporairement puis on zippe
        const tempFiles = [];
        for (let i = 0; i < splitPdfs.length; i++) {
            const tempPath = `/tmp/page-${i + 1}.pdf`;
            fs.writeFileSync(tempPath, splitPdfs[i]);
            tempFiles.push(tempPath);
        }

        const fileList = tempFiles.join(' ');
        exec(`zip ${zipPath} ${fileList}`, (error) => {
            if (error) return res.status(500).json({ message: 'Erreur lors de la création du ZIP.' });

            res.setHeader('Content-Disposition', 'attachment; filename="pages.zip"');
            res.setHeader('Content-Type', 'application/zip');
            res.send(fs.readFileSync(zipPath));

            fs.unlinkSync(req.file.path);
            fs.unlinkSync(zipPath);
            tempFiles.forEach(p => fs.unlinkSync(p));
        });
    } catch (error) {
        res.status(500).json({ message: 'La division a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/rotate-pdf
// Pivote les pages d'un PDF
// Body params: rotation (90, 180, 270)
// pages = tableau d'indices optionnel ex: [0,1,2]
// Si pages absent → toutes les pages sont pivotées
// ─────────────────────────────────────────────
router.post('/rotate-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const rotation = parseInt(req.body.rotation) || 90;
    const pages = req.body.pages ? JSON.parse(req.body.pages) : null;

    try {
        const rotatedBytes = await rotatePages(req.file.path, rotation, pages);

        res.setHeader('Content-Disposition', 'attachment; filename="rotated.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(rotatedBytes));

        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.status(500).json({ message: 'La rotation a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/watermark-pdf
// Ajoute un filigrane texte à un PDF
// Body params: text (texte du filigrane)
// ─────────────────────────────────────────────
router.post('/watermark-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });
    if (!req.body.text) return res.status(400).json({ message: 'Texte du filigrane manquant.' });

    try {
        const watermarkedBytes = await addWatermark(req.file.path, req.body.text);

        res.setHeader('Content-Disposition', 'attachment; filename="watermarked.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(watermarkedBytes));

        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.status(500).json({ message: 'Le filigrane a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/number-pdf
// Ajoute des numéros de page à un PDF
// ─────────────────────────────────────────────
router.post('/number-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    try {
        const numberedBytes = await numberPages(req.file.path);

        res.setHeader('Content-Disposition', 'attachment; filename="numbered.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(numberedBytes));

        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.status(500).json({ message: 'La numérotation a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/protect-pdf
// Protège un PDF avec un mot de passe via Ghostscript
// Body params: password
// ─────────────────────────────────────────────
router.post('/protect-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });
    if (!req.body.password) return res.status(400).json({ message: 'Mot de passe manquant.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-protected.pdf`;
    const password = req.body.password;

    // Ghostscript gère mieux le chiffrement PDF que pdf-lib
    const command = `gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOwnerPassword=${password} -sUserPassword=${password} -dEncryptionR=3 -dKeyLength=128 -o "${outputPath}" "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La protection a échoué. Veuillez réessayer.' });

        res.setHeader('Content-Disposition', 'attachment; filename="protected.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(fs.readFileSync(outputPath));

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    });
});

// ─────────────────────────────────────────────
// POST /convert/ocr-image
// Extrait le texte d'une image via Tesseract
// Query params: lang (default: eng, fra pour français)
// ─────────────────────────────────────────────
router.post('/ocr-image', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const lang = req.query.lang || 'eng';

    try {
        const text = await extractTextFromImage(req.file.path, lang);

        res.setHeader('Content-Disposition', 'attachment; filename="texte-extrait.txt"');
        res.setHeader('Content-Type', 'text/plain');
        res.send(text);

        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.status(500).json({ message: 'L\'OCR a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/ocr-pdf
// Extrait le texte d'un PDF via Tesseract
// Chaque page du PDF est convertie en image puis analysée
// Query params: lang (default: eng, fra pour français)
// ─────────────────────────────────────────────
router.post('/ocr-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const lang = req.query.lang || 'eng';

    try {
        const text = await extractTextFromPDF(req.file.path, lang);

        res.setHeader('Content-Disposition', 'attachment; filename="texte-extrait.txt"');
        res.setHeader('Content-Type', 'text/plain');
        res.send(text);

        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.status(500).json({ message: 'L\'OCR a échoué. Veuillez réessayer.' });
    }
});

// On exporte le router
module.exports = router;










































