import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib/dist/pdf-lib.esm.js';
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import { loadPdfJs } from './usePdfEngine';
import { OrganizePageItem, OrganizeFileItem } from '../ui/OrganizeEditor';

export interface WatermarkSettings {
    text: string;
    size: number;
    color: string;
    opacity: number;
}

interface UseConvertActionsProps {
    setStep: (step: string) => void;
    setResultUrl: (url: string) => void;
    pdfOriginalBuffer: ArrayBuffer | null;
    organizeFiles: OrganizeFileItem[];
    setOrganizeFiles: (files: OrganizeFileItem[]) => void;
    organizePages: OrganizePageItem[];
    setOrganizePages: (pages: OrganizePageItem[]) => void;
    pdfDocRef: any;
    setPdfDocRef: (ref: any) => void;
    selectedFiles: any[];
    setSelectedFiles: (files: any[]) => void;
    setFileName: (name: string) => void;
    splitTab: 'split' | 'extract';
    splitPoints: number[];
    splitInterval: number;
}

export function useConvertActions({
    setStep,
    setResultUrl,
    pdfOriginalBuffer,
    organizeFiles,
    setOrganizeFiles,
    organizePages,
    setOrganizePages,
    pdfDocRef,
    setPdfDocRef,
    selectedFiles,
    setSelectedFiles,
    setFileName,
    splitTab,
    splitPoints,
    splitInterval
}: UseConvertActionsProps) {

    const initOrganizeEditor = async (files: any[], appendToExisting = false, targetStep: string = 'organize_editor') => {
        try {
            const effectiveTargetStep = appendToExisting ? step : targetStep;
            const pastelColors = ['#ffcfcf', '#cbf2e8', '#fff0b5', '#dfd5f6', '#c2ebf9'];
            const newOrganizePages: OrganizePageItem[] = appendToExisting ? [...organizePages] : [];
            const newOrganizeFiles: any[] = appendToExisting ? [...organizeFiles] : [];
            const startIndex = newOrganizeFiles.length;

            if (!appendToExisting) {
                currentRenderSession.current += 1;
            }
            const sessionId = currentRenderSession.current;
            
            // 1. PUSH SKELETON UI IMMEDIATELY
            for (let i = 0; i < files.length; i++) {
                const fileIndex = startIndex + i;
                const file = files[i];
                const color = pastelColors[fileIndex % pastelColors.length];
                
                // Add empty file with null buffer
                newOrganizeFiles.push({ name: file.name, color, originalIndex: fileIndex, buffer: null, pageCount: undefined });

                // Add skeleton page to trigger ActivityIndicator instantly
                newOrganizePages.push({
                    id: `${fileIndex}-0`,
                    fileIndex: fileIndex,
                    fileName: file.name,
                    pageIndex: 0,
                    imageUri: null as any
                });
            }

            setOrganizeFiles(newOrganizeFiles);
            setOrganizePages(newOrganizePages);
            if (!appendToExisting) setStep(targetStep as any);

            // 2. PROCESS ASYNC IN BACKGROUND (SEQUENTIAL TO AVOID OOM)
            setTimeout(async () => {
                // PHASE 1: GENERATE ALL COVERS FIRST
                const processingQueue = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileIndex = startIndex + i;
                    console.log(`[CONVERT] Processing cover for file ${fileIndex}: ${file.name}`);
                    
                    if (sessionId !== currentRenderSession.current) break;

                    try {
                        let arrayBuffer: ArrayBuffer;
                        if (Platform.OS === 'web' && file.file) {
                            arrayBuffer = await file.file.arrayBuffer();
                        } else {
                            const response = await fetch(file.uri);
                            arrayBuffer = await response.arrayBuffer();
                        }
                        
                        setOrganizeFiles(prev => {
                            const next = [...prev];
                            const targetIndex = next.findIndex(f => f.originalIndex === fileIndex);
                            if (targetIndex !== -1) {
                                next[targetIndex] = { ...next[targetIndex], buffer: arrayBuffer };
                            }
                            return next;
                        });

                        let pdfJsSuccess = false;
                        if (Platform.OS === 'web') {
                            try {
                                const pdfjsLib = await loadPdfJs();
                                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                                const pdf = await loadingTask.promise;
                                
                                setOrganizeFiles(prev => {
                                    const next = [...prev];
                                    const targetIndex = next.findIndex(f => f.originalIndex === fileIndex);
                                    if (targetIndex !== -1) {
                                        next[targetIndex] = { ...next[targetIndex], pageCount: pdf.numPages };
                                    }
                                    return next;
                                });
                                
                                if (pdf.numPages >= 1) {
                                    setOrganizePages(prev => {
                                        const next = [...prev];
                                        const newSkeletons = [];
                                        const pagesToProcess = pdf.numPages;
                                        for (let j = 0; j < pagesToProcess; j++) {
                                            newSkeletons.push({
                                                id: `${fileIndex}-${j}`,
                                                fileIndex: fileIndex,
                                                fileName: file.name,
                                                pageIndex: j,
                                                imageUri: null as any
                                            });
                                        }
                                        const targetIdx = next.findIndex(p => p.fileIndex === fileIndex);
                                        if (targetIdx !== -1) {
                                            let count = 0;
                                            while (next[targetIdx + count]?.fileIndex === fileIndex) count++;
                                            next.splice(targetIdx, count, ...newSkeletons);
                                        } else {
                                            next.push(...newSkeletons);
                                        }
                                        return next;
                                    });

                                    const page = await pdf.getPage(1);
                                    const viewport = page.getViewport({ scale: 0.4 });
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    canvas.width = viewport.width;
                                    canvas.height = viewport.height;
                                    if (ctx) {
                                        await page.render({ canvasContext: ctx, viewport }).promise;
                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                        
                                        if (sessionId === currentRenderSession.current) {
                                            setOrganizePages(prev => {
                                                const next = [...prev];
                                                const targetIdx = next.findIndex(p => p.fileIndex === fileIndex && p.pageIndex === 0);
                                                if (targetIdx !== -1) {
                                                    next[targetIdx] = { ...next[targetIdx], imageUri: dataUrl };
                                                }
                                                return next;
                                            });
                                        }
                                    }
                                    page.cleanup();
                                }
                                
                                loadingTask.destroy(); // Free memory immediately
                                pdfJsSuccess = true;
                                
                                if (pdf.numPages > 1) {
                                    processingQueue.push({ fileIndex, file, arrayBuffer, numPages: pdf.numPages, method: 'web' });
                                }
                            } catch (localError) {
                                console.warn("Local PDF.js rendering failed for cover", localError);
                            }
                        }
                        
                        if (!pdfJsSuccess) {
                            try {
                                const tempDoc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
                                const numPages = tempDoc.getPageCount();
                                
                                setOrganizeFiles(prev => {
                                    const next = [...prev];
                                    const targetIdx = next.findIndex(f => f.originalIndex === fileIndex);
                                    if (targetIdx !== -1) {
                                        next[targetIdx] = { ...next[targetIdx], pageCount: numPages };
                                    }
                                    return next;
                                });

                                setOrganizePages(prev => {
                                    const next = [...prev];
                                    const newSkeletons = [];
                                    for (let j = 0; j < numPages; j++) {
                                        newSkeletons.push({
                                            id: `${fileIndex}-${j}`,
                                            fileIndex: fileIndex,
                                            fileName: file.name,
                                            pageIndex: j,
                                            imageUri: null as any
                                        });
                                    }
                                    const targetIdx = next.findIndex(p => p.fileIndex === fileIndex);
                                    if (targetIdx !== -1) {
                                        let count = 0;
                                        while (next[targetIdx + count]?.fileIndex === fileIndex) count++;
                                        next.splice(targetIdx, count, ...newSkeletons);
                                    } else {
                                        next.push(...newSkeletons);
                                    }
                                    return next;
                                });
                                
                                processingQueue.push({ fileIndex, file, numPages, method: 'backend' });
                            } catch (e) {
                                console.warn("Fallback reading failed", e);
                            }
                        }

                    } catch (fileError: any) {
                        console.error(`Erreur pour le fichier ${file.name}:`, fileError);
                        if (Platform.OS === 'web') window.alert(`Erreur: ${fileError.message}`);
                    }
                }
                
                // PHASE 2: GENERATE REMAINING PAGES FOR ALL FILES (Sequential background)
                const processRemaining = async () => {
                    for (const item of processingQueue) {
                        if (sessionId !== currentRenderSession.current) break;
                        
                        if (item.method === 'web') {
                            try {
                                const pdfjsLib = await loadPdfJs();
                                const loadingTask = pdfjsLib.getDocument({ data: item.arrayBuffer.slice(0) });
                                const pdf = await loadingTask.promise;
                                
                                for (let j = 2; j <= pdf.numPages; j++) {
                                    if (sessionId !== currentRenderSession.current) break;
                                    
                                    // Yield to UI heavily
                                    if (j % 5 === 0) await new Promise(r => setTimeout(r, 20));
                                    
                                    try {
                                        const page = await pdf.getPage(j);
                                        const viewport = page.getViewport({ scale: 0.4 });
                                        const canvas = document.createElement('canvas');
                                        const ctx = canvas.getContext('2d');
                                        canvas.width = viewport.width;
                                        canvas.height = viewport.height;
                                        if (ctx) {
                                            await page.render({ canvasContext: ctx, viewport }).promise;
                                            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                            
                                            if (sessionId === currentRenderSession.current) {
                                                setOrganizePages(prev => {
                                                    const next = [...prev];
                                                    const targetIdx = next.findIndex(p => p.fileIndex === item.fileIndex && p.pageIndex === j - 1);
                                                    if (targetIdx !== -1) {
                                                        next[targetIdx] = { ...next[targetIdx], imageUri: dataUrl };
                                                    }
                                                    return next;
                                                });
                                            }
                                        }
                                        page.cleanup();
                                    } catch (e) {
                                        console.warn('Async thumbnail error', e);
                                    }
                                }
                                loadingTask.destroy();
                            } catch (e) {
                                console.warn('Phase 2 web error', e);
                            }
                        } else {
                            // Backend fallback for remaining pages (if needed)
                            try {
                                const formData = new FormData();
                                let fileBlob;
                                if (Platform.OS === 'web' && item.file.file) {
                                    fileBlob = item.file.file;
                                } else {
                                    const response_file = await fetch(item.file.uri);
                                    fileBlob = await response_file.blob();
                                }
                                formData.append('file', fileBlob, item.file.name);

                                const maxPagesParam = effectiveTargetStep === 'merge_editor' ? '&max_pages=1' : '';
                                const res = await fetch(`${SERVER_URL}/convert/pdf-to-image?format=jpeg&quality=standard${maxPagesParam}`, {
                                    method: 'POST',
                                    body: formData,
                                    headers: { 'Accept': 'application/zip, image/jpeg' }
                                });
                                
                                if (res.ok) {
                                    const contentType = res.headers.get('content-type');
                                    const blob = await res.blob();

                                    if (contentType?.includes('zip')) {
                                        const zip = new JSZip();
                                        const unzipped = await zip.loadAsync(blob);
                                        const fileNames = Object.keys(unzipped.files).sort();
                                        for (let j = 0; j < fileNames.length; j++) {
                                            if (sessionId !== currentRenderSession.current) break;
                                            const filename = fileNames[j];
                                            const f = unzipped.files[filename];
                                            if (!f.dir) {
                                                const imgBlob = await f.async('blob');
                                                if (sessionId === currentRenderSession.current) {
                                                    setOrganizePages(prev => {
                                                        const next = [...prev];
                                                        const targetIdx = next.findIndex(p => p.fileIndex === item.fileIndex && p.pageIndex === j);
                                                        if (targetIdx !== -1) {
                                                            next[targetIdx] = { ...next[targetIdx], imageUri: URL.createObjectURL(imgBlob) };
                                                        }
                                                        return next;
                                                    });
                                                }
                                            }
                                        }
                                    } else {
                                        if (sessionId === currentRenderSession.current) {
                                            setOrganizePages(prev => {
                                                const next = [...prev];
                                                const targetIdx = next.findIndex(p => p.fileIndex === item.fileIndex && p.pageIndex === 0);
                                                if (targetIdx !== -1) {
                                                    next[targetIdx] = { ...next[targetIdx], imageUri: URL.createObjectURL(blob) };
                                                }
                                                return next;
                                            });
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn('Phase 2 backend error', e);
                            }
                        }
                    }
                };
                
                // Launch phase 2 in background without awaiting
                processRemaining();
            }, 0);
        } catch (e: any) {
            console.error("Error in initOrganizeEditor:", e);
            if (Platform.OS === 'web') {
                window.alert("Erreur: Impossible de préparer l'éditeur PDF. Détails: " + (e.message || String(e)));
            }
            if (!appendToExisting) setStep('staging');
        }
    };

    const handleWatermarkComplete = async (settings: WatermarkSettings) => {
        if (!pdfOriginalBuffer) return;
        setStep('processing');
        try {
            const pdfDoc = await PDFDocument.load(pdfOriginalBuffer);
            const pdfPages = pdfDoc.getPages();
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            let r = 0, g = 0, b = 0;
            if (settings.color && settings.color.startsWith('#')) {
                const hex = settings.color.replace('#', '');
                r = parseInt(hex.substring(0, 2), 16) / 255;
                g = parseInt(hex.substring(2, 4), 16) / 255;
                b = parseInt(hex.substring(4, 6), 16) / 255;
            }

            // Let's improve the text centering using widthOfTextAtSize
            pdfPages.forEach(page => {
                const { width, height } = page.getSize();
                const textWidth = fontBold.widthOfTextAtSize(settings.text, settings.size);
                const textHeight = settings.size; // approximate
                
                page.drawText(settings.text, {
                    x: (width / 2) - (textWidth / 2) * Math.cos(45 * Math.PI / 180) + (textHeight/2) * Math.sin(45 * Math.PI / 180),
                    y: (height / 2) - (textWidth / 2) * Math.sin(45 * Math.PI / 180) - (textHeight/2) * Math.cos(45 * Math.PI / 180),
                    size: settings.size,
                    font: fontBold,
                    color: rgb(r, g, b),
                    opacity: settings.opacity,
                    rotate: degrees(45), // use positive 45 for diagonal going up-right
                });
            });

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setStep('done');
        } catch (e: any) {
            console.error("Error applying watermark:", e);
            Alert.alert("Erreur", "Échec de l'application du filigrane.");
            setStep('staging');
        }
    };

    const handleRotationComplete = async (rotations: number[]) => {
        if (!pdfOriginalBuffer) return;
        setStep('processing');
        try {
            const pdfDoc = await PDFDocument.load(pdfOriginalBuffer);
            const pdfPages = pdfDoc.getPages();
            
            pdfPages.forEach((page, index) => {
                if (rotations[index] !== 0) {
                    const currentAngle = page.getRotation().angle;
                    page.setRotation(degrees(currentAngle + rotations[index]));
                }
            });

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setStep('done');
        } catch (e: any) {
            console.error("Error applying rotation:", e);
            Alert.alert("Erreur", "Échec de l'application de la rotation.");
            setStep('staging');
        }
    };

    const handleOrganizeComplete = async (orderedPages: OrganizePageItem[]) => {
        setStep('processing');
        setTimeout(async () => {
            try {
                // Create a new empty document
                const newPdfDoc = await PDFDocument.create();
                
                // Pre-load all required source documents ONCE
                const sourceDocs = new Map<number, PDFDocument>();
                const uniqueFileIndices = [...new Set(orderedPages.map(p => p.fileIndex))];
                for (const fileIndex of uniqueFileIndices) {
                    const sourceFileInfo = organizeFiles.find(f => f.originalIndex === fileIndex);
                    let buffer = sourceFileInfo?.buffer;
                    if (!buffer) {
                        const originalFile = selectedFiles.find((_, i) => i === fileIndex);
                        if (originalFile) {
                            if (Platform.OS === 'web' && originalFile.file) {
                                buffer = await originalFile.file.arrayBuffer();
                            } else {
                                const response = await fetch(originalFile.uri);
                                buffer = await response.arrayBuffer();
                            }
                        }
                    }
                    if (buffer) {
                        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
                        sourceDocs.set(fileIndex, doc);
                    }
                }

                // Group pages to copy by fileIndex sequentially to minimize copyPages calls
                const fileGroups: { fileIndex: number, pageIndices: number[] }[] = [];
                for (const pageItem of orderedPages) {
                    const lastGroup = fileGroups[fileGroups.length - 1];
                    if (lastGroup && lastGroup.fileIndex === pageItem.fileIndex) {
                        lastGroup.pageIndices.push(pageItem.pageIndex);
                    } else {
                        fileGroups.push({ fileIndex: pageItem.fileIndex, pageIndices: [pageItem.pageIndex] });
                    }
                }

                // Execute the bulk copies
                for (const group of fileGroups) {
                    const sourceDoc = sourceDocs.get(group.fileIndex);
                    if (sourceDoc) {
                        const copiedPages = await newPdfDoc.copyPages(sourceDoc, group.pageIndices);
                        for (const copiedPage of copiedPages) {
                            newPdfDoc.addPage(copiedPage);
                        }
                    }
                    await new Promise(r => setTimeout(r, 10)); // Yield thread
                }

                const finalPdfBytes = await newPdfDoc.save();
                const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setResultUrl(url);
                setStep('done');
            } catch (e: any) {
                console.error("Error organizing PDF:", e);
                Alert.alert("Erreur locale", "Échec de l'organisation: " + (e.message || String(e)));
                setStep('organize_editor');
            }
        }, 300); // Increased timeout to ensure React paints the processing screen
    };

    const handleMergeComplete = async (type: 'files' | 'pages', data: any) => {
        if (type === 'pages') {
            handleOrganizeComplete(data);
        } else {
            // data is the new filesOrder array
            const newSelectedFiles = data.map((item: OrganizeFileItem) => selectedFiles[item.originalIndex]).filter(Boolean);
            setSelectedFiles(newSelectedFiles);
            
            // Fusionner côté client pour éviter les timeouts serveur
            setStep('processing');
            setFileName('document_fusionne');
            
            setTimeout(async () => {
                try {
                    const newPdfDoc = await PDFDocument.create();
                    
                    for (const fileItem of data) {
                        const sourceFileInfo = organizeFiles.find(f => f.originalIndex === fileItem.originalIndex);
                        if (sourceFileInfo) {
                            let buffer = sourceFileInfo.buffer;
                            if (!buffer) {
                                const originalFile = selectedFiles.find((_, i) => i === fileItem.originalIndex);
                                if (originalFile) {
                                    if (Platform.OS === 'web' && originalFile.file) {
                                        buffer = await originalFile.file.arrayBuffer();
                                    } else {
                                        const response = await fetch(originalFile.uri);
                                        buffer = await response.arrayBuffer();
                                    }
                                }
                            }
                            if (buffer) {
                                const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
                                const copiedPages = await newPdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
                                copiedPages.forEach(page => newPdfDoc.addPage(page));
                            }
                        }
                        
                        // Yield main thread to prevent UI freezing on large PDFs
                        await new Promise(r => setTimeout(r, 10));
                    }
                    
                    const finalPdfBytes = await newPdfDoc.save();
                    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    setResultUrl(url);
                    setStep('done');
                } catch (e: any) {
                    console.error("Error merging files locally:", e);
                    setLocalError("Échec de la fusion: " + (e.message || String(e)));
                    setStep('merge_editor');
                }
            }, 300); // Increased timeout to ensure React paints the processing screen
        }
    };


    const handleSplitPDF = async () => {
        if (organizeFiles.length === 0) return;
        
        if (splitTab === 'extract' && extractedPages.length === 0) {
            setLocalError("Veuillez sélectionner au moins une page à extraire.");
            return;
        }
        
        setIsSplitting(true);
        setLocalError(null);
        setStep('processing'); // Go to spinner screen
        
        setTimeout(async () => {
            try {
                // Pre-load all source documents to handle multiple files in the visual editor
                const sourceDocs = new Map<number, PDFDocument>();
                for (const fileItem of organizeFiles) {
                    if (fileItem.buffer) {
                        const doc = await PDFDocument.load(fileItem.buffer.slice(0));
                        sourceDocs.set(fileItem.originalIndex, doc);
                    }
                }
                
                if (splitTab === 'extract') {
                    const newDoc = await PDFDocument.create();
                    const pagesToCopy = [...extractedPages].sort((a, b) => a - b).map(idx => organizePages[idx]);
                    
                    const fileGroups: { fileIndex: number, pageIndices: number[] }[] = [];
                    for (const pageItem of pagesToCopy) {
                        const lastGroup = fileGroups[fileGroups.length - 1];
                        if (lastGroup && lastGroup.fileIndex === pageItem.fileIndex) {
                            lastGroup.pageIndices.push(pageItem.pageIndex);
                        } else {
                            fileGroups.push({ fileIndex: pageItem.fileIndex, pageIndices: [pageItem.pageIndex] });
                        }
                    }
                    
                    for (const group of fileGroups) {
                        const sourceDoc = sourceDocs.get(group.fileIndex);
                        if (sourceDoc) {
                            const copiedPages = await newDoc.copyPages(sourceDoc, group.pageIndices);
                            for (const copiedPage of copiedPages) {
                                newDoc.addPage(copiedPage);
                            }
                        }
                    }
                    
                    const pdfBytes = await newDoc.save();
                    
                    if (Platform.OS === 'web') {
                        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                        setResultUrl(URL.createObjectURL(blob));
                    }
                    setFileName('document_extrait');
                    
                } else {
                    const zip = new JSZip();
                    let docIndex = 1;
                    const generatedFiles: {name: string, url: string}[] = [];

                    const totalPages = organizePages.length;
                    const chunks: OrganizePageItem[][] = [];
                    let currentChunk: OrganizePageItem[] = [];
                    
                    for (let i = 0; i < totalPages; i++) {
                        currentChunk.push(organizePages[i]);
                        if (splitPoints.includes(i) || i === totalPages - 1) {
                            chunks.push(currentChunk);
                            currentChunk = [];
                        }
                    }
                    
                    for (const chunk of chunks) {
                        const currentDoc = await PDFDocument.create();
                        
                        const fileGroups: { fileIndex: number, pageIndices: number[] }[] = [];
                        for (const pageItem of chunk) {
                            const lastGroup = fileGroups[fileGroups.length - 1];
                            if (lastGroup && lastGroup.fileIndex === pageItem.fileIndex) {
                                lastGroup.pageIndices.push(pageItem.pageIndex);
                            } else {
                                fileGroups.push({ fileIndex: pageItem.fileIndex, pageIndices: [pageItem.pageIndex] });
                            }
                        }
                        
                        for (const group of fileGroups) {
                            const sourceDoc = sourceDocs.get(group.fileIndex);
                            if (sourceDoc) {
                                const copiedPages = await currentDoc.copyPages(sourceDoc, group.pageIndices);
                                for (const copiedPage of copiedPages) {
                                    currentDoc.addPage(copiedPage);
                                }
                            }
                        }

                        const pdfBytes = await currentDoc.save();
                        const partFileName = `document_partie_${docIndex}.pdf`;
                        zip.file(partFileName, pdfBytes);
                        
                        if (Platform.OS === 'web') {
                            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                            generatedFiles.push({
                                name: partFileName,
                                url: URL.createObjectURL(blob)
                            });
                        }
                        
                        docIndex++;
                        await new Promise(r => setTimeout(r, 10)); // Yield thread between chunks
                    }

                    const zipContent = await zip.generateAsync({ type: Platform.OS === 'web' ? 'blob' : 'base64' });
                    
                    if (Platform.OS === 'web') {
                        setResultFiles(generatedFiles);
                        const url = URL.createObjectURL(zipContent as Blob);
                        setResultUrl(url);
                    } else {
                        const fileUri = FileSystem.cacheDirectory + 'documents_divises.zip';
                        await FileSystem.writeAsStringAsync(fileUri, zipContent as string, { encoding: FileSystem.EncodingType.Base64 });
                        setResultUrl(fileUri);
                    }
                    setFileName('documents_divises.zip');
                }
                
                setStep('done');
            } catch (e: any) {
                console.error("Split error:", e);
                setLocalError("Erreur lors du traitement: " + (e.message || String(e)));
                setIsSplitting(false);
                setStep('split_editor');
            } finally {
                setIsSplitting(false);
            }
        }, 100);
    };

    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        if (step === 'done' && Platform.OS === 'web') {
            if (resultUrl) {
                try {
                    const ext = (selectedService?.id === 'split-pdf' && splitTab === 'extract') ? 'pdf' : (selectedService?.outputExt || 'zip');
                    // Auto-download
                    const a = document.createElement('a');
                    a.href = resultUrl;
                    a.download = `${fileName}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    // Auto-open in new tab for PDFs
                    if (ext === 'pdf') {
                        window.open(resultUrl, '_blank');
                    }
                } catch (e) {
                    console.log('Auto-download blocked', e);
                }
            }
        }
    }, [step, resultUrl]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        
        return () => subscription.unsubscribe();
    }, []);


    return {
        initOrganizeEditor,
        handleWatermarkComplete,
        handleRotationComplete,
        handleOrganizeComplete,
        handleMergeComplete,
        handleSplitPDF
    };
}
