import { useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib/dist/pdf-lib.esm.js';
import JSZip from 'jszip';
import { OrganizePageItem } from '../../../components/OrganizeEditor';
import { PdfEditItem } from '../../../components/PdfEditor';

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

export function usePdfEngine({ setStep, setResultUrl }: { setStep: (step: string) => void, setResultUrl: (url: string) => void }) {
    const [pdfOriginalBuffer, setPdfOriginalBuffer] = useState<ArrayBuffer | null>(null);
    const [pdfEditorPages, setPdfEditorPages] = useState<string[]>([]);
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
                    }
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

            for (const edit of edits) {
                const page = pdfPages[edit.pageIndex];
                if (!page) continue;

                const { width, height } = page.getSize();
                
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
                            const isPng = sig.data.includes('image/png') || sig.data.endsWith('.png');
                            const imgBytes = await fetch(sig.data).then(r => r.arrayBuffer());
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
