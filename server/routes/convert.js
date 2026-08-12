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
    limits: { fileSize: 100 * 1024 * 1024 } // 100 Mo max pour la conversion (évite la saturation RAM/Disque)
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

    // Commande ImageMagick pour convertir l'image en PDF
    const command = `convert "${inputPath}" "${pdfPath}"`;

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
    if (!req.body.text) return res.status(400).json({ message: 'Texte du filigrane manquant.' });

    try {
        const watermarkedBytes = await addWatermark(req.file.path, req.body.text);

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
        const numberedBytes = await numberPages(req.file.path);

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

        try { fs.unlinkSync(req.file.path); } catch(e) {}
    } catch (error) {
        res.status(500).json({ message: 'L\'OCR a échoué. Veuillez réessayer.' });
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

// --- NOUVEAU : COMPRESSION PDF ---
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

    const inputPath = req.file.path;
    const outputPath = `/tmp/${Date.now()}-compressed.pdf`;

    // Optimisations de vitesse pour serveurs lents (Render Free Tier) :
    // - Downsampling en /Subsample (beaucoup plus rapide que /Bicubic par défaut)
    // - Multithreading partiel si dispo
    const speedOpts = '-dColorImageDownsampleType=/Subsample -dGrayImageDownsampleType=/Subsample -dMonoImageDownsampleType=/Subsample -dNumRenderingThreads=4';

    // Commande Ghostscript pour compresser (avec limitation mémoire explicite et opti vitesse)
    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} ${speedOpts} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

    exec(gsCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Erreur Ghostscript compression:', error);
            return res.status(500).send('Erreur lors de la compression du PDF.');
        }

        res.download(outputPath, 'document_compresse.pdf', (err) => {
            if (fs.existsSync(outputPath)) {
                try { fs.unlinkSync(outputPath); } catch (e) {}
            }
        });
    });
});

// On exporte le router
module.exports = router;








































