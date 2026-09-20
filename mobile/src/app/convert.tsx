/**
 * app/convert.tsx
 *
 * Écran de conversion et traitement de fichiers avec interface "SmallPDF" : Intro -> Staging -> Processing -> Done.
 */

import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import ActionCard from '../components/ActionCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import PdfThumbnail from '../components/PdfThumbnail';
import CompressionSelector, { CompressionLevel } from '../components/CompressionSelector';
import PasswordProtector from '../components/PasswordProtector';
import WatermarkEditor, { WatermarkSettings } from '../components/WatermarkEditor';
import ProtectEditor from '../components/ProtectEditor';
import SplitEditor from '../components/SplitEditor';
import OrganizeEditor, { OrganizePageItem, OrganizeFileItem } from '../components/OrganizeEditor';
import MergeEditor from '../components/MergeEditor';
import ConversionOptions, { ConversionQuality } from '../components/ConversionOptions';
import NumberingSelector, { NumberingConfig } from '../components/NumberingSelector';
import OcrLanguageSelector, { OcrLanguage } from '../components/OcrLanguageSelector';
import PdfEditor, { PdfEditItem } from '../components/PdfEditor';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib/dist/pdf-lib.esm.js';
import JSZip from 'jszip';

// Helper pour charger dynamiquement PDF.js sur le Web
const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            const pdfjsLib = (window as any).pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(pdfjsLib);
        };
        script.onerror = () => reject(new Error("Failed to load pdf.js"));
        document.body.appendChild(script);
    });
};

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

const FILE_TOOLS = [
    { id: 'merge-pdf', category: 'Outils PDF Essentiels', label: 'Fusionner PDF', description: 'Combinez plusieurs fichiers PDF dans l\'ordre de votre choix.', icon: 'git-merge-outline', endpoint: '/convert/merge-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'split-pdf', category: 'Outils PDF Essentiels', label: 'Diviser PDF', description: 'Séparez une ou plusieurs pages d\'un PDF.', icon: 'cut-outline', endpoint: '/convert/split-pdf', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'compress-pdf', category: 'Outils PDF Essentiels', label: 'Compresser PDF', description: 'Réduisez le poids de votre PDF sans perte de qualité.', icon: 'contract-outline', endpoint: '/convert/compress-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'edit-pdf', category: 'Outils PDF Essentiels', label: 'Modifier PDF', description: 'Ajoutez du texte, des formes ou des images à votre PDF.', icon: 'create-outline', endpoint: '/convert/edit-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'watermark-pdf', category: 'Outils PDF Essentiels', label: 'Filigrane', description: 'Ajoutez un filigrane de sécurité à votre document.', icon: 'water-outline', endpoint: '/convert/watermark-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'rotate-pdf', category: 'Outils PDF Essentiels', label: 'Faire pivoter', description: 'Faites pivoter vos pages PDF selon vos besoins.', icon: 'refresh-outline', endpoint: '/convert/rotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'organize-pdf', category: 'Outils PDF Essentiels', label: 'Organiser PDF', description: 'Triez, ajoutez et supprimez des pages.', icon: 'layers-outline', endpoint: '/convert/organize-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'protect-pdf', category: 'Outils PDF Essentiels', label: 'Protéger PDF', description: 'Ajoutez un mot de passe pour sécuriser votre PDF.', icon: 'lock-closed-outline', endpoint: '/convert/protect-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'unlock-pdf', category: 'Outils PDF Essentiels', label: 'Déverrouiller', description: 'Retirez le mot de passe d\'un fichier PDF.', icon: 'lock-open-outline', endpoint: '/convert/unlock-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'number-pdf', category: 'Outils PDF Essentiels', label: 'Numéros pages', description: 'Insérez des numéros de page dans votre document.', icon: 'list-outline', endpoint: '/convert/number-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'crop-pdf', category: 'Outils PDF Essentiels', label: 'Rogner PDF', description: 'Ajustez les marges ou coupez des zones.', icon: 'crop-outline', endpoint: '/convert/crop-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'flatten-pdf', category: 'Outils PDF Essentiels', label: 'Aplatir PDF', description: 'Rendez vos formulaires et annotations non modifiables.', icon: 'copy-outline', endpoint: '/convert/flatten-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'repair-pdf', category: 'Outils PDF Essentiels', label: 'Réparer PDF', description: 'Restaurez les données d\'un fichier PDF corrompu.', icon: 'build-outline', endpoint: '/convert/repair-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'censor-pdf', category: 'Outils PDF Essentiels', label: 'Censure PDF', description: 'Masquez des informations confidentielles.', icon: 'eye-off-outline', endpoint: '/convert/censor-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'annotate-pdf', category: 'Outils PDF Essentiels', label: 'Annoter PDF', description: 'Surlignez et annotez le contenu de vos PDF.', icon: 'brush-outline', endpoint: '/convert/annotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'pdfa-pdf', category: 'Outils PDF Essentiels', label: 'PDF en PDF/A', description: 'Convertissez en PDF/A pour l\'archivage à long terme.', icon: 'archive-outline', endpoint: '/convert/pdf-to-pdfa', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'ocr-pdf', category: 'Outils PDF Essentiels', label: 'OCR PDF', description: 'Rendez le texte de vos PDF scannés sélectionnable.', icon: 'scan-outline', endpoint: '/convert/ocr-pdf', mimeTypes: ['application/pdf'], outputExt: 'txt' },
    { id: 'compare-pdf', category: 'Outils PDF Essentiels', label: 'Comparer PDF', description: 'Analysez les différences entre deux documents.', icon: 'git-compare-outline', endpoint: '/convert/compare-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },

    { id: 'word-to-pdf', category: 'Convertir vers PDF', label: 'Word → PDF', description: 'Convertissez vos documents DOCX en PDF parfait.', icon: 'document-text-outline', endpoint: '/convert/word-to-pdf', mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], outputExt: 'pdf' },
    { id: 'pptx-to-pdf', category: 'Convertir vers PDF', label: 'PPTX → PDF', description: 'Transformez vos présentations en PDF.', icon: 'easel-outline', endpoint: '/convert/pptx-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], outputExt: 'pdf' },
    { id: 'excel-to-pdf', category: 'Convertir vers PDF', label: 'Excel → PDF', description: 'Convertissez vos feuilles de calcul en PDF.', icon: 'grid-outline', endpoint: '/convert/excel-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], outputExt: 'pdf' },
    { id: 'image-to-pdf', category: 'Convertir vers PDF', label: 'JPG → PDF', description: 'Transformez vos photos et images en document PDF.', icon: 'images-outline', endpoint: '/convert/image-to-pdf', mimeTypes: ['image/*'], outputExt: 'pdf', multiple: true },
    { id: 'html-to-pdf', category: 'Convertir vers PDF', label: 'HTML → PDF', description: 'Convertissez des pages web en fichiers PDF.', icon: 'globe-outline', endpoint: '/convert/html-to-pdf', mimeTypes: ['text/html'], outputExt: 'pdf' },
    { id: 'pages-to-pdf', category: 'Convertir vers PDF', label: 'Pages → PDF', description: 'Convertissez les documents Apple Pages.', icon: 'document-text-outline', endpoint: '/convert/pages-to-pdf', mimeTypes: ['application/vnd.apple.pages'], outputExt: 'pdf' },
    { id: 'keynote-to-pdf', category: 'Convertir vers PDF', label: 'Keynote → PDF', description: 'Convertissez les présentations Apple Keynote.', icon: 'easel-outline', endpoint: '/convert/keynote-to-pdf', mimeTypes: ['application/vnd.apple.keynote'], outputExt: 'pdf' },
    { id: 'numbers-to-pdf', category: 'Convertir vers PDF', label: 'Numbers → PDF', description: 'Convertissez les tableaux Apple Numbers.', icon: 'grid-outline', endpoint: '/convert/numbers-to-pdf', mimeTypes: ['application/vnd.apple.numbers'], outputExt: 'pdf' },
    { id: 'txt-to-pdf', category: 'Convertir vers PDF', label: 'TXT → PDF', description: 'Convertissez de simples fichiers texte.', icon: 'document-text-outline', endpoint: '/convert/txt-to-pdf', mimeTypes: ['text/plain'], outputExt: 'pdf' },

    { id: 'pdf-to-word', category: 'Convertir depuis PDF', label: 'PDF → Word', description: 'Rendez vos PDF éditables sur Microsoft Word.', icon: 'document-outline', endpoint: '/convert/pdf-to-word', mimeTypes: ['application/pdf'], outputExt: 'docx' },
    { id: 'pdf-to-pptx', category: 'Convertir depuis PDF', label: 'PDF → PPTX', description: 'Générez des diapositives à partir de vos PDF.', icon: 'easel-outline', endpoint: '/convert/pdf-to-pptx', mimeTypes: ['application/pdf'], outputExt: 'pptx' },
    { id: 'pdf-to-excel', category: 'Convertir depuis PDF', label: 'PDF → Excel', description: 'Extrayez les données de vos PDF vers Excel.', icon: 'grid-outline', endpoint: '/convert/pdf-to-excel', mimeTypes: ['application/pdf'], outputExt: 'xlsx' },
    { id: 'pdf-to-image', category: 'Convertir depuis PDF', label: 'PDF → JPG', description: 'Convertissez chaque page en image de haute qualité.', icon: 'image-outline', endpoint: '/convert/pdf-to-image', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'pdf-to-txt', category: 'Convertir depuis PDF', label: 'PDF → TXT', description: 'Extrayez tout le texte brut d\'un PDF.', icon: 'document-text-outline', endpoint: '/convert/pdf-to-txt', mimeTypes: ['application/pdf'], outputExt: 'txt' },

    { id: 'heic-to-jpg', category: 'Outils d\'Images', label: 'HEIC → JPG', description: 'Convertissez les photos d\'iPhone au format JPG.', icon: 'logo-apple', endpoint: '/convert/heic-to-jpg', mimeTypes: ['image/heic', 'image/heif'], outputExt: 'jpg' },
    { id: 'jpg-to-png', category: 'Outils d\'Images', label: 'JPG → PNG', description: 'Passez d\'une image compressée à un format PNG.', icon: 'image-outline', endpoint: '/convert/jpg-to-png', mimeTypes: ['image/jpeg'], outputExt: 'png' },
    { id: 'png-to-jpg', category: 'Outils d\'Images', label: 'PNG → JPG', description: 'Réduisez le poids de vos PNG avec le JPG.', icon: 'image-outline', endpoint: '/convert/png-to-jpg', mimeTypes: ['image/png'], outputExt: 'jpg' },
    { id: 'compress-image', category: 'Outils d\'Images', label: 'Compresser Image', description: 'Optimisez vos images pour réduire leur poids.', icon: 'contract-outline', endpoint: '/convert/compress-image', mimeTypes: ['image/*'], outputExt: 'jpg' },
];

const MEDIA_TOOLS = [
    { id: 'mp4-to-mp3', category: 'Outils Vidéo', label: 'Vidéo → Audio', description: 'Extrayez le son (MP3) de n\'importe quelle vidéo.', icon: 'musical-notes-outline', endpoint: '/convert/mp4-to-mp3', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'mp3' },
    { id: 'mp4-to-gif', category: 'Outils Vidéo', label: 'Vidéo → GIF', description: 'Créez une image animée GIF à partir d\'une vidéo.', icon: 'images-outline', endpoint: '/convert/mp4-to-gif', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'gif' },
    { id: 'compress-video', category: 'Outils Vidéo', label: 'Compresser Vidéo', description: 'Réduisez la taille de vos vidéos très lourdes.', icon: 'contract-outline', endpoint: '/convert/compress-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'trim-video', category: 'Outils Vidéo', label: 'Couper Vidéo', description: 'Conservez uniquement le meilleur passage.', icon: 'cut-outline', endpoint: '/convert/trim-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    
    { id: 'compress-audio', category: 'Outils Audio', label: 'Compresser Audio', description: 'Diminuez la taille d\'un fichier son.', icon: 'contract-outline', endpoint: '/convert/compress-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'trim-audio', category: 'Outils Audio', label: 'Couper Audio', description: 'Découpez vos musiques et mémos vocaux.', icon: 'cut-outline', endpoint: '/convert/trim-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'merge-audio', category: 'Outils Audio', label: 'Fusionner Audios', description: 'Rassemblez plusieurs pistes audio en une seule.', icon: 'git-merge-outline', endpoint: '/convert/merge-audio', mimeTypes: ['audio/*'], outputExt: 'mp3', multiple: true },
    { id: 'wav-to-mp3', category: 'Outils Audio', label: 'WAV → MP3', description: 'Passez du format sans perte au format léger MP3.', icon: 'musical-notes-outline', endpoint: '/convert/wav-to-mp3', mimeTypes: ['audio/wav', 'audio/x-wav'], outputExt: 'mp3' },
    { id: 'mp3-to-wav', category: 'Outils Audio', label: 'MP3 → WAV', description: 'Convertissez vos musiques vers un format WAV.', icon: 'musical-note-outline', endpoint: '/convert/mp3-to-wav', mimeTypes: ['audio/mpeg'], outputExt: 'wav' },
];

export default function ConvertScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    // Ajout de l'état "tool_intro"
    const [step, setStep] = useState<'menu' | 'tool_intro' | 'staging' | 'split_editor' | 'sign_choice' | 'pdf_editor' | 'watermark_editor' | 'rotation_editor' | 'organize_editor' | 'merge_editor' | 'preparing_editor' | 'processing' | 'done'>('menu');
    const [localError, setLocalError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'files' | 'media'>('files');
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [resultFiles, setResultFiles] = useState<{name: string, url: string}[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const [pageCount, setPageCount] = useState<number>(0);
    const [splitPoints, setSplitPoints] = useState<number[]>([]);
    const [splitInterval, setSplitInterval] = useState<number>(1);
    const [splitTab, setSplitTab] = useState<'split' | 'extract'>('split');
    const [extractedPages, setExtractedPages] = useState<number[]>([]);
    
    // Compression state
    const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('recommended');
    
    // Premium UI states
    const [pdfPassword, setPdfPassword] = useState('');
    const [pdfOriginalBuffer, setPdfOriginalBuffer] = useState<ArrayBuffer | null>(null);
    const [watermarkConfig, setWatermarkConfig] = useState<WatermarkSettings | null>(null);
    const [conversionQuality, setConversionQuality] = useState<ConversionQuality>('standard');
    const [numberingConfig, setNumberingConfig] = useState<NumberingConfig>({ position: 'bottom-center', format: 'total' });
    const [ocrLang, setOcrLang] = useState<OcrLanguage>('fra');
    
    const [pdfDocRef, setPdfDocRef] = useState<any>(null);
    const [isSplitting, setIsSplitting] = useState(false);
    
    // PdfEditor states
    const [pdfEditorPages, setPdfEditorPages] = useState<string[]>([]);
    const [organizePages, setOrganizePages] = useState<OrganizePageItem[]>([]);
    const [organizeFiles, setOrganizeFiles] = useState<any[]>([]);

    const currentRenderSession = useRef<number>(0);

    const cancelTool = (targetStep: string = 'tool_intro') => {
        setStep(targetStep as any);
        setPdfDocRef(null);
        setOrganizePages([]);
        setOrganizeFiles([]);
        setSelectedFiles([]);
        setExtractedPages([]);
        setSplitPoints([]);
        setSplitTab('split');
        setSplitInterval(1);
        setResultFiles([]);
        setLocalError(null);
        currentRenderSession.current += 1;
    };

    // initSplitPDF removed in favor of initOrganizeEditor

    const initPdfEditor = async (file: any, targetStep: string = 'pdf_editor') => {
        setStep('preparing_editor');
        try {
            // 1. Lire le buffer original
            let arrayBuffer: ArrayBuffer;
            if (Platform.OS === 'web' && file.file) {
                arrayBuffer = await file.file.arrayBuffer();
            } else {
                const response = await fetch(file.uri);
                arrayBuffer = await response.arrayBuffer();
            }
            setPdfOriginalBuffer(arrayBuffer);

            // 2. Envoyer au backend pour générer les images des pages
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
                headers: {
                    'Accept': 'application/zip, image/jpeg'
                }
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error("Échec de la génération des images: " + errText);
            }

            const contentType = res.headers.get('content-type');
            const blob = await res.blob();
            const pages: string[] = [];

            if (contentType?.includes('zip')) {
                const zip = new JSZip();
                const unzipped = await zip.loadAsync(blob);
                const fileNames = Object.keys(unzipped.files).sort(); // Sort by name to keep page order
                for (const filename of fileNames) {
                    const f = unzipped.files[filename];
                    if (!f.dir) {
                        const imgBlob = await f.async('blob');
                        pages.push(URL.createObjectURL(imgBlob));
                    }
                }
            } else {
                // Single page
                pages.push(URL.createObjectURL(blob));
            }

            setPdfEditorPages(pages);
            setStep(targetStep as any);
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

            // Embed fonts
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
                            // Si c'est une URI locale (ImagePicker), on charge via fetch
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

    const initOrganizeEditor = async (files: any[], appendToExisting = false, targetStep: string = 'organize_editor') => {
        try {
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
                    id: `${fileIndex}-0-${Date.now()}`,
                    fileIndex: fileIndex,
                    fileName: file.name,
                    pageIndex: 0,
                    imageUri: null as any
                });
            }

            setOrganizeFiles(newOrganizeFiles);
            setOrganizePages(newOrganizePages);
            if (!appendToExisting) setStep(targetStep as any);

            // 2. PROCESS ASYNC IN BACKGROUND
            files.forEach((file, i) => {
                const fileIndex = startIndex + i;
                
                setTimeout(async () => {
                    try {
                        let arrayBuffer: ArrayBuffer;
                        if (Platform.OS === 'web' && file.file) {
                            arrayBuffer = await file.file.arrayBuffer();
                        } else {
                            const response = await fetch(file.uri);
                            arrayBuffer = await response.arrayBuffer();
                        }
                        
                        // Update buffer in state
                        setOrganizeFiles(prev => {
                            const next = [...prev];
                            const target = next.find(f => f.originalIndex === fileIndex);
                            if (target) target.buffer = arrayBuffer;
                            return next;
                        });

                        if (Platform.OS === 'web') {
                            try {
                                const pdfjsLib = await loadPdfJs();
                                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                                const pdf = await loadingTask.promise;
                                
                                setOrganizeFiles(prev => {
                                    const next = [...prev];
                                    const target = next.find(f => f.originalIndex === fileIndex);
                                    if (target) target.pageCount = pdf.numPages;
                                    return next;
                                });
                                
                                if (pdf.numPages >= 1) {
                                    if (sessionId !== currentRenderSession.current) return;
                                    
                                    setOrganizePages(prev => {
                                        const next = [...prev];
                                        const newSkeletons = [];
                                        for (let j = 0; j < pdf.numPages; j++) {
                                            newSkeletons.push({
                                                id: `${fileIndex}-${j}-${Date.now()}`,
                                                fileIndex: fileIndex,
                                                fileName: file.name,
                                                pageIndex: j,
                                                imageUri: null as any
                                            });
                                        }
                                        const targetIndex = next.findIndex(p => p.fileIndex === fileIndex);
                                        if (targetIndex !== -1) {
                                            let count = 0;
                                            while (next[targetIndex + count]?.fileIndex === fileIndex) count++;
                                            next.splice(targetIndex, count, ...newSkeletons);
                                        } else {
                                            next.push(...newSkeletons);
                                        }
                                        return next;
                                    });

                                    const page = await pdf.getPage(1);
                                    const viewport = page.getViewport({ scale: 1.0 });
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    canvas.width = viewport.width;
                                    canvas.height = viewport.height;
                                    if (ctx) {
                                        await page.render({ canvasContext: ctx, viewport }).promise;
                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                        
                                        if (sessionId === currentRenderSession.current) {
                                            setOrganizePages(prev => {
                                                const next = [...prev];
                                                const target = next.find(p => p.fileIndex === fileIndex && p.pageIndex === 0);
                                                if (target) target.imageUri = dataUrl;
                                                return next;
                                            });
                                        }
                                    }
                                }

                                if (pdf.numPages > 1) {
                                    for (let j = 2; j <= pdf.numPages; j++) {
                                        if (sessionId !== currentRenderSession.current) break;
                                        try {
                                            const page = await pdf.getPage(j);
                                            const viewport = page.getViewport({ scale: 1.0 });
                                            const canvas = document.createElement('canvas');
                                            const ctx = canvas.getContext('2d');
                                            canvas.width = viewport.width;
                                            canvas.height = viewport.height;
                                            if (ctx) {
                                                await page.render({ canvasContext: ctx, viewport }).promise;
                                                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                                
                                                if (sessionId === currentRenderSession.current) {
                                                    setOrganizePages(prev => {
                                                        const next = [...prev];
                                                        const target = next.find(p => p.fileIndex === fileIndex && p.pageIndex === j - 1);
                                                        if (target) target.imageUri = dataUrl;
                                                        return next;
                                                    });
                                                }
                                            }
                                        } catch (e) {
                                            console.warn('Async thumbnail error', e);
                                        }
                                    }
                                }
                            } catch (localError) {
                                console.warn("Local PDF.js rendering failed", localError);
                            }
                        } else {
                            // Fallback backend for Mobile
                            try {
                                const tempDoc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
                                const numPages = tempDoc.getPageCount();
                                
                                setOrganizePages(prev => {
                                    const next = [...prev];
                                    const newSkeletons = [];
                                    for (let j = 0; j < numPages; j++) {
                                        newSkeletons.push({
                                            id: `${fileIndex}-${j}-${Date.now()}`,
                                            fileIndex: fileIndex,
                                            fileName: file.name,
                                            pageIndex: j,
                                            imageUri: null as any
                                        });
                                    }
                                    const targetIndex = next.findIndex(p => p.fileIndex === fileIndex);
                                    if (targetIndex !== -1) {
                                        let count = 0;
                                        while (next[targetIndex + count]?.fileIndex === fileIndex) count++;
                                        next.splice(targetIndex, count, ...newSkeletons);
                                    } else {
                                        next.push(...newSkeletons);
                                    }
                                    return next;
                                });
                            } catch (e) {
                                console.warn("Failed to read page count locally for mobile", e);
                            }

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

                            if (!res.ok) {
                                throw new Error(`Erreur backend: ${res.status}`);
                            }

                            const contentType = res.headers.get('content-type');
                            const blob = await res.blob();

                            if (contentType?.includes('zip')) {
                                const zip = new JSZip();
                                const unzipped = await zip.loadAsync(blob);
                                const fileNames = Object.keys(unzipped.files).sort();
                                for (let j = 0; j < fileNames.length; j++) {
                                    const filename = fileNames[j];
                                    const f = unzipped.files[filename];
                                    if (!f.dir) {
                                        const imgBlob = await f.async('blob');
                                        if (sessionId === currentRenderSession.current) {
                                            setOrganizePages(prev => {
                                                const next = [...prev];
                                                const target = next.find(p => p.fileIndex === fileIndex && p.pageIndex === j);
                                                if (target) {
                                                    target.imageUri = URL.createObjectURL(imgBlob);
                                                } else {
                                                    next.push({
                                                        id: `${fileIndex}-${j}-${Date.now()}`,
                                                        fileIndex: fileIndex,
                                                        fileName: file.name,
                                                        pageIndex: j,
                                                        imageUri: URL.createObjectURL(imgBlob)
                                                    });
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
                                        const target = next.find(p => p.fileIndex === fileIndex && p.pageIndex === 0);
                                        if (target) target.imageUri = URL.createObjectURL(blob);
                                        return next;
                                    });
                                }
                            }
                        }
                    } catch (fileError: any) {
                        console.error(`Erreur pour le fichier ${file.name}:`, fileError);
                    }
                }, 50 * i);
            });
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

                for (const pageItem of orderedPages) {
                    // Find the correct source doc buffer
                    const sourceFileInfo = organizeFiles.find(f => f.originalIndex === pageItem.fileIndex);
                    if (sourceFileInfo) {
                        let buffer = sourceFileInfo.buffer;
                        if (!buffer) {
                            const originalFile = selectedFiles.find((_, i) => i === pageItem.fileIndex);
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
                            const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageItem.pageIndex]);
                            newPdfDoc.addPage(copiedPage);
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

    const handleAddFilesToOrganize = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: false,
                multiple: true
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                setSelectedFiles(prev => [...prev, ...res.assets]);
                await initOrganizeEditor(res.assets, true);
            }
        } catch (e) {
            console.error("Error picking additional files", e);
        }
    };

    const onDragStart = (e: any, index: number) => {
        setDraggedIndex(index);
        const dataTransfer = e.dataTransfer || (e.nativeEvent && e.nativeEvent.dataTransfer);
        if (dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', index.toString());
        }
    };

    const onDragOver = (e: any, index: number) => {
        e.preventDefault();
        const dataTransfer = e.dataTransfer || (e.nativeEvent && e.nativeEvent.dataTransfer);
        if (dataTransfer) {
            dataTransfer.dropEffect = 'move';
        }
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const onDragLeave = (e: any, index: number) => {
        if (dragOverIndex === index) {
            setDragOverIndex(null);
        }
    };

    const onDrop = (e: any, index: number) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (draggedIndex === null || draggedIndex === index) return;
        
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            const draggedFile = newFiles[draggedIndex];
            const targetFile = newFiles[index];
            newFiles[index] = draggedFile;
            newFiles[draggedIndex] = targetFile;
            return newFiles;
        });
        setDraggedIndex(null);
    };

    const onDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleSplitPDF = async () => {
        if (organizeFiles.length === 0) return;
        
        if (splitTab === 'extract' && extractedPages.length === 0) {
            setLocalError("Veuillez sélectionner au moins une page à extraire.");
            return;
        }
        
        setIsSplitting(true);
        setLocalError(null);
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
                const pagesToCopy = [...extractedPages].sort((a, b) => a - b);
                
                for (const pageIdx of pagesToCopy) {
                    const pageItem = organizePages[pageIdx];
                    const sourceDoc = sourceDocs.get(pageItem.fileIndex);
                    
                    if (sourceDoc) {
                        const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageItem.pageIndex]);
                        newDoc.addPage(copiedPage);
                    }
                    await new Promise(r => setTimeout(r, 10));
                }
                
                const pdfBytes = await newDoc.save();
                
                if (Platform.OS === 'web') {
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    setResultUrl(URL.createObjectURL(blob));
                }
                setFileName('document_extrait');
                
            } else {
                const zip = new JSZip();
                let currentDoc = await PDFDocument.create();
                let docIndex = 1;
                const generatedFiles: {name: string, url: string}[] = [];

                const totalPages = organizePages.length;
                
                for (let i = 0; i < totalPages; i++) {
                    const pageItem = organizePages[i];
                    const sourceDoc = sourceDocs.get(pageItem.fileIndex);
                    
                    if (sourceDoc) {
                        const [copiedPage] = await currentDoc.copyPages(sourceDoc, [pageItem.pageIndex]);
                        currentDoc.addPage(copiedPage);
                    }

                    if (splitPoints.includes(i) || i === totalPages - 1) {
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
                        
                        if (i < totalPages - 1) {
                            currentDoc = await PDFDocument.create();
                            docIndex++;
                        }
                    }
                    await new Promise(r => setTimeout(r, 10));
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
    };

    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        
        return () => subscription.unsubscribe();
    }, []);

    const handleServicePress = (service: any) => {
        setSelectedService(service);
        setStep('tool_intro');
    };

    const handleSelectFiles = async (append: boolean = false) => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: selectedService.mimeTypes,
                copyToCacheDirectory: true,
                multiple: selectedService.multiple || false,
            });

            if (res.canceled) return;
            
            if (append) {
                setSelectedFiles(prev => [...prev, ...res.assets]);
            } else {
                setSelectedFiles(res.assets);
                if (selectedService.id === 'split-pdf') {
                    initOrganizeEditor(res.assets, false, 'split_editor');
                    setSplitPoints([]);
                } else if (selectedService.id === 'sign-pdf') {
                    setStep('sign_choice');
                } else if (selectedService.id === 'edit-pdf') {
                    initPdfEditor(res.assets[0]);
                } else if (selectedService.id === 'watermark-pdf') {
                    initPdfEditor(res.assets[0], 'watermark_editor');
                } else if (selectedService.id === 'rotate-pdf') {
                    initPdfEditor(res.assets[0], 'rotation_editor');
                } else if (selectedService.id === 'protect-pdf') {
                    initPdfEditor(res.assets[0], 'protect_editor');
                } else if (selectedService.id === 'organize-pdf') {
                    initOrganizeEditor(res.assets, false, 'organize_editor');
                } else if (selectedService.id === 'merge-pdf') {
                    initOrganizeEditor(res.assets, false, 'merge_editor');
                } else {
                    setStep('staging');
                }
            }
        } catch (error) {
            Alert.alert(t('common.error'), "Impossible d'ajouter les fichiers.");
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const processFiles = async (passwordOverride?: string, filesOverride?: any[]) => {
        const targetFiles = filesOverride || selectedFiles;
        if (targetFiles.length === 0) return;
        
        setStep('processing');
        
        let baseName = targetFiles[0].name.split('.').slice(0, -1).join('.');
        if (targetFiles.length > 1 && selectedService.id === 'merge-pdf') {
            baseName = 'document_fusionne';
        } else {
            baseName += '_converti';
        }
        setFileName(baseName);

        try {
            const formData = new FormData();
            
            for (let i = 0; i < targetFiles.length; i++) {
                const file = targetFiles[i];
                let blob;
                if (Platform.OS === 'web' && file.file) {
                    blob = file.file;
                } else {
                    const response_file = await fetch(file.uri);
                    blob = await response_file.blob();
                }
                
                const fieldName = selectedService.multiple ? 'files' : 'file';
                formData.append(fieldName, blob, file.name);
                
                if (!selectedService.multiple) break; 
            }

            if (selectedService.id === 'protect-pdf') {
                formData.append('password', passwordOverride || pdfPassword || 'faas2024');
            }
            if (selectedService.id === 'compress-pdf') {
                formData.append('compressionLevel', compressionLevel);
            }
            if (selectedService.id === 'number-pdf') {
                formData.append('position', numberingConfig.position);
                formData.append('format', numberingConfig.format);
            }
            if (selectedService.id === 'ocr-pdf') {
                formData.append('lang', ocrLang);
            }
            if (selectedService.id === 'pdf-to-image' || selectedService.id === 'image-to-pdf') {
                formData.append('quality', conversionQuality);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 secondes de timeout (pour Render)

            const response = await fetch(`${SERVER_URL}${selectedService.endpoint}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('NotImplemented');
                }
                throw new Error('Erreur serveur');
            }

            const resultBlob = await response.blob();
            const url = URL.createObjectURL(resultBlob);
            setResultUrl(url);
            setStep('done');

        } catch (error: any) {
            let errorMsg = 'Le traitement a échoué. Vérifiez vos fichiers et réessayez.';
            if (error.name === 'AbortError' || (error.message && error.message.includes('aborted'))) {
                errorMsg = 'Le serveur (hébergement gratuit) met trop de temps à répondre pour ce fichier lourd. Le délai a expiré.';
            } else if (error.message === 'NotImplemented') {
                errorMsg = 'Cette fonctionnalité est en cours de développement et sera disponible prochainement !';
            }

            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert(t('common.error'), errorMsg);
            }
            setStep('staging');
        }
    };

    const downloadResult = async () => {
        if (Platform.OS === 'web') {
            const a = document.createElement('a');
            a.href = resultUrl;
            const ext = (selectedService?.id === 'split-pdf' && splitTab === 'extract') ? 'pdf' : (selectedService?.outputExt || 'zip');
            a.download = `${fileName}.${ext}`;
            a.click();
            URL.revokeObjectURL(resultUrl);
        } else {
            if (await shareAsync) {
                await shareAsync(resultUrl);
            }
        }
    };

    const goBackToMenu = () => {
        cancelTool('tool_intro');
    };

    const reset = () => {
        setStep('menu');
        setSelectedService(null);
        setSelectedFiles([]);
        setFileName('');
        setResultUrl('');
        setResultFiles([]);
        cancelTool('menu');
    };

    if (step === 'menu') {
        const toolsToDisplay = activeTab === 'files' ? FILE_TOOLS : MEDIA_TOOLS;
        const filteredTools = toolsToDisplay.filter(c => 
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const groupedTools = filteredTools.reduce((acc, tool) => {
            const cat = tool.category || 'Autres';
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(tool);
            return acc;
        }, {} as Record<string, typeof FILE_TOOLS>);

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.contentWrapper}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.backButton,
                                (pressed || hovered) && styles.backButtonHovered,
                                { position: 'relative', top: 0, left: 0 }
                            ]}
                            onPress={() => router.push('/')}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>{t('common.back')}</Text>
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Outils de Conversion</Text>
                            <Text style={styles.subtitle}>Sélectionnez l'outil dont vous avez besoin</Text>
                            
                            <View style={styles.searchContainer}>
                                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Chercher un outil (ex: pdf, mp3, fusion...)"
                                    placeholderTextColor={colors.textMuted}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <Pressable onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                    </Pressable>
                                )}
                            </View>

                            <View style={styles.tabsContainer}>
                                <Pressable 
                                    style={[styles.tabButton, activeTab === 'files' && styles.activeTabButton]}
                                    onPress={() => setActiveTab('files')}>
                                    <Ionicons name="document-text-outline" size={16} color={activeTab === 'files' ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                                    <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>Manipulation Fichiers</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.tabButton, activeTab === 'media' && styles.activeTabButton]}
                                    onPress={() => setActiveTab('media')}>
                                    <Ionicons name="musical-notes-outline" size={16} color={activeTab === 'media' ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                                    <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Vidéo & Audio</Text>
                                </Pressable>
                            </View>
                        </View>

                        {Object.entries(groupedTools).length > 0 && (
                            <View style={{ width: '100%', maxWidth: 1000, alignItems: 'center' }}>
                                {Object.entries(groupedTools).map(([category, tools]) => (
                                    <View key={category} style={{ width: '100%', marginBottom: 40 }}>
                                        <Text style={styles.groupTitle}>{category}</Text>
                                        <View style={styles.grid}>
                                            {tools.map((service) => (
                                                <ActionCard
                                                    key={service.id}
                                                    title={service.label}
                                                    description={service.description}
                                                    icon={service.icon as any}
                                                    onPress={() => handleServicePress(service)}
                                                    style={styles.serviceCard}
                                                    compact={false}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                        
                        {Object.entries(groupedTools).length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                                <Text style={[styles.subtitle, { marginTop: 16 }]}>Aucun outil trouvé</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'tool_intro') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.contentWrapper}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.backButton,
                                (pressed || hovered) && styles.backButtonHovered,
                                { position: 'relative', top: 0, left: 0 }
                            ]}
                            onPress={reset}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>Retour aux outils</Text>
                        </Pressable>
                    </View>

                    <View style={styles.centerContent}>
                        <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name={selectedService.icon as any} size={50} color={colors.primary} />
                        </View>
                        
                        <Text style={styles.title}>{selectedService.label}</Text>
                        <Text style={[styles.subtitle, { maxWidth: 500, marginBottom: 40, fontSize: 18, lineHeight: 28 }]}>
                            {selectedService.description}
                        </Text>

                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.hugePrimaryButton,
                                (pressed || hovered) && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                            ]} 
                            onPress={() => handleSelectFiles(false)}>
                            <Ionicons name="add-circle-outline" size={28} color="#ffffff" />
                            <Text style={styles.hugePrimaryButtonText}>Choisir les fichiers</Text>
                        </Pressable>
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 16 }}>
                            Tous vos fichiers sont supprimés de nos serveurs après 1 heure.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
    
    if (step === 'split_editor') {
        const resultCount = splitPoints.length + 1;
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.contentWrapper}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.backButton,
                                (pressed || hovered) && styles.backButtonHovered,
                                { position: 'relative', top: 0, left: 0 }
                            ]}
                            onPress={() => { setStep('tool_intro'); setPdfDocRef(null); }}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>Annuler</Text>
                        </Pressable>

                        {/* TABS: Diviser vs Extraire */}
                        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 4 }}>
                            <Pressable 
                                onPress={() => setSplitTab('split')}
                                style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: splitTab === 'split' ? colors.primary : 'transparent' }}>
                                <Text style={{ color: splitTab === 'split' ? '#fff' : colors.textMuted, fontWeight: '600' }}>✂️ Diviser</Text>
                            </Pressable>
                            <Pressable 
                                onPress={() => setSplitTab('extract')}
                                style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: splitTab === 'extract' ? colors.primary : 'transparent' }}>
                                <Text style={{ color: splitTab === 'extract' ? '#fff' : colors.textMuted, fontWeight: '600' }}>✅ Extraire</Text>
                            </Pressable>
                        </View>

                        {splitTab === 'split' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ color: colors.textMuted, marginRight: 12 }}>Diviser toutes les</Text>
                                <Pressable 
                                    onPress={() => {
                                        const newInt = Math.max(1, splitInterval - 1);
                                        setSplitInterval(newInt);
                                        const newPoints = [];
                                        for (let i = newInt - 1; i < organizePages.length - 1; i += newInt) newPoints.push(i);
                                        setSplitPoints(newPoints);
                                    }}
                                    style={({hovered}: any) => [{ padding: 8 }, hovered && { opacity: 0.7 }]}
                                >
                                    <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                                </Pressable>
                                <TextInput 
                                    value={splitInterval ? String(splitInterval) : ''}
                                    onChangeText={(val) => {
                                        const cleanVal = val.replace(/[^0-9]/g, '');
                                        if (cleanVal === '') {
                                            setSplitInterval('' as any);
                                            setSplitPoints([]);
                                            return;
                                        }
                                        const newInt = parseInt(cleanVal);
                                        if (!isNaN(newInt)) {
                                            // Allow free typing, only prevent 0 or negative
                                            const validInt = Math.max(1, newInt);
                                            setSplitInterval(validInt);
                                            const newPoints = [];
                                            for (let i = validInt - 1; i < organizePages.length - 1; i += validInt) newPoints.push(i);
                                            setSplitPoints(newPoints);
                                        }
                                    }}
                                    keyboardType="numeric"
                                    style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginHorizontal: 8, minWidth: 40, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}
                                />
                                <Pressable 
                                    onPress={() => {
                                        const newInt = Math.min(organizePages.length, splitInterval + 1);
                                        setSplitInterval(newInt);
                                        const newPoints = [];
                                        for (let i = newInt - 1; i < organizePages.length - 1; i += newInt) newPoints.push(i);
                                        setSplitPoints(newPoints);
                                    }}
                                    style={({hovered}: any) => [{ padding: 8 }, hovered && { opacity: 0.7 }]}
                                >
                                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                                </Pressable>
                                <Text style={{ color: colors.textMuted, marginLeft: 12 }}>pages</Text>
                            </View>
                        )}
                        
                        {splitTab === 'extract' && <View style={{ width: 100 }} />} {/* Spacer */}

                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                { 
                                    backgroundColor: (splitTab === 'extract' && extractedPages.length === 0) ? colors.border : colors.primary, 
                                    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' 
                                },
                                (pressed || hovered) && { opacity: 0.8 }
                            ]}
                            disabled={splitTab === 'extract' && extractedPages.length === 0}
                            onPress={handleSplitPDF}>
                            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                                {isSplitting ? 'Création...' : (splitTab === 'split' ? `Diviser (${splitPoints.length + 1} PDF)` : `Extraire (${extractedPages.length} pages)`)}
                            </Text>
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingTop: 100 }]}>
                        {localError && (
                            <View style={{ backgroundColor: colors.danger + '20', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                                <Text style={{ color: colors.danger, textAlign: 'center' }}>{localError}</Text>
                            </View>
                        )}
                        
                        <View style={{ alignItems: 'center', marginBottom: 40 }}>
                            <Text style={styles.title}>{splitTab === 'split' ? 'Diviser le PDF' : 'Extraire des pages'}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>
                                {splitTab === 'split' ? 'Cliquez sur les ciseaux pour séparer les pages.' : 'Cochez les pages que vous souhaitez conserver.'}
                            </Text>
                        </View>

                        <View style={{ width: '100%', maxWidth: 1200, flexDirection: 'row', flexWrap: 'wrap', gap: splitTab === 'extract' ? 20 : 0, justifyContent: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
                            {organizePages.map((page, index) => {
                                const hasCutAfter = splitTab === 'split' && splitPoints.includes(index);
                                const isExtracted = splitTab === 'extract' && extractedPages.includes(index);
                                
                                return (
                                    <View key={page.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Pressable 
                                                onPress={() => {
                                                    if (splitTab === 'extract') {
                                                        setExtractedPages(prev => prev.includes(index) ? prev.filter(p => p !== index) : [...prev, index]);
                                                    }
                                                }}
                                                style={{
                                                    width: 180, 
                                                    height: 240, 
                                                    backgroundColor: colors.card, 
                                                    borderRadius: 12, 
                                                    borderWidth: splitTab === 'extract' ? 2 : 1, 
                                                    borderColor: isExtracted ? colors.primary : colors.border,
                                                    overflow: 'hidden',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    opacity: (splitTab === 'extract' && !isExtracted) ? 0.7 : 1
                                                }}>
                                                {page.imageUri ? (
                                                    <Image source={{ uri: page.imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                                ) : (
                                                    <ActivityIndicator size="small" color="#4F46E5" />
                                                )}
                                                
                                                {/* Checkbox Overlay for Extract Mode */}
                                                {splitTab === 'extract' && (
                                                    <View style={{
                                                        position: 'absolute',
                                                        top: 10, left: 10,
                                                        width: 24, height: 24,
                                                        borderRadius: 12,
                                                        backgroundColor: isExtracted ? colors.primary : 'rgba(0,0,0,0.5)',
                                                        borderWidth: 2,
                                                        borderColor: isExtracted ? colors.primary : '#fff',
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}>
                                                        {isExtracted && <Ionicons name="checkmark" size={16} color="#fff" />}
                                                    </View>
                                                )}
                                            </Pressable>
                                            <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}>Page {index + 1}</Text>
                                            </View>
                                        </View>

                                        {splitTab === 'split' && index < organizePages.length - 1 && (
                                            <Pressable 
                                                onPress={() => {
                                                    setSplitPoints(prev => 
                                                        prev.includes(index) 
                                                            ? prev.filter(i => i !== index)
                                                            : [...prev, index].sort((a,b) => a - b)
                                                    );
                                                }}
                                                style={({ hovered }: any) => [
                                                    { 
                                                        width: 40,
                                                        height: 260,
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginHorizontal: 4,
                                                    }
                                                ]}
                                            >
                                                {/* Vertical line container */}
                                                <View style={{
                                                    position: 'absolute',
                                                    width: 2,
                                                    height: '100%',
                                                    backgroundColor: hasCutAfter ? colors.primary : 'transparent',
                                                    borderLeftWidth: hasCutAfter ? 0 : 2,
                                                    borderColor: colors.border,
                                                    borderStyle: hasCutAfter ? 'solid' : 'dashed',
                                                }} />
                                                
                                                {/* Scissor icon bubble */}
                                                <View style={{
                                                    backgroundColor: hasCutAfter ? colors.primary : colors.card,
                                                    borderRadius: 20,
                                                    padding: 6,
                                                    borderWidth: 1,
                                                    borderColor: hasCutAfter ? colors.primary : colors.border,
                                                    zIndex: 2,
                                                }}>
                                                    <Ionicons name="cut-outline" size={18} color={hasCutAfter ? '#fff' : colors.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
                                                </View>
                                            </Pressable>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }
    
    if (step === 'sign_choice') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.contentWrapper}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.backButton,
                                (pressed || hovered) && styles.backButtonHovered,
                                { position: 'relative', top: 0, left: 0 }
                            ]}
                            onPress={reset}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>Annuler</Text>
                        </Pressable>
                    </View>

                    <View style={[styles.scrollContent, { flex: 1, justifyContent: 'center' }]}>
                        <View style={{ backgroundColor: colors.card, padding: 40, borderRadius: 24, borderWidth: 1, borderColor: colors.border, width: '100%', maxWidth: 500, alignItems: 'center' }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                <Ionicons name="pencil-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.title, { fontSize: 28, marginBottom: 12 }]}>Qui va signer ce document ?</Text>
                            <Text style={[styles.subtitle, { marginBottom: 32 }]}>Choisissez si vous devez signer vous-même le document ou le faire signer par d'autres personnes.</Text>
                            
                            <View style={{ width: '100%', gap: 16 }}>
                                <Pressable 
                                    style={({ hovered, pressed }) => [
                                        { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary },
                                        hovered && { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
                                        pressed && { opacity: 0.8 }
                                    ]}
                                    onPress={() => initPdfEditor(selectedFiles[0])}
                                >
                                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                        <Ionicons name="person-outline" size={24} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Uniquement moi</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 14 }}>J'ajoute ma propre signature.</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                                </Pressable>

                                <Pressable 
                                    style={({ hovered, pressed }) => [
                                        { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
                                        hovered && { borderColor: colors.textMuted },
                                        pressed && { opacity: 0.8 }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS === 'web') window.alert("La demande de signature à des tiers sera bientôt disponible !");
                                        else Alert.alert("Bientôt disponible", "La demande de signature à des tiers sera bientôt disponible !");
                                    }}
                                >
                                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cardHovered, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                        <Ionicons name="people-outline" size={24} color={colors.text} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Plusieurs personnes</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Je demande des signatures à d'autres.</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
    
    if (step === 'staging') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.contentWrapper}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.backButton,
                                (pressed || hovered) && styles.backButtonHovered,
                                { position: 'relative', top: 0, left: 0 }
                            ]}
                            onPress={reset}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>Annuler</Text>
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingTop: 100 }]}>
                        <View style={{ alignItems: 'center', marginBottom: 40 }}>
                            <Text style={styles.title}>{selectedService.label}</Text>
                            {selectedFiles.length > 1 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                                    <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                                        Maintenez et glissez un fichier pour modifier l'ordre
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ width: '100%', maxWidth: 900, flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 40 }}>
                            {selectedFiles.map((file, index) => {
                                const isDragged = draggedIndex === index;
                                const isDragOver = dragOverIndex === index;
                                
                                return Platform.OS === 'web' ? (
                                <div 
                                    key={`${file.name}-${index}`}
                                    draggable={true}
                                    onDragStart={(e: any) => onDragStart(e, index)}
                                    onDragOver={(e: any) => onDragOver(e, index)}
                                    onDragLeave={(e: any) => onDragLeave(e, index)}
                                    onDrop={(e: any) => onDrop(e, index)}
                                    onDragEnd={onDragEnd}
                                    style={{
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: isDragOver ? 'rgba(255,255,255,0.1)' : colors.card, 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: isDragOver ? colors.success : (isDragged ? colors.primary : colors.border),
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        position: 'relative',
                                        opacity: isDragged ? 0.5 : 1,
                                        cursor: 'grab',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <View style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                                    </View>

                                    <Pressable 
                                        onPress={() => handleRemoveFile(index)} 
                                        style={({ hovered }) => [{ position: 'absolute', top: 8, right: 8, padding: 8, borderRadius: 20, zIndex: 10 }, hovered && { backgroundColor: 'rgba(255,68,68,0.1)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    </Pressable>

                                    <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="document-text-outline" size={32} color={colors.text} />
                                    </View>
                                    
                                    <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4, width: '100%' }}>
                                        {file.name}
                                    </Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Inconnu'}
                                    </Text>
                                </div>
                                ) : (
                                <View 
                                    key={`${file.name}-${index}`}
                                    style={[{ 
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: colors.card, 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: colors.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        position: 'relative'
                                    }]}
                                >
                                    <View style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                                    </View>

                                    <Pressable 
                                        onPress={() => handleRemoveFile(index)} 
                                        style={({ hovered }) => [{ position: 'absolute', top: 8, right: 8, padding: 8, borderRadius: 20, zIndex: 10 }, hovered && { backgroundColor: 'rgba(255,68,68,0.1)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    </Pressable>

                                    <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="document-text-outline" size={32} color={colors.text} />
                                    </View>
                                    
                                    <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4, width: '100%' }}>
                                        {file.name}
                                    </Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Inconnu'}
                                    </Text>
                                </View>
                                );
                            })}
                            
                            {selectedService.multiple && (
                                <Pressable 
                                    style={({ hovered }) => [{ 
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: hovered ? colors.cardHovered : 'transparent', 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: colors.border,
                                        borderStyle: 'dashed' as any,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        cursor: 'pointer' as any
                                    }]}
                                    onPress={() => handleSelectFiles(true)}
                                >
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="add-outline" size={32} color={colors.text} />
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>Ajouter un fichier</Text>
                                </Pressable>
                            )}
                        </View>

                        {selectedService.id === 'compress-pdf' && (
                            <CompressionSelector 
                                value={compressionLevel}
                                onChange={setCompressionLevel}
                                fileSize={selectedFiles[0]?.size || 0}
                            />
                        )}

                        {/* protect-pdf configurator has been moved to ProtectEditor */}
                        {/* watermark-pdf configurator has been moved to WatermarkEditor */}
                        {/* split-pdf configurator has been moved to SplitEditor */}

                        {selectedService.id === 'number-pdf' && (
                            <NumberingSelector onChange={setNumberingConfig} />
                        )}

                        {selectedService.id === 'ocr-pdf' && (
                            <OcrLanguageSelector onChange={setOcrLang} />
                        )}

                        {(selectedService.id === 'pdf-to-image' || selectedService.id === 'image-to-pdf') && (
                            <ConversionOptions 
                                type={selectedService.id} 
                                onChange={setConversionQuality} 
                            />
                        )}

                        <View style={{ flexDirection: 'row', gap: 16, width: '100%', maxWidth: 400 }}>
                            <Pressable 
                                style={[styles.primaryButton, selectedFiles.length === 0 && { opacity: 0.5 }]} 
                                onPress={() => processFiles()}
                                disabled={selectedFiles.length === 0}
                            >
                                <Ionicons name="checkmark-outline" size={22} color="#ffffff" />
                                <Text style={styles.primaryButtonText}>Terminer</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'preparing_editor') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.processingTitle}>Préparation de l'éditeur...</Text>
                    <Text style={styles.processingFile}>Veuillez patienter pendant la génération des aperçus.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'pdf_editor') {
        return (
            <PdfEditor 
                pages={pdfEditorPages} 
                colors={colors}
                onComplete={handlePdfEditorComplete}
                onCancel={() => cancelTool()}
                autoOpenSignTool={selectedService?.id === 'sign-pdf'}
            />
        );
    }

    if (step === 'watermark_editor') {
        return (
            <WatermarkEditor 
                pages={pdfEditorPages} 
                colors={colors}
                onComplete={handleWatermarkComplete}
                onCancel={() => cancelTool()}
            />
        );
    }

    if (step === 'protect_editor') {
        return (
            <ProtectEditor 
                pages={pdfEditorPages} 
                fileName={selectedFiles[0]?.name || ''}
                fileSize={selectedFiles[0]?.size || 0}
                colors={colors}
                onComplete={(password) => {
                    setPdfPassword(password);
                    processFiles(password);
                }}
                onCancel={() => cancelTool()}
            />
        );
    }

    if (step === 'rotation_editor') {
        return (
            <RotationEditor 
                pages={pdfEditorPages} 
                colors={colors}
                onComplete={handleRotationComplete}
                onCancel={() => cancelTool()}
            />
        );
    }

    if (step === 'merge_editor') {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {localError && (
                    <View style={{ backgroundColor: '#ef4444', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', flex: 1 }}>{localError}</Text>
                        <Pressable onPress={() => setLocalError(null)} style={{ padding: 8 }}>
                            <Ionicons name="close" size={24} color="white" />
                        </Pressable>
                    </View>
                )}
                <MergeEditor 
                    pages={organizePages}
                    files={organizeFiles.map((f, i) => ({
                        name: f.name,
                        color: f.color,
                        originalIndex: f.originalIndex,
                        pageCount: f.pageCount
                    }))}
                    onComplete={(type, data) => {
                        setLocalError(null);
                        handleMergeComplete(type, data);
                    }}
                    onCancel={() => cancelTool()}
                    onAddFiles={handleAddFilesToOrganize}
                    colors={colors}
                />
            </View>
        );
    }

    if (step === 'organize_editor') {
        return (
            <OrganizeEditor 
                pages={organizePages}
                files={organizeFiles}
                colors={colors}
                onComplete={handleOrganizeComplete}
                onCancel={() => cancelTool()}
                onAddFiles={handleAddFilesToOrganize}
            />
        );
    }

    if (step === 'processing') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>
                    <View style={styles.downloadIcon}>
                        <Ionicons name="cog-outline" size={80} color={colors.primary} />
                    </View>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.processingTitle}>{t('convert.processing')}</Text>
                    <Text style={styles.processingFile}>{selectedFiles.length > 1 ? `${selectedFiles.length} fichiers en cours...` : fileName}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                <Text style={styles.successTitle}>{t('convert.done')}</Text>
                <Text style={styles.successFile}>{fileName}.{(selectedService.id === 'split-pdf' && splitTab === 'extract') ? 'pdf' : selectedService.outputExt}</Text>

                {resultFiles && resultFiles.length > 0 ? (
                    <View style={{ width: '100%', maxHeight: 300, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8, marginBottom: 16 }}>
                        <ScrollView style={{ width: '100%' }}>
                            {resultFiles.map((f, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: i < resultFiles.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                        <Ionicons name="document-text-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                                        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">{f.name}</Text>
                                    </View>
                                    <Pressable 
                                        style={({ hovered }: any) => [{ backgroundColor: colors.cardHovered, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, hovered && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                        onPress={() => {
                                            const a = document.createElement('a');
                                            a.href = f.url;
                                            a.download = f.name;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                        }}>
                                        <Ionicons name="download-outline" size={16} color={colors.text} />
                                    </Pressable>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <Pressable style={[styles.downloadButton, { marginTop: 16 }]} onPress={downloadResult}>
                            <Ionicons name="archive-outline" size={20} color="#ffffff" />
                            <Text style={styles.downloadButtonText}>Télécharger tout (ZIP)</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable style={styles.downloadButton} onPress={downloadResult}>
                        <Ionicons name="download-outline" size={20} color="#ffffff" />
                        <Text style={styles.downloadButtonText}>{t('convert.download')}</Text>
                    </Pressable>
                )}

                <Pressable style={styles.resetButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.resetButtonText}>{t('convert.new')}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 32,
        position: 'relative',
        overflow: 'hidden',
    },

    contentWrapper: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },

    backgroundGlow: {
        position: 'absolute',
        top: -150,
        left: '50%',
        transform: [{ translateX: -400 }],
        width: 800,
        height: 800,
        borderRadius: 400,
        backgroundColor: colors.glow,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 120,
        zIndex: 0,
    },

    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        position: 'absolute',
        top: 32,
        left: 32,
        zIndex: 20,
        backgroundColor: colors.card,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        transitionDuration: '0.2s',
    },

    backButtonHovered: {
        backgroundColor: colors.cardHovered,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        transform: [{ translateY: -1 }],
    },

    backButtonText: {
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },

    scrollContent: {
        paddingTop: 100, 
        paddingBottom: 40,
        alignItems: 'center',
        width: '100%',
        maxWidth: 1000,
    },

    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        width: '100%',
        maxWidth: 400,
        marginTop: 24,
    },

    searchInput: {
        flex: 1,
        height: '100%',
        color: colors.text,
        fontSize: 15,
        fontFamily: 'Outfit_400Regular',
        marginLeft: 12,
        outlineStyle: 'none',
    },

    tabsContainer: {
        flexDirection: 'row',
        marginTop: 16,
        backgroundColor: colors.glow,
        borderRadius: 12,
        padding: 4,
        width: '100%',
        maxWidth: 400,
    },

    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },

    activeTabButton: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },

    tabText: {
        color: colors.textMuted,
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
    },

    activeTabText: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },

    title: {
        fontSize: 36,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },

    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 24,
    },

    groupTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 20,
        alignSelf: 'flex-start',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 10,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        width: '100%',
        justifyContent: 'center',
    },

    serviceCard: {
        width: '100%',
        maxWidth: 380,
    },

    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
        width: '100%',
        maxWidth: 600,
    },

    downloadIcon: {
        marginBottom: 8,
    },

    processingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },

    processingFile: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
    },

    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },

    successFile: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
    },

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        marginBottom: 12,
    },

    downloadButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },

    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
        justifyContent: 'center',
    },

    resetButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },

    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.cardHovered,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },

    secondaryButtonText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 16,
    },

    primaryButton: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
    },

    primaryButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },

    hugePrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: colors.primary,
        paddingVertical: 24,
        paddingHorizontal: 48,
        borderRadius: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        transitionDuration: '0.2s',
    },

    hugePrimaryButtonText: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 22,
    },
});
