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

// --- MIDDLEWARE DE NETTOYAGE AUTO ---
// Garantit que le fichier d'entrée est supprimé peu importe l'issue (succès ou erreur 500)
router.use((req, res, next) => {
    res.on('finish', () => {
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch(e) {}
        }
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) {
                    try { fs.unlinkSync(f.path); } catch(e) {}
                }
            });
        }
    });
    next();
});
// ------------------------------------


// On configure multer pour stocker les fichiers temporairement sur le disque
// LibreOffice, poppler et ImageMagick ont besoin de vrais fichiers sur le disque
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${cleanName}`);
    }
});

const upload = multer({ 
    storage, 
    limits: { fileSize: 500 * 1024 * 1024 } // 500 Mo max pour la conversion (évite la saturation RAM/Disque)
});

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
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        // LibreOffice génère le PDF avec le même nom mais extension .pdf
        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        // On envoie le PDF au client
        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
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

    // Gestion de la qualité (HD = 300 DPI, Standard = 150 DPI)
    const quality = req.body.quality || 'standard';
    const dpi = quality === 'hd' ? 300 : 150;
    const maxPages = req.query.max_pages || req.body.max_pages;
    const pageArgs = maxPages ? `-f 1 -l ${maxPages}` : "";

    // Commande pdftoppm pour convertir les pages en images
    const command = `pdftoppm -${format === 'jpeg' ? 'jpeg' : 'png'} -r ${dpi} ${pageArgs} "${inputPath}" "${outputPrefix}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("pdftoppm error:", error, stderr);
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.', error: error.message, stderr: stderr });
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
            res.download(imagePath, (err) => {
        if (fs.existsSync(imagePath)) {
            try { fs.unlinkSync(imagePath); } catch(e) {}
        }
    });
            
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
            res.download(zipPath, (err) => {
        if (fs.existsSync(zipPath)) {
            try { fs.unlinkSync(zipPath); } catch(e) {}
        }
    });

            // On supprime tous les fichiers temporaires
            
            files.forEach(f => { try { fs.unlinkSync(`/tmp/${f}`); } catch(e) {} });
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
    
    const quality = req.body.quality || 'standard';
    const density = quality === 'hd' ? 300 : 150;
    const jpegQuality = quality === 'hd' ? 100 : 75;

    // Commande ImageMagick pour convertir l'image en PDF avec paramètres de qualité
    const command = `convert -density ${density} -quality ${jpegQuality} "${inputPath}" "${pdfPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        res.setHeader('Content-Disposition', 'attachment; filename="image-converti.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.download(pdfPath, (err) => {
        if (fs.existsSync(pdfPath)) {
            try { fs.unlinkSync(pdfPath); } catch(e) {}
        }
    });

        // On supprime les fichiers temporaires
        
    });

});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-pptx
// Convertit un PDF en PowerPoint via LibreOffice
// ─────────────────────────────────────────────
router.post('/pdf-to-pptx', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    const inputPath = req.file.path;
    const outputDir = '/tmp';

    // Commande LibreOffice pour convertir PDF en PPTX via le filtre impress
    const command = `export HOME=/tmp && libreoffice --infilter="impress_pdf_import" --headless --convert-to pptx --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        const pptxFileName = path.basename(inputPath, path.extname(inputPath)) + '.pptx';
        const pptxPath = path.join(outputDir, pptxFileName);

        res.download(pptxPath, pptxFileName, (err) => {
            if (fs.existsSync(pptxPath)) {
                try { fs.unlinkSync(pptxPath); } catch(e) {}
            }
        });
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
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) {
            return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });
        }

        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
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
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
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
    const command = `export HOME=/tmp && libreoffice --headless --convert-to docx --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const docxFileName = path.basename(inputPath, path.extname(inputPath)) + '.docx';
        const docxPath = path.join(outputDir, docxFileName);

        res.download(docxPath, docxFileName, (err) => {
            if (fs.existsSync(docxPath)) {
                try { fs.unlinkSync(docxPath); } catch(e) {}
            }
        });
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
    const command = `export HOME=/tmp && libreoffice --headless --convert-to xlsx --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const xlsxFileName = path.basename(inputPath, path.extname(inputPath)) + '.xlsx';
        const xlsxPath = path.join(outputDir, xlsxFileName);

        res.download(xlsxPath, xlsxFileName, (err) => {
            if (fs.existsSync(xlsxPath)) {
                try { fs.unlinkSync(xlsxPath); } catch(e) {}
            }
        });
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

        filePaths.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
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
        const timestamp = Date.now();
        const splitMode = req.body.splitMode || 'all';

        for (let i = 0; i < splitPdfs.length; i++) {
            const pageNumber = i + 1;
            const isEven = pageNumber % 2 === 0;

            if (splitMode === 'even' && !isEven) continue;
            if (splitMode === 'odd' && isEven) continue;

            const tempPath = `/tmp/${timestamp}-page-${pageNumber}.pdf`;
            fs.writeFileSync(tempPath, splitPdfs[i]);
            tempFiles.push(tempPath);
        }

        const fileList = tempFiles.join(' ');
        exec(`zip ${zipPath} ${fileList}`, (error) => {
            if (error) return res.status(500).json({ message: 'Erreur lors de la création du ZIP.' });

            res.setHeader('Content-Disposition', 'attachment; filename="pages.zip"');
            res.setHeader('Content-Type', 'application/zip');
            res.download(zipPath, (err) => {
        if (fs.existsSync(zipPath)) {
            try { fs.unlinkSync(zipPath); } catch(e) {}
        }
    });

            try { fs.unlinkSync(req.file.path); } catch(e) {}
            tempFiles.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
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

        try { fs.unlinkSync(req.file.path); } catch(e) {}
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

    try {
        const text = req.body.text || 'CONFIDENTIEL';
        const position = req.body.position || 'diagonal';
        const watermarkedBytes = await addWatermark(req.file.path, text, position);

        res.setHeader('Content-Disposition', 'attachment; filename="watermarked.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(watermarkedBytes));

        try { fs.unlinkSync(req.file.path); } catch(e) {}
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
        const position = req.body.position || 'bottom-center';
        const format = req.body.format || 'total';
        const numberedBytes = await numberPages(req.file.path, position, format);

        res.setHeader('Content-Disposition', 'attachment; filename="numbered.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(numberedBytes));

        try { fs.unlinkSync(req.file.path); } catch(e) {}
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
        res.download(outputPath, (err) => {
        if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch(e) {}
        }
    });

        
    });
});

// ─────────────────────────────────────────────
// POST /convert/ocr-image
// Extrait le texte d'une image via Tesseract
// Query params: lang (default: eng, fra pour français)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// POST /convert/unlock-pdf
// Déverrouille un PDF protégé avec son mot de passe actuel via Ghostscript
// Body params: password
// ─────────────────────────────────────────────
router.post('/unlock-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });
    if (!req.body.password) return res.status(400).json({ message: 'Mot de passe manquant.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-unlocked.pdf`;
    const password = req.body.password;

    const command = `gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -sPDFPassword="${password}" -sOutputFile="${outputPath}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
        const hasError = error || (stderr && (stderr.includes('Password did not work') || stderr.includes('Cannot decrypt')));
        const outputExists = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;

        if (hasError || !outputExists) {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(400).json({ message: 'Mot de passe incorrect ou document non déchiffrable.' });
        }

        res.setHeader('Content-Disposition', 'attachment; filename="unlocked.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

router.post('/ocr-image', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const lang = req.query.lang || 'eng';

    try {
        const text = await extractTextFromImage(req.file.path, lang);

        res.setHeader('Content-Disposition', 'attachment; filename="texte-extrait.txt"');
        res.setHeader('Content-Type', 'text/plain');
        res.send(text);

        try { fs.unlinkSync(req.file.path); } catch(e) {}
    } catch (error) {
        res.status(500).json({ message: 'L\'OCR a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/ocr-pdf
// Extrait le texte d'un PDF via Tesseract
// Chaque page du PDF est convertie en image puis analysée
// Query params or body params: lang (default: eng, fra pour français)
// ─────────────────────────────────────────────
router.post('/ocr-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const lang = req.body.lang || req.query.lang || 'eng';

    try {
        const text = await extractTextFromPDF(req.file.path, lang);

        res.setHeader('Content-Disposition', 'attachment; filename="texte-extrait.txt"');
        res.setHeader('Content-Type', 'text/plain');
        res.send(text);

        try { fs.unlinkSync(req.file.path); } catch(e) {}
    } catch (error) {
        res.status(500).json({ message: 'L\'OCR a échoué. Veuillez réessayer.' });
    }
});

// ─────────────────────────────────────────────
// POST /convert/ai-summarize
// Résume le contenu d'un PDF en utilisant l'IA Anthropic (Claude)
// ─────────────────────────────────────────────
router.post('/ai-summarize', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    try {
        const text = await extractTextFromPDF(req.file.path, 'fra');
        
        let summaryText = "";
        
        if (!process.env.ANTHROPIC_API_KEY) {
            summaryText = "Résumé (MOCK - Pas de clé API Anthropic configurée) :\n\n" + text.substring(0, 1000) + "\n\n[Fin du résumé mocké]";
        } else {
            const Anthropic = require('@anthropic-ai/sdk');
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            const response = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 1024,
                messages: [
                    { role: "user", content: "Fais un résumé détaillé du texte suivant :\n\n" + text }
                ]
            });
            summaryText = response.content[0].text;
        }

        res.setHeader('Content-Disposition', 'attachment; filename="resume.txt"');
        res.setHeader('Content-Type', 'text/plain');
        res.send(summaryText);

        try { fs.unlinkSync(req.file.path); } catch(e) {}
    } catch (error) {
        res.status(500).json({ message: 'L\'IA a échoué. ' + error.message });
    }
});

// ─────────────────────────────────────────────
// POST /convert/pages-to-pdf
// Convertit un fichier Apple Pages (.pages) en PDF via LibreOffice
// ─────────────────────────────────────────────
router.post('/pages-to-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/keynote-to-pdf
// Convertit un fichier Apple Keynote (.key) en PDF via LibreOffice
// ─────────────────────────────────────────────
router.post('/keynote-to-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué. Veuillez réessayer.' });

        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);

        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/numbers-to-pdf
// Convertit Apple Numbers (.numbers) en PDF
// ─────────────────────────────────────────────
router.post('/numbers-to-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);
        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/txt-to-pdf
// Convertit Text (.txt) en PDF
// ─────────────────────────────────────────────
router.post('/txt-to-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `export HOME=/tmp && libreoffice --headless --convert-to pdf --outdir ${outputDir} "${inputPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        const pdfFileName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);
        res.download(pdfPath, pdfFileName, (err) => {
            if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-txt
// Convertit PDF en TXT via pdftotext
// ─────────────────────────────────────────────
router.post('/pdf-to-txt', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const txtPath = `/tmp/${Date.now()}-output.txt`;
    const command = `pdftotext "${inputPath}" "${txtPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="document.txt"');
        res.setHeader('Content-Type', 'text/plain');
        res.download(txtPath, (err) => {
        if (fs.existsSync(txtPath)) {
            try { fs.unlinkSync(txtPath); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/jpg-to-png
// Convertit JPG en PNG via ImageMagick
// ─────────────────────────────────────────────
router.post('/jpg-to-png', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const pngPath = `/tmp/${Date.now()}-output.png`;
    const command = `convert "${inputPath}" "${pngPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="image.png"');
        res.setHeader('Content-Type', 'image/png');
        res.download(pngPath, (err) => {
        if (fs.existsSync(pngPath)) {
            try { fs.unlinkSync(pngPath); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/png-to-jpg
// Convertit PNG en JPG via ImageMagick
// ─────────────────────────────────────────────
router.post('/png-to-jpg', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const jpgPath = `/tmp/${Date.now()}-output.jpg`;
    // Option -background white -flatten pour gérer la transparence du PNG
    const command = `convert "${inputPath}" -background white -flatten "${jpgPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="image.jpg"');
        res.setHeader('Content-Type', 'image/jpeg');
        res.download(jpgPath, (err) => {
        if (fs.existsSync(jpgPath)) {
            try { fs.unlinkSync(jpgPath); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/heic-to-jpg
// Convertit HEIC (iPhone) en JPG via ImageMagick
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// POST /convert/compress-image
// Compresse et optimise une image via ImageMagick
// Body params: compressionLevel ('low' | 'recommended' | 'extreme')
// ─────────────────────────────────────────────
router.post('/compress-image', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-compressed.jpg`;
    const level = req.body.compressionLevel || 'recommended';

    let options = '-strip -resize 2560x2560> -quality 65%';
    if (level === 'low') {
        options = '-strip -quality 85%';
    } else if (level === 'extreme') {
        options = '-strip -resize 1920x1920> -quality 45%';
    }

    const command = `convert "${inputPath}" -background white -flatten ${options} "${outputPath}"`;

    exec(command, (error) => {
        if (error) {
            console.error('COMPRESS_IMAGE_ERROR:', error);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            return res.status(500).json({ message: "La compression de l'image a échoué." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "image";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-compressed.jpg"`);
        res.setHeader('Content-Type', 'image/jpeg');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

router.post('/heic-to-jpg', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const jpgPath = `/tmp/${Date.now()}-output.jpg`;
    const command = `convert "${inputPath}" "${jpgPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="image.jpg"');
        res.setHeader('Content-Type', 'image/jpeg');
        res.download(jpgPath, (err) => {
        if (fs.existsSync(jpgPath)) {
            try { fs.unlinkSync(jpgPath); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/mp4-to-mp3
// Convertit MP4 en MP3 via FFmpeg
// ─────────────────────────────────────────────
router.post('/mp4-to-mp3', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const mp3Path = `/tmp/${Date.now()}-output.mp3`;
    const command = `ffmpeg -threads 1 -i "${inputPath}" -q:a 0 -map a "${mp3Path}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.download(mp3Path, (err) => {
        if (fs.existsSync(mp3Path)) {
            try { fs.unlinkSync(mp3Path); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/wav-to-mp3
// Convertit WAV en MP3 via FFmpeg
// ─────────────────────────────────────────────
router.post('/wav-to-mp3', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const mp3Path = `/tmp/${Date.now()}-output.mp3`;
    const command = `ffmpeg -threads 1 -i "${inputPath}" -b:a 192k "${mp3Path}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.download(mp3Path, (err) => {
        if (fs.existsSync(mp3Path)) {
            try { fs.unlinkSync(mp3Path); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/mp3-to-wav
// Convertit MP3 en WAV via FFmpeg
// ─────────────────────────────────────────────
router.post('/mp3-to-wav', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const wavPath = `/tmp/${Date.now()}-output.wav`;
    const command = `ffmpeg -threads 1 -i "${inputPath}" "${wavPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="audio.wav"');
        res.setHeader('Content-Type', 'audio/wav');
        res.download(wavPath, (err) => {
        if (fs.existsSync(wavPath)) {
            try { fs.unlinkSync(wavPath); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/mp4-to-gif
// Convertit MP4 en GIF animé via FFmpeg (Max 15fps, width 480)
// ─────────────────────────────────────────────
router.post('/mp4-to-gif', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const gifPath = `/tmp/${Date.now()}-output.gif`;
    // On optimise le GIF pour ne pas crasher le serveur (scale=480:-1, fps=10)
    const command = `ffmpeg -threads 1 -i "${inputPath}" -vf "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`;

    exec(command, (error) => {
        if (error) return res.status(500).json({ message: 'La conversion a échoué.' });
        res.setHeader('Content-Disposition', 'attachment; filename="animation.gif"');
        res.setHeader('Content-Type', 'image/gif');
        res.download(gifPath, (err) => {
        if (fs.existsSync(gifPath)) {
            try { fs.unlinkSync(gifPath); } catch(e) {}
        }
    });
        
    });
});

// ─────────────────────────────────────────────
// POST /convert/compress-video
// Compresse et optimise une vidéo MP4/WebM/MOV via FFmpeg (H.264 + AAC)
// Body params: compressionLevel ('low' | 'recommended' | 'extreme')
// ─────────────────────────────────────────────
router.post('/compress-video', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier vidéo reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-compressed.mp4`;
    const level = req.body.compressionLevel || 'recommended';

    let videoFilter = "scale='min(1280,iw)':-2";
    let crf = '28';
    let audioBitrate = '96k';
    let preset = 'fast';

    if (level === 'low') {
        videoFilter = "scale='min(1920,iw)':-2";
        crf = '23';
        audioBitrate = '128k';
        preset = 'medium';
    } else if (level === 'extreme') {
        videoFilter = "scale='min(854,iw)':-2";
        crf = '32';
        audioBitrate = '64k';
        preset = 'veryfast';
    }

    const command = `ffmpeg -threads 2 -y -i "${inputPath}" -vf "${videoFilter}" -c:v libx264 -crf ${crf} -preset ${preset} -c:a aac -b:a ${audioBitrate} -movflags +faststart "${outputPath}"`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('COMPRESS_VIDEO_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "La compression de la vidéo a échoué. Veuillez vérifier le fichier." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "video";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-compressed.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/trim-video
// Découpe un extrait vidéo via FFmpeg
// Body params: startTime ('00:00:10' ou secondes), endTime ('00:00:30' ou secondes)
// ─────────────────────────────────────────────
router.post('/trim-video', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier vidéo reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-trimmed.mp4`;

    const rawStart = (req.body.startTime || '00:00:00').trim();
    const rawEnd = (req.body.endTime || '').trim();

    const safeStart = rawStart.replace(/[^0-9:.]/g, '') || '00:00:00';
    const toClause = rawEnd ? `-to ${rawEnd.replace(/[^0-9:.]/g, '')}` : '';

    const command = `ffmpeg -threads 2 -y -ss ${safeStart} ${toClause} -i "${inputPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -avoid_negative_ts make_zero -movflags +faststart "${outputPath}"`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('TRIM_VIDEO_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "Le découpage de la vidéo a échoué. Vérifiez les repères de temps." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "video";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-extrait.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/compress-audio
// Compresse un fichier audio via FFmpeg
// Body params: compressionLevel ('low' | 'recommended' | 'extreme')
// ─────────────────────────────────────────────
router.post('/compress-audio', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier audio reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-compressed.mp3`;
    const level = req.body.compressionLevel || 'recommended';

    let bitrate = '96k';
    if (level === 'low') bitrate = '128k';
    else if (level === 'extreme') bitrate = '48k';

    const command = `ffmpeg -threads 2 -y -i "${inputPath}" -c:a libmp3lame -b:a ${bitrate} "${outputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('COMPRESS_AUDIO_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "La compression audio a échoué." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "audio";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-compressed.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/trim-audio
// Découpe un extrait audio sans perte
// Body params: startTime, endTime
// ─────────────────────────────────────────────
router.post('/trim-audio', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier audio reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-trimmed.mp3`;

    const rawStart = (req.body.startTime || '00:00:00').trim();
    const rawEnd = (req.body.endTime || '').trim();

    const safeStart = rawStart.replace(/[^0-9:.]/g, '') || '00:00:00';
    const toClause = rawEnd ? `-to ${rawEnd.replace(/[^0-9:.]/g, '')}` : '';

    const command = `ffmpeg -threads 2 -y -ss ${safeStart} ${toClause} -i "${inputPath}" -c:a libmp3lame -q:a 2 "${outputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('TRIM_AUDIO_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "Le découpage audio a échoué." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "audio";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-extrait.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/flatten-pdf
// Aplatit les formulaires interactifs et annotations d'un PDF via pdf-lib
// ─────────────────────────────────────────────
router.post('/flatten-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    try {
        const fileBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        
        try {
            const form = pdfDoc.getForm();
            if (form) form.flatten();
        } catch (formErr) {
            console.log("No form fields or already flat:", formErr.message);
        }

        const flattenedBytes = await pdfDoc.save();
        const outputPath = `/tmp/${Date.now()}-flattened.pdf`;
        fs.writeFileSync(outputPath, flattenedBytes);

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "document";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-aplati.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.download(outputPath, (err) => {
            if (fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    } catch (err) {
        console.error('FLATTEN_PDF_ERROR:', err);
        if (fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch(e) {} }
        return res.status(500).json({ message: "L'aplatissement du PDF a échoué." });
    }
});

// ─────────────────────────────────────────────
// POST /convert/repair-pdf
// Répare un PDF corrompu ou réécrit sa table XREF via Ghostscript
// ─────────────────────────────────────────────
router.post('/repair-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-repaired.pdf`;

    const command = `gs -o "${outputPath}" -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            console.error('REPAIR_PDF_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "La réparation du PDF a échoué. Le fichier est peut-être irrécupérable." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "document";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-repare.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/pdf-to-pdfa
// Convertit un PDF standard en format d'archivage normé PDF/A-2b via Ghostscript
// ─────────────────────────────────────────────
router.post('/pdf-to-pdfa', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-pdfa.pdf`;

    const command = `gs -dPDFA=2 -dBATCH -dNOPAUSE -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile="${outputPath}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            console.error('PDFA_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "La conversion en PDF/A a échoué." });
        }

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "document";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-PDFA.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.download(outputPath, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/crop-pdf
// Rogne les marges extérieures d'un PDF via pdf-lib
// ─────────────────────────────────────────────
router.post('/crop-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

    try {
        const fileBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(fileBytes);
        const pages = pdfDoc.getPages();

        for (const page of pages) {
            const { x, y, width, height } = page.getMediaBox();
            const marginX = width * 0.05;
            const marginY = height * 0.05;
            page.setCropBox(x + marginX, y + marginY, width - marginX * 2, height - marginY * 2);
        }

        const croppedBytes = await pdfDoc.save();
        const outputPath = `/tmp/${Date.now()}-cropped.pdf`;
        fs.writeFileSync(outputPath, croppedBytes);

        const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : "document";
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}-rogne.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.download(outputPath, (err) => {
            if (fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch(e) {} }
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    } catch (err) {
        console.error('CROP_PDF_ERROR:', err);
        if (fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch(e) {} }
        return res.status(500).json({ message: "Le rognage du PDF a échoué." });
    }
});

// ─────────────────────────────────────────────
// POST /convert/html-to-pdf
// Convertit un fichier HTML en document PDF via LibreOffice headless
// ─────────────────────────────────────────────
router.post('/html-to-pdf', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier HTML reçu.' });

    const inputPath = req.file.path;
    const outputDir = '/tmp';
    const command = `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
        const expectedPdf = path.join(outputDir, `${path.parse(inputPath).name}.pdf`);
        if (error || !fs.existsSync(expectedPdf)) {
            console.error('HTML_TO_PDF_ERROR:', error, stderr);
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            return res.status(500).json({ message: "La conversion HTML vers PDF a échoué." });
        }

        res.setHeader('Content-Disposition', 'attachment; filename="page.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.download(expectedPdf, (err) => {
            if (fs.existsSync(inputPath)) { try { fs.unlinkSync(inputPath); } catch(e) {} }
            if (fs.existsSync(expectedPdf)) { try { fs.unlinkSync(expectedPdf); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/merge-audio
// Fusionne plusieurs fichiers audio en un seul fichier MP3 via FFmpeg
// ─────────────────────────────────────────────
router.post('/merge-audio', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length < 2) {
        return res.status(400).json({ message: 'Veuillez fournir au moins 2 fichiers audio à fusionner.' });
    }

    const fileListPath = `/tmp/audio_list_${Date.now()}.txt`;
    const outputPath = `/tmp/${Date.now()}-merged.mp3`;

    const fileListContent = req.files.map(f => `file '${f.path}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);

    const command = `ffmpeg -threads 2 -y -f concat -safe 0 -i "${fileListPath}" -c:a libmp3lame -q:a 2 "${outputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (fs.existsSync(fileListPath)) { try { fs.unlinkSync(fileListPath); } catch(e) {} }

        if (error || !fs.existsSync(outputPath)) {
            console.error('MERGE_AUDIO_ERROR:', error, stderr);
            req.files.forEach(f => { if (fs.existsSync(f.path)) { try { fs.unlinkSync(f.path); } catch(e) {} } });
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
            return res.status(500).json({ message: "La fusion audio a échoué." });
        }

        res.setHeader('Content-Disposition', 'attachment; filename="audio-fusionne.mp3"');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.download(outputPath, (err) => {
            req.files.forEach(f => { if (fs.existsSync(f.path)) { try { fs.unlinkSync(f.path); } catch(e) {} } });
            if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
        });
    });
});

// ─────────────────────────────────────────────
// POST /convert/compare-pdf
// Compare 2 documents PDF et produit un PDF avec les différences visuelles
// ─────────────────────────────────────────────
router.post('/compare-pdf', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length < 2) {
        return res.status(400).json({ message: 'Veuillez sélectionner 2 fichiers PDF à comparer.' });
    }

    const file1 = req.files[0].path;
    const file2 = req.files[1].path;
    const prefix1 = `/tmp/cmp1_${Date.now()}`;
    const prefix2 = `/tmp/cmp2_${Date.now()}`;
    const diffImg = `/tmp/diff_${Date.now()}.png`;
    const outputPath = `/tmp/${Date.now()}-comparaison.pdf`;

    const cmd1 = `pdftoppm -png -r 150 -f 1 -l 1 "${file1}" "${prefix1}" && pdftoppm -png -r 150 -f 1 -l 1 "${file2}" "${prefix2}"`;

    exec(cmd1, (err1) => {
        const img1 = `${prefix1}-1.png`;
        const img2 = `${prefix2}-1.png`;

        if (err1 || !fs.existsSync(img1) || !fs.existsSync(img2)) {
            req.files.forEach(f => { if (fs.existsSync(f.path)) { try { fs.unlinkSync(f.path); } catch(e) {} } });
            return res.status(500).json({ message: "Erreur lors de la lecture des PDF." });
        }

        const cmdCompare = `compare "${img1}" "${img2}" -compose src "${diffImg}" || true`;
        exec(cmdCompare, () => {
            const cmdToPdf = `convert "${diffImg}" "${outputPath}"`;
            exec(cmdToPdf, (err3) => {
                [img1, img2, diffImg].forEach(p => { if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch(e) {} } });

                if (err3 || !fs.existsSync(outputPath)) {
                    req.files.forEach(f => { if (fs.existsSync(f.path)) { try { fs.unlinkSync(f.path); } catch(e) {} } });
                    return res.status(500).json({ message: "Échec de la génération du rapport de comparaison." });
                }

                res.setHeader('Content-Disposition', 'attachment; filename="comparaison-diff.pdf"');
                res.setHeader('Content-Type', 'application/pdf');
                res.download(outputPath, () => {
                    req.files.forEach(f => { if (fs.existsSync(f.path)) { try { fs.unlinkSync(f.path); } catch(e) {} } });
                    if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e) {} }
                });
            });
        });
    });
});

// --- SYSTÈME DE TICKETS (ASYNC POLLING) ---
const jobs = new Map();

router.post('/compress-pdf', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Aucun fichier fourni.');
    }

    const level = req.body.compressionLevel || 'recommended';
    let pdfSettings = '/ebook'; // recommended

    if (level === 'extreme') {
        pdfSettings = '/screen';
    } else if (level === 'low') {
        pdfSettings = '/printer';
    }

    const jobId = Date.now().toString() + '-' + Math.round(Math.random() * 1000);
    const safeInputPath = `/tmp/job-input-${jobId}.pdf`;
    const outputPath = `/tmp/job-output-${jobId}.pdf`;

    // 1. Déplacer le fichier pour éviter sa suppression par le middleware global
    // Utiliser copyFileSync + unlinkSync au lieu de renameSync pour éviter les erreurs EXDEV (fichiers sur partitions différentes)
    try {
        fs.copyFileSync(req.file.path, safeInputPath);
        fs.unlinkSync(req.file.path);
    } catch (err) {
        console.error("Erreur copie fichier :", err);
        return res.status(500).json({ error: "Erreur serveur lors de la copie du fichier." });
    }

    // 2. Enregistrer le job
    jobs.set(jobId, { status: 'processing', progress: 0 });

    // 3. Répondre immédiatement avec le jobId
    res.json({ jobId });

    // 4. Lancer Ghostscript en arrière-plan
    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${safeInputPath}"`;

    exec(gsCommand, { maxBuffer: 1024 * 1024 * 10 }, (error) => {
        // Nettoyer le fichier d'entrée
        if (fs.existsSync(safeInputPath)) {
            try { fs.unlinkSync(safeInputPath); } catch (e) {}
        }

        if (error) {
            console.error('Erreur Ghostscript compression:', error);
            jobs.set(jobId, { status: 'error', error: 'Erreur lors de la compression du PDF.' });
            return;
        }

        jobs.set(jobId, { status: 'done', outputPath });
        
        // Optionnel : nettoyer le job et le fichier de sortie au bout de 10 minutes s'il n'a pas été téléchargé
        setTimeout(() => {
            if (jobs.has(jobId)) {
                jobs.delete(jobId);
                if (fs.existsSync(outputPath)) {
                    try { fs.unlinkSync(outputPath); } catch (e) {}
                }
            }
        }, 10 * 60 * 1000);
    });
});

router.get('/status/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job non trouvé' });
    }
    
    res.json(job);
});

router.get('/download/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs.get(jobId);
    
    if (!job || job.status !== 'done') {
        return res.status(400).send('Fichier non disponible ou en cours de traitement.');
    }
    
    res.download(job.outputPath, 'document_compresse.pdf', (err) => {
        // Nettoyage après téléchargement
        jobs.delete(jobId);
        if (fs.existsSync(job.outputPath)) {
            try { fs.unlinkSync(job.outputPath); } catch(e) {}
        }
    });
});

// On exporte le router
module.exports = router;








































