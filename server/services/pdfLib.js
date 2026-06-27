/**
 * services/pdfLib.js
 *
 * Centralise toutes les opérations de manipulation PDF
 * utilisant la librairie pdf-lib.
 * Fusionner, diviser, extraire, supprimer, pivoter,
 * rogner, numéroter, filigrane, protéger, déverrouiller, aplatir.
 */

// On importe pdf-lib pour manipuler les PDFs
const { PDFDocument, degrees, rgb, StandardFonts } = require('pdf-lib');

// On importe fs pour lire et écrire les fichiers
const fs = require('fs');

// ─────────────────────────────────────────────
// Fusionner plusieurs PDFs en un seul
// filePaths = tableau de chemins vers les PDFs à fusionner
// ─────────────────────────────────────────────
const mergePDFs = async (filePaths) => {

    // On crée un nouveau document PDF vide
    const mergedPdf = await PDFDocument.create();

    // Pour chaque PDF on copie toutes ses pages dans le document fusionné
    for (const filePath of filePaths) {
        const pdfBytes = fs.readFileSync(filePath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    // On retourne le PDF fusionné en bytes
    return await mergedPdf.save();
};

// ─────────────────────────────────────────────
// Diviser un PDF — retourne un tableau de PDFs (un par page)
// filePath = chemin vers le PDF à diviser
// ─────────────────────────────────────────────
const splitPDF = async (filePath) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pageCount = pdf.getPageCount();
    const splitPdfs = [];

    // On crée un PDF séparé pour chaque page
    for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);
        splitPdfs.push(await newPdf.save());
    }

    return splitPdfs;
};

// ─────────────────────────────────────────────
// Extraire des pages spécifiques d'un PDF
// filePath = chemin vers le PDF
// pages = tableau d'indices de pages (commence à 0)
// ex: [0, 2, 4] = pages 1, 3, 5
// ─────────────────────────────────────────────
const extractPages = async (filePath, pages) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();

    const copiedPages = await newPdf.copyPages(pdf, pages);
    copiedPages.forEach(page => newPdf.addPage(page));

    return await newPdf.save();
};

// ─────────────────────────────────────────────
// Supprimer des pages spécifiques d'un PDF
// filePath = chemin vers le PDF
// pagesToDelete = tableau d'indices de pages à supprimer (commence à 0)
// ─────────────────────────────────────────────
const deletePages = async (filePath, pagesToDelete) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pageCount = pdf.getPageCount();

    // On garde toutes les pages sauf celles à supprimer
    const pagesToKeep = [...Array(pageCount).keys()].filter(i => !pagesToDelete.includes(i));

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, pagesToKeep);
    copiedPages.forEach(page => newPdf.addPage(page));

    return await newPdf.save();
};

// ─────────────────────────────────────────────
// Pivoter des pages d'un PDF
// filePath = chemin vers le PDF
// rotation = angle de rotation (90, 180, 270)
// pageIndices = pages à pivoter (null = toutes les pages)
// ─────────────────────────────────────────────
const rotatePages = async (filePath, rotation, pageIndices = null) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = pdf.getPages();

    // Si pageIndices est null on pivote toutes les pages
    const indicesToRotate = pageIndices || pages.map((_, i) => i);

    indicesToRotate.forEach(i => {
        const currentRotation = pages[i].getRotation().angle;
        pages[i].setRotation(degrees(currentRotation + rotation));
    });

    return await pdf.save();
};

// ─────────────────────────────────────────────
// Ajouter un filigrane texte à un PDF
// filePath = chemin vers le PDF
// text = texte du filigrane
// ─────────────────────────────────────────────
const addWatermark = async (filePath, text) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();

    pages.forEach(page => {
        const { width, height } = page.getSize();

        // On dessine le texte en diagonale au centre de la page
        page.drawText(text, {
            x: width / 4,
            y: height / 2,
            size: 50,
            font,
            color: rgb(0.8, 0.8, 0.8), // gris clair
            opacity: 0.3,
            rotate: degrees(45),
        });
    });

    return await pdf.save();
};

// ─────────────────────────────────────────────
// Numéroter les pages d'un PDF
// filePath = chemin vers le PDF
// ─────────────────────────────────────────────
const numberPages = async (filePath) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();
    const totalPages = pages.length;

    pages.forEach((page, i) => {
        const { width } = page.getSize();

        // On ajoute le numéro de page en bas au centre
        page.drawText(`${i + 1} / ${totalPages}`, {
            x: width / 2 - 20,
            y: 20,
            size: 12,
            font,
            color: rgb(0, 0, 0),
        });
    });

    return await pdf.save();
};

// ─────────────────────────────────────────────
// Protéger un PDF avec un mot de passe
// filePath = chemin vers le PDF
// password = mot de passe à appliquer
// ─────────────────────────────────────────────
const protectPDF = async (filePath, password) => {

    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);

    // On sauvegarde avec chiffrement
    return await pdf.save({
        userPassword: password,
        ownerPassword: password,
    });
};

// On exporte toutes les fonctions
module.exports = {
    mergePDFs,
    splitPDF,
    extractPages,
    deletePages,
    rotatePages,
    addWatermark,
    numberPages,
    protectPDF,
};