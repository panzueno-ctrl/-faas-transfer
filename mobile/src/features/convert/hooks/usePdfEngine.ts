import { useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib/dist/pdf-lib.esm.js';
import JSZip from 'jszip';
import { OrganizePageItem } from '../ui/OrganizeEditor';
import { PdfEditItem } from '../ui/PdfEditor';

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

let pdfJsLoadingPromise: Promise<any> | null = null;
export const loadPdfJs = (): Promise<any> => {
    if ((window as any).pdfjsLib) {
        return Promise.resolve((window as any).pdfjsLib);
    }
    if (pdfJsLoadingPromise) {
        return pdfJsLoadingPromise;
    }
    pdfJsLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = async () => {
            const pdfjsLib = (window as any).pdfjsLib;
            try {
                const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
                const text = await res.text();
                const blob = new Blob([text], { type: 'text/javascript' });
                pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
            } catch (e) {
                console.warn("Failed to load pdf.worker.min.js as Blob, falling back to direct URL", e);
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            resolve(pdfjsLib);
        };
        script.onerror = () => {
            pdfJsLoadingPromise = null;
            reject(new Error("Failed to load pdf.js"));
        };
        document.body.appendChild(script);
    });
    return pdfJsLoadingPromise;
};

export interface PdfTextBlock {
    id: string;
    pageIndex: number;
    originalText: string;
    currentText: string;
    x: number;          // % from left (0 - 100)
    y: number;          // % from top (0 - 100)
    width: number;      // % of page width
    height: number;     // % of page height
    fontSize: number;   // in pt
    fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    color: string;      // hex e.g. '#000000'
    textAlign: 'left' | 'center' | 'right';
    isUnderline?: boolean;
    isEdited?: boolean;
    isDeleted?: boolean;
}

export function extractBlocksFromTextContent(
    textContent: any,
    viewport: any,
    pageIndex: number
): PdfTextBlock[] {
    if (!textContent || !textContent.items || textContent.items.length === 0) {
        return [];
    }

    interface RawItem {
        str: string;
        x: number;
        y: number;
        baselineY: number;
        width: number;
        height: number;
        fontSize: number;
        fontName: string;
    }

    const rawItems: RawItem[] = [];

    for (const item of textContent.items) {
        if (!('str' in item) || !item.str) continue;
        const trimmed = item.str.trim();
        // Skip empty or whitespace-only items
        if (trimmed.length === 0) continue;
        if (!item.transform || item.transform.length < 6) continue;

        const scaleX = item.transform[0];
        const skewY = item.transform[1];
        const fontSize = Math.round((Math.sqrt(scaleX * scaleX + skewY * skewY) || 12) * 10) / 10;

        const tx = item.transform[4];
        const ty = item.transform[5];

        const itemX = tx;
        const baselineY = viewport.height - ty;
        const itemY = baselineY - (fontSize * 0.88);
        const itemWidth = item.width || (fontSize * item.str.length * 0.52);
        const itemHeight = fontSize * 1.25;

        rawItems.push({
            str: item.str,
            x: itemX,
            y: itemY,
            baselineY,
            width: itemWidth,
            height: itemHeight,
            fontSize,
            fontName: item.fontName || 'Helvetica',
        });
    }

    if (rawItems.length === 0) return [];

    // Sort items top-to-bottom (baselineY), then left-to-right (x)
    rawItems.sort((a, b) => {
        const yDiff = a.baselineY - b.baselineY;
        if (Math.abs(yDiff) < Math.min(a.fontSize, b.fontSize) * 0.4) {
            return a.x - b.x;
        }
        return yDiff;
    });

    // 1. Group into clean single lines
    interface ClusteredLine {
        text: string;
        x: number;
        y: number;
        baselineY: number;
        width: number;
        height: number;
        fontSize: number;
        fontName: string;
    }

    const lines: ClusteredLine[] = [];

    for (const it of rawItems) {
        const lastLine = lines[lines.length - 1];
        const isSameLine = lastLine &&
            Math.abs(it.baselineY - lastLine.baselineY) < Math.min(it.fontSize, lastLine.fontSize) * 0.45 &&
            (it.x - (lastLine.x + lastLine.width)) < it.fontSize * 1.8 &&
            it.x >= (lastLine.x - 4); // allow small kerning overlap

        if (isSameLine) {
            const needsSpace = !lastLine.text.endsWith(' ') && !it.str.startsWith(' ') && !it.str.startsWith(',') && !it.str.startsWith('.');
            lastLine.text += (needsSpace ? ' ' : '') + it.str;
            lastLine.width = Math.max(lastLine.width, (it.x + it.width) - lastLine.x);
            lastLine.height = Math.max(lastLine.height, it.height);
            lastLine.y = Math.min(lastLine.y, it.y);
            lastLine.fontSize = Math.max(lastLine.fontSize, it.fontSize);
        } else {
            lines.push({
                text: it.str,
                x: it.x,
                y: it.y,
                baselineY: it.baselineY,
                width: it.width,
                height: it.height,
                fontSize: it.fontSize,
                fontName: it.fontName,
            });
        }
    }

    const validLines = lines.filter(l => l.text.trim().length > 0);
    if (validLines.length === 0) return [];

    // 2. Group lines into Paragraphs / Blocks (Word & iLovePDF behavior)
    interface Paragraph {
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
        fontName: string;
    }

    const paragraphs: Paragraph[] = [];

    for (const line of validLines) {
        if (paragraphs.length === 0) {
            paragraphs.push({ ...line });
            continue;
        }

        const last = paragraphs[paragraphs.length - 1];
        const vGap = line.y - (last.y + last.height);
        const sameFont = Math.abs(line.fontSize - last.fontSize) <= 4;

        // Merge adjacent lines in normal paragraph spacing
        if (vGap >= -6 && vGap <= (line.fontSize * 1.6) && sameFont) {
            last.text += '\n' + line.text;
            const newX = Math.min(last.x, line.x);
            const newRight = Math.max(last.x + last.width, line.x + line.width);
            last.x = newX;
            last.width = newRight - newX;
            last.height = (line.y + line.height) - last.y;
        } else {
            paragraphs.push({ ...line });
        }
    }

    return paragraphs.map((para, idx) => {
        const xPct = Math.max(0, Math.min(100, (para.x / viewport.width) * 100));
        const yPct = Math.max(0, Math.min(100, (para.y / viewport.height) * 100));
        const wPct = Math.max(3, Math.min(100 - xPct, (para.width / viewport.width) * 100));
        const hPct = Math.max(2, Math.min(100 - yPct, (para.height / viewport.height) * 100));

        const fn = (para.fontName || '').toLowerCase();
        let fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier' = 'Helvetica';
        if (fn.includes('times') || fn.includes('roman') || fn.includes('serif')) {
            fontFamily = 'TimesRoman';
        } else if (fn.includes('courier') || fn.includes('mono')) {
            fontFamily = 'Courier';
        }

        const isBold = fn.includes('bold') || fn.includes('black') || fn.includes('heavy');
        const isItalic = fn.includes('italic') || fn.includes('oblique');

        return {
            id: `para-p${pageIndex}-${idx}`,
            pageIndex,
            originalText: para.text,
            currentText: para.text,
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            fontSize: Math.round(para.fontSize * 10) / 10,
            fontFamily,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            color: '#000000',
            textAlign: 'left',
            isUnderline: false,
            isEdited: false,
            isDeleted: false,
        };
    });
}

export function usePdfEngine({ setStep, setResultUrl }: { setStep: (step: string) => void, setResultUrl: (url: string) => void }) {
    const [pdfOriginalBuffer, setPdfOriginalBuffer] = useState<ArrayBuffer | null>(null);
    const [pdfEditorPages, setPdfEditorPages] = useState<string[]>([]);
    const [pdfTextBlocks, setPdfTextBlocks] = useState<PdfTextBlock[]>([]);
    const [organizePages, setOrganizePages] = useState<OrganizePageItem[]>([]);
    const [organizeFiles, setOrganizeFiles] = useState<any[]>([]);
    const [pdfDocRef, setPdfDocRef] = useState<any>(null);

    const currentRenderSession = useRef<number>(0);

    const initPdfEditor = async (file: any, targetStep: string = 'pdf_editor') => {
        setStep('preparing_editor');
        try {
            let arrayBuffer: ArrayBuffer;
            if (Platform.OS === 'web' && file.file) {
                arrayBuffer = await file.file.arrayBuffer();
            } else {
                const response = await fetch(file.uri);
                arrayBuffer = await response.arrayBuffer();
            }
            setPdfOriginalBuffer(arrayBuffer);

            let pages: string[] = [];
            const extractedBlocks: PdfTextBlock[] = [];

            if (Platform.OS === 'web') {
                try {
                    const pdfjsLib = await loadPdfJs();
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                    const pdf = await loadingTask.promise;
                    
                    const maxPages = (targetStep === 'protect_editor' || targetStep === 'compress_editor') ? 1 : Math.min(pdf.numPages, 50); 
                    
                    for (let j = 1; j <= maxPages; j++) {
                        const page = await pdf.getPage(j);
                        const viewport = page.getViewport({ scale: 1.0 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            await page.render({ canvasContext: ctx, viewport }).promise;
                            pages.push(canvas.toDataURL('image/jpeg', 0.8));
                        }
                        try {
                            const textContent = await page.getTextContent();
                            const blocks = extractBlocksFromTextContent(textContent, viewport, j - 1);
                            extractedBlocks.push(...blocks);
                        } catch (err) {
                            console.warn(`Failed to extract text content on page ${j}`, err);
                        }
                    }
                    setPdfTextBlocks(extractedBlocks);
                } catch (e) {
                    console.warn("Local PDF rendering failed, falling back to backend", e);
                }
            }
            
            if (pages.length === 0) {
                const formData = new FormData();
                let fileBlob;
                if (Platform.OS === 'web' && file.file) {
                    fileBlob = file.file;
                } else {
                    const response_file = await fetch(file.uri);
                    fileBlob = await response_file.blob();
                }
                formData.append('file', fileBlob, file.name);

                const res = await fetch(`${SERVER_URL}/convert/pdf-to-image?format=jpeg&quality=standard`, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/zip, image/jpeg' }
                });

                if (!res.ok) throw new Error("Échec de la génération des images: " + await res.text());

                const contentType = res.headers.get('content-type');
                const blob = await res.blob();

                if (contentType?.includes('zip')) {
                    const zip = new JSZip();
                    const unzipped = await zip.loadAsync(blob);
                    const fileNames = Object.keys(unzipped.files).sort(); 
                    const limit = (targetStep === 'protect_editor' || targetStep === 'compress_editor') ? 1 : fileNames.length;
                    for (let j = 0; j < Math.min(limit, fileNames.length); j++) {
                        const filename = fileNames[j];
                        const f = unzipped.files[filename];
                        if (!f.dir) {
                            const imgBlob = await f.async('blob');
                            pages.push(URL.createObjectURL(imgBlob));
                        }
                    }
                } else {
                    pages.push(URL.createObjectURL(blob));
                }
            }

            setPdfEditorPages(pages);
            setStep(targetStep);
        } catch (e: any) {
            console.error("Error in initPdfEditor:", e);
            if (Platform.OS === 'web') {
                window.alert("Erreur: Impossible de préparer l'éditeur PDF. Détails: " + (e.message || String(e)));
            } else {
                Alert.alert("Erreur", "Impossible de préparer l'éditeur PDF. Veuillez réessayer.");
            }
            setStep('staging');
        }
    };

    const handlePdfEditorComplete = async (edits: PdfEditItem[]) => {
        if (!pdfOriginalBuffer) return;
        setStep('processing');
        try {
            const pdfDoc = await PDFDocument.load(pdfOriginalBuffer);
            const pdfPages = pdfDoc.getPages();

            const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
            const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
            const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
            const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
            const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

            for (const edit of edits) {
                const page = pdfPages[edit.pageIndex];
                if (!page) continue;

                const { width, height } = page.getSize();
                
                if (edit.type === 'replace' || (edit as any).isReplace) {
                    const x = (edit.x / 100) * width;
                    const rectWidth = ((edit.width || 10) / 100) * width;
                    const rectHeight = ((edit.height || 4) / 100) * height;
                    const rectY = height - ((edit.y / 100) * height) - rectHeight;

                    // Opaque white erase of original text
                    page.drawRectangle({
                        x: Math.max(0, x - 1),
                        y: Math.max(0, rectY - 1),
                        width: rectWidth + 2,
                        height: rectHeight + 2,
                        color: rgb(1, 1, 1),
                    });

                    if (!(edit as any).isDeleted && edit.text && edit.text.trim().length > 0) {
                        const fontSize = edit.size || 14;
                        let fontToUse = fontNormal;
                        if (edit.fontFamily === 'TimesRoman') {
                            fontToUse = edit.fontWeight === 'bold' ? fontTimesBold : fontTimes;
                        } else if (edit.fontFamily === 'Courier') {
                            fontToUse = edit.fontWeight === 'bold' ? fontCourierBold : fontCourier;
                        } else {
                            fontToUse = edit.fontWeight === 'bold' ? fontBold : fontNormal;
                        }

                        let r = 0, g = 0, b = 0;
                        if (edit.color && edit.color.startsWith('#')) {
                            const hex = edit.color.replace('#', '');
                            r = parseInt(hex.substring(0, 2), 16) / 255;
                            g = parseInt(hex.substring(2, 4), 16) / 255;
                            b = parseInt(hex.substring(4, 6), 16) / 255;
                        }

                        const lines = edit.text.split('\n');
                        const lineHeight = fontSize * 1.15;
                        lines.forEach((lineText, lineIdx) => {
                            const lineY = rectY + rectHeight - ((lineIdx + 1) * lineHeight) + (lineHeight * 0.2);
                            let xOffset = 0;
                            if (edit.textAlign === 'center' || edit.textAlign === 'right') {
                                const textW = fontToUse.widthOfTextAtSize(lineText, fontSize);
                                if (edit.textAlign === 'center') xOffset = (rectWidth - textW) / 2;
                                if (edit.textAlign === 'right') xOffset = rectWidth - textW;
                            }

                            page.drawText(lineText, {
                                x: x + Math.max(0, xOffset),
                                y: lineY,
                                size: fontSize,
                                font: fontToUse,
                                color: rgb(r, g, b),
                            });

                            if ((edit as any).isUnderline) {
                                const textW = fontToUse.widthOfTextAtSize(lineText, fontSize);
                                page.drawLine({
                                    start: { x: x + Math.max(0, xOffset), y: lineY - 2 },
                                    end: { x: x + Math.max(0, xOffset) + textW, y: lineY - 2 },
                                    thickness: 1,
                                    color: rgb(r, g, b),
                                });
                            }
                        });
                    }
                }

                if (edit.type === 'text' && edit.text) {
                    const x = (edit.x / 100) * width;
                    const fontSize = edit.size || 24;
                    const y = height - ((edit.y / 100) * height) - fontSize;

                    if (edit.backgroundColor && edit.backgroundColor.startsWith('#')) {
                        const bgHex = edit.backgroundColor.replace('#', '');
                        const bgR = parseInt(bgHex.substring(0, 2), 16) / 255;
                        const bgG = parseInt(bgHex.substring(2, 4), 16) / 255;
                        const bgB = parseInt(bgHex.substring(4, 6), 16) / 255;
                        
                        const rectWidth = (edit.width || 15) * (width / 100);
                        const rectHeight = (edit.height || 4) * (height / 100);
                        const rectY = height - ((edit.y / 100) * height) - rectHeight;

                        page.drawRectangle({
                            x,
                            y: rectY,
                            width: rectWidth,
                            height: rectHeight,
                            color: rgb(bgR, bgG, bgB),
                        });
                    }

                    let r = 0, g = 0, b = 0;
                    if (edit.color && edit.color.startsWith('#')) {
                        const hex = edit.color.replace('#', '');
                        r = parseInt(hex.substring(0, 2), 16) / 255;
                        g = parseInt(hex.substring(2, 4), 16) / 255;
                        b = parseInt(hex.substring(4, 6), 16) / 255;
                    }

                    let fontToUse = fontNormal;
                    if (edit.fontWeight === 'bold' && edit.fontStyle === 'italic') {
                        fontToUse = fontBoldItalic;
                    } else if (edit.fontWeight === 'bold') {
                        fontToUse = fontBold;
                    } else if (edit.fontStyle === 'italic') {
                        fontToUse = fontItalic;
                    }

                    let xOffset = 0;
                    if (edit.textAlign === 'center' || edit.textAlign === 'right') {
                        const textWidth = fontToUse.widthOfTextAtSize(edit.text, fontSize);
                        if (edit.textAlign === 'center') xOffset = -textWidth / 2;
                        if (edit.textAlign === 'right') xOffset = -textWidth;
                    }

                    page.drawText(edit.text, {
                        x: x + xOffset,
                        y,
                        size: fontSize,
                        font: fontToUse,
                        color: rgb(r, g, b),
                    });

                    if ((edit as any).isUnderline) {
                        const textW = fontToUse.widthOfTextAtSize(edit.text, fontSize);
                        page.drawLine({
                            start: { x: x + xOffset, y: y - 2 },
                            end: { x: x + xOffset + textW, y: y - 2 },
                            thickness: 1,
                            color: rgb(r, g, b),
                        });
                    }
                }

                                if (edit.type === 'whiteout') {
                    const x = (edit.x / 100) * width;
                    const rectWidth = ((edit.width || 18) / 100) * width;
                    const rectHeight = ((edit.height || 4) / 100) * height;
                    const rectY = height - ((edit.y / 100) * height) - rectHeight;

                    page.drawRectangle({
                        x,
                        y: rectY,
                        width: rectWidth,
                        height: rectHeight,
                        color: rgb(1, 1, 1),
                    });
                }

                if (edit.type === 'signature' && edit.signatureData) {
                    const sig = edit.signatureData as any;
                    const x = (edit.x / 100) * width;
                    const rectWidth = (edit.width || 20) * (width / 100);
                    const rectHeight = (edit.height || 10) * (height / 100);
                    const y = height - ((edit.y / 100) * height) - rectHeight;

                    if (sig.type === 'text') {
                        page.drawText(sig.data, {
                            x, y, size: rectHeight * 0.8, font: fontItalic, color: rgb(0,0,0)
                        });
                    } else if (sig.type === 'path') {
                        const scaleX = rectWidth / (sig.width || 500);
                        const scaleY = rectHeight / (sig.height || 200);
                        const scale = Math.min(scaleX, scaleY);
                        page.drawSvgPath(sig.data, {
                            x, y: y + rectHeight, scale, borderColor: rgb(0,0,0), borderWidth: 2
                        });
                    } else if (sig.type === 'image') {
                        try {
                            const imgBytes = await fetch(sig.data).then(r => r.arrayBuffer());
                            const uint8 = new Uint8Array(imgBytes);
                            // Robust detection of PNG magic bytes: 0x89 0x50 0x4E 0x47
                            const isPng = (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47) 
                                       || sig.data.includes('image/png') 
                                       || sig.data.endsWith('.png');
                            let pdfImg;
                            if (isPng) {
                                pdfImg = await pdfDoc.embedPng(imgBytes);
                            } else {
                                pdfImg = await pdfDoc.embedJpg(imgBytes);
                            }
                            page.drawImage(pdfImg, {
                                x, y, width: rectWidth, height: rectHeight
                            });
                        } catch (e) {
                            console.error("Failed to embed signature image", e);
                        }
                    }
                }

                if (edit.type === 'draw' && (edit.signatureData as any)?.data) {
                    const sig = edit.signatureData as any;
                    const scaleX = width / (sig.width || width);
                    const scaleY = height / (sig.height || height);
                    const scale = Math.min(scaleX, scaleY);

                    let r = 0, g = 0, b = 0;
                    if (edit.color && edit.color.startsWith('#')) {
                        const hex = edit.color.replace('#', '');
                        r = parseInt(hex.substring(0, 2), 16) / 255;
                        g = parseInt(hex.substring(2, 4), 16) / 255;
                        b = parseInt(hex.substring(4, 6), 16) / 255;
                    }

                    try {
                        page.drawSvgPath(sig.data, {
                            x: 0,
                            y: height,
                            scale,
                            borderColor: rgb(r, g, b),
                            borderWidth: (edit.size || 3) * scale,
                            opacity: (edit as any).opacity !== undefined ? (edit as any).opacity : 1,
                        });
                    } catch (e) {
                        console.warn("Failed to draw SVG path:", e);
                    }
                }

                if (edit.type === 'shape') {
                    const x = (edit.x / 100) * width;
                    const rectWidth = ((edit.width || 20) / 100) * width;
                    const rectHeight = ((edit.height || 10) / 100) * height;
                    const rectY = height - ((edit.y / 100) * height) - rectHeight;

                    let r = 0, g = 0, b = 0;
                    if (edit.color && edit.color.startsWith('#')) {
                        const hex = edit.color.replace('#', '');
                        r = parseInt(hex.substring(0, 2), 16) / 255;
                        g = parseInt(hex.substring(2, 4), 16) / 255;
                        b = parseInt(hex.substring(4, 6), 16) / 255;
                    }

                    if ((edit as any).shapeType === 'circle') {
                        page.drawEllipse({
                            x: x + rectWidth / 2,
                            y: rectY + rectHeight / 2,
                            xScale: rectWidth / 2,
                            yScale: rectHeight / 2,
                            borderColor: rgb(r, g, b),
                            borderWidth: edit.size || 2,
                        });
                    } else if ((edit as any).shapeType === 'line') {
                        page.drawLine({
                            start: { x, y: rectY + rectHeight },
                            end: { x: x + rectWidth, y: rectY },
                            color: rgb(r, g, b),
                            thickness: edit.size || 2,
                        });
                    } else {
                        page.drawRectangle({
                            x,
                            y: rectY,
                            width: rectWidth,
                            height: rectHeight,
                            borderColor: rgb(r, g, b),
                            borderWidth: edit.size || 2,
                        });
                    }
                }
            }

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setStep('done');
        } catch (e: any) {
            console.error("Error applying PDF edits:", e);
            Alert.alert("Erreur", "Échec de l'application des modifications.");
            setStep('staging');
        }
    };

    const resetEngine = () => {
        setPdfDocRef(null);
        setOrganizePages([]);
        setOrganizeFiles([]);
        currentRenderSession.current += 1;
    };

    return {
        pdfOriginalBuffer,
        setPdfOriginalBuffer,
        pdfEditorPages,
        setPdfEditorPages,
        pdfTextBlocks,
        setPdfTextBlocks,
        organizePages,
        setOrganizePages,
        organizeFiles,
        setOrganizeFiles,
        pdfDocRef,
        setPdfDocRef,
        currentRenderSession,
        initPdfEditor,
        handlePdfEditorComplete,
        resetEngine
    };
}
