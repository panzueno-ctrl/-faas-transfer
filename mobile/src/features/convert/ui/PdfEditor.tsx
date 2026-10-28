import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    TextInput,
    Platform,
    useWindowDimensions,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import SignaturePad, { SignatureData } from './SignaturePad';
import PdfEditItemView from './PdfEditItemView';
import { PdfTextBlock, extractBlocksFromTextContent, loadPdfJs } from '../hooks/usePdfEngine';

export type PdfEditType = 'text' | 'image' | 'draw' | 'replace' | 'signature' | 'whiteout' | 'shape';

export interface PdfEditItem {
    id: string;
    pageIndex: number;
    type: PdfEditType;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width?: number; // percentage 0-100
    height?: number; // percentage 0-100
    backgroundColor?: string;
    text?: string;
    color?: string;
    size?: number;
    fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right';
    isUnderline?: boolean;
    isReplace?: boolean;
    isDeleted?: boolean;
    signatureData?: SignatureData;
    shapeType?: 'rectangle' | 'circle' | 'line';
    opacity?: number;
    imageUri?: string;
}

interface PdfEditorProps {
    pages: string[];
    onComplete: (edits: PdfEditItem[]) => void;
    onCancel: () => void;
    colors: any;
    autoOpenSignTool?: boolean;
    restrictedMode?: boolean;
    pdfOriginalBuffer?: ArrayBuffer | null;
    initialTextBlocks?: PdfTextBlock[];
}

const PRESET_COLORS = [
    '#000000',
    '#ffffff',
    '#ef4444',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#64748b'
];

export default function PdfEditor({
    pages,
    onComplete,
    onCancel,
    colors,
    autoOpenSignTool = false,
    restrictedMode = false,
    pdfOriginalBuffer,
    initialTextBlocks = []
}: PdfEditorProps) {
    const { width: windowWidth } = useWindowDimensions();
    const isMobile = windowWidth < 768;

    // Master Mode: 'modify' (Modifier le texte existant comme dans Word/iLovePDF) vs 'annotate'
    const [masterMode, setMasterMode] = useState<'modify' | 'annotate'>('modify');
    const [activeModifyTool, setActiveModifyTool] = useState<'text_edit' | 'add_text' | 'whiteout'>('text_edit');
    const [activeAnnotateTool, setActiveAnnotateTool] = useState<'draw' | 'highlighter' | 'shape' | 'whiteout' | 'signature'>('draw');

    // Page & Navigation
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1.0);

    // Text Paragraphs extracted from PDF
    const [textBlocks, setTextBlocks] = useState<PdfTextBlock[]>(initialTextBlocks || []);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    // Custom Edits (shapes, drawings, signatures, added text)
    const [edits, setEdits] = useState<PdfEditItem[]>([]);
    const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

    // History for Undo / Redo
    const [history, setHistory] = useState<Array<{ blocks: PdfTextBlock[]; edits: PdfEditItem[] }>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [drawColor, setDrawColor] = useState('#000000');
    const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
    const [isHighlighter, setIsHighlighter] = useState(false);

    // Modals & Panels
    const [signatureModalOpen, setSignatureModalOpen] = useState(autoOpenSignTool);
    const [shapeType, setShapeType] = useState<'rectangle' | 'circle' | 'line'>('rectangle');
    const [isSaving, setIsSaving] = useState(false);
    const imageInputRef = useRef<any>(null);

    const handleTriggerImageUpload = () => {
        if (Platform.OS === 'web' && imageInputRef.current) {
            imageInputRef.current.click();
        }
    };

    const handleImageFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUri = event.target?.result as string;
            if (!dataUri) return;
            const newEdit: PdfEditItem = {
                id: `img-${Date.now()}`,
                pageIndex: currentPage,
                type: 'image',
                x: 35,
                y: 35,
                width: 30,
                height: 20,
                imageUri: dataUri
            };
            const nextEdits = [...edits, newEdit];
            setEdits(nextEdits);
            setSelectedEditId(newEdit.id);
            pushHistory(textBlocks, nextEdits);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Canvas layout dimensions
    const [sheetDimensions, setSheetDimensions] = useState<{ width: number; height: number }>({ width: 780, height: 551 });
    const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 780, height: 551 });

    useEffect(() => {
        const currentUri = pages[currentPage];
        if (!currentUri) return;

        const updateDimensions = (nw: number, nh: number) => {
            if (nw <= 0 || nh <= 0) return;
            const aspect = nw / nh;
            // Landscape slide presentation (e.g. 16:9, 4:3, or A4 landscape) vs portrait document (A4 portrait)
            const targetW = aspect > 1.05 ? 780 : 620;
            const targetH = Math.round(targetW / aspect);
            setSheetDimensions({ width: targetW, height: targetH });
            setCanvasDimensions({ width: targetW, height: targetH });
        };

        if (Platform.OS === 'web') {
            const img = new (window as any).Image();
            img.onload = () => {
                updateDimensions(img.naturalWidth, img.naturalHeight);
            };
            img.src = currentUri;
        } else {
            Image.getSize(
                currentUri,
                (w, h) => updateDimensions(w, h),
                () => updateDimensions(620, 870)
            );
        }
    }, [currentPage, pages]);

    // Initialize textBlocks from props or extract from pdfOriginalBuffer
    useEffect(() => {
        if (initialTextBlocks && initialTextBlocks.length > 0) {
            setTextBlocks(initialTextBlocks);
            pushHistory(initialTextBlocks, edits);
        } else if (pdfOriginalBuffer && Platform.OS === 'web') {
            extractTextDirectly();
        }
    }, [initialTextBlocks, pdfOriginalBuffer]);

    // Escape key to deselect active block on web
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedBlockId(null);
                setSelectedEditId(null);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const extractTextDirectly = async () => {
        if (!pdfOriginalBuffer) return;
        try {
            const pdfjsLib = await loadPdfJs();
            const loadingTask = pdfjsLib.getDocument({ data: pdfOriginalBuffer.slice(0) });
            const pdf = await loadingTask.promise;
            const extracted: PdfTextBlock[] = [];
            const maxP = Math.min(pdf.numPages, pages.length || 50);

            for (let j = 1; j <= maxP; j++) {
                const page = await pdf.getPage(j);
                const viewport = page.getViewport({ scale: 1.0 });
                const textContent = await page.getTextContent();
                const blocks = extractBlocksFromTextContent(textContent, viewport, j - 1);
                extracted.push(...blocks);
            }
            setTextBlocks(extracted);
            pushHistory(extracted, edits);
        } catch (e) {
            console.warn("Direct text extraction failed:", e);
        }
    };

    // Save snapshot to history
    const pushHistory = (newBlocks: PdfTextBlock[], newEdits: PdfEditItem[]) => {
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push({
            blocks: JSON.parse(JSON.stringify(newBlocks)),
            edits: JSON.parse(JSON.stringify(newEdits))
        });
        if (nextHistory.length > 30) nextHistory.shift();
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1];
            setTextBlocks(JSON.parse(JSON.stringify(prev.blocks)));
            setEdits(JSON.parse(JSON.stringify(prev.edits)));
            setHistoryIndex(historyIndex - 1);
            setSelectedBlockId(null);
            setSelectedEditId(null);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1];
            setTextBlocks(JSON.parse(JSON.stringify(next.blocks)));
            setEdits(JSON.parse(JSON.stringify(next.edits)));
            setHistoryIndex(historyIndex + 1);
        }
    };

    // Text Block updates
    const updateTextBlock = (id: string, updates: Partial<PdfTextBlock>) => {
        const updated = textBlocks.map(b => {
            if (b.id === id) {
                return { ...b, ...updates, isEdited: true };
            }
            return b;
        });
        setTextBlocks(updated);
        pushHistory(updated, edits);
    };

    const handleDeleteTextBlock = (id: string) => {
        const updated = textBlocks.map(b => {
            if (b.id === id) {
                return { ...b, isDeleted: true, isEdited: true };
            }
            return b;
        });
        setTextBlocks(updated);
        pushHistory(updated, edits);
        setSelectedBlockId(null);
    };

    const handleResetTextBlock = (id: string) => {
        const updated = textBlocks.map(b => {
            if (b.id === id) {
                return {
                    ...b,
                    currentText: b.originalText,
                    isEdited: false,
                    isDeleted: false,
                    color: '#000000',
                    isUnderline: false,
                    fontWeight: 'normal' as const,
                    fontStyle: 'normal' as const
                };
            }
            return b;
        });
        setTextBlocks(updated);
        pushHistory(updated, edits);
    };

    // Add new text element
    const handleAddNewText = () => {
        const newBlock: PdfTextBlock = {
            id: `new-text-${Date.now()}`,
            pageIndex: currentPage,
            originalText: '',
            currentText: 'Nouveau paragraphe de texte',
            x: 20,
            y: 30,
            width: 60,
            height: 6,
            fontSize: 16,
            fontFamily: 'Helvetica',
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#000000',
            textAlign: 'left',
            isUnderline: false,
            isEdited: true,
            isDeleted: false
        };
        const updated = [...textBlocks, newBlock];
        setTextBlocks(updated);
        setSelectedBlockId(newBlock.id);
        pushHistory(updated, edits);
    };

    // Add whiteout box (masquage opaque)
    const handleAddWhiteout = () => {
        const newEdit: PdfEditItem = {
            id: `whiteout-${Date.now()}`,
            pageIndex: currentPage,
            type: 'whiteout',
            x: 25,
            y: 35,
            width: 35,
            height: 8,
            backgroundColor: '#ffffff'
        };
        const nextEdits = [...edits, newEdit];
        setEdits(nextEdits);
        setSelectedEditId(newEdit.id);
        pushHistory(textBlocks, nextEdits);
    };

    // Add shape
    const handleAddShape = (type: 'rectangle' | 'circle' | 'line') => {
        const newEdit: PdfEditItem = {
            id: `shape-${Date.now()}`,
            pageIndex: currentPage,
            type: 'shape',
            shapeType: type,
            x: 30,
            y: 35,
            width: type === 'line' ? 35 : 30,
            height: type === 'line' ? 4 : 20,
            color: drawColor,
            size: drawStrokeWidth
        };
        const nextEdits = [...edits, newEdit];
        setEdits(nextEdits);
        setSelectedEditId(newEdit.id);
        pushHistory(textBlocks, nextEdits);
    };

    // Handle signature completion
    const handleSignatureSave = (sigData: SignatureData) => {
        setSignatureModalOpen(false);
        const newEdit: PdfEditItem = {
            id: `sig-${Date.now()}`,
            pageIndex: currentPage,
            type: 'signature',
            signatureData: sigData,
            x: 35,
            y: 50,
            width: 28,
            height: 12
        };
        const nextEdits = [...edits, newEdit];
        setEdits(nextEdits);
        setSelectedEditId(newEdit.id);
        pushHistory(textBlocks, nextEdits);
    };

    // Drawing handlers (web pointer events)
    const handlePointerDown = (e: any) => {
        if (masterMode !== 'annotate' || (activeAnnotateTool !== 'draw' && activeAnnotateTool !== 'highlighter')) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setCurrentPath(`M ${x} ${y}`);
    };

    const handlePointerMove = (e: any) => {
        if (!isDrawing) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentPath(prev => `${prev} L ${x} ${y}`);
    };

    const handlePointerUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath.length > 5) {
            const newEdit: PdfEditItem = {
                id: `draw-${Date.now()}`,
                pageIndex: currentPage,
                type: 'draw',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                signatureData: {
                    type: 'path',
                    data: currentPath,
                    width: canvasDimensions.width,
                    height: canvasDimensions.height
                },
                color: drawColor,
                size: isHighlighter ? Math.max(12, drawStrokeWidth * 3) : drawStrokeWidth,
                opacity: isHighlighter ? 0.35 : 1
            };
            const nextEdits = [...edits, newEdit];
            setEdits(nextEdits);
            pushHistory(textBlocks, nextEdits);
        }
        setCurrentPath('');
    };

    // Finish and Save
    const handleSave = () => {
        setIsSaving(true);
        const replaceEdits: PdfEditItem[] = textBlocks
            .filter(b => b.isEdited || b.isDeleted)
            .map(b => ({
                id: b.id,
                pageIndex: b.pageIndex,
                type: 'replace',
                isReplace: true,
                isDeleted: b.isDeleted,
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                text: b.currentText,
                size: b.fontSize,
                fontFamily: b.fontFamily,
                fontWeight: b.fontWeight,
                fontStyle: b.fontStyle,
                textAlign: b.textAlign,
                color: b.color,
                isUnderline: b.isUnderline
            }));

        const finalEdits = [...replaceEdits, ...edits];
        onComplete(finalEdits);
    };

    // Helper: 8 selection handles (iLovePDF visual style)
    const render8Handles = () => {
        const hSize = 8;
        const hOffset = -4;
        const hStyle = {
            position: 'absolute' as const,
            width: hSize,
            height: hSize,
            borderRadius: hSize / 2,
            backgroundColor: '#FFFFFF',
            borderColor: '#00D2FF',
            borderWidth: 1.5,
            zIndex: 120
        };
        return (
            <>
                <View style={[hStyle, { top: hOffset, left: hOffset }]} />
                <View style={[hStyle, { top: hOffset, left: '50%', marginLeft: hOffset }]} />
                <View style={[hStyle, { top: hOffset, right: hOffset }]} />
                <View style={[hStyle, { top: '50%', left: hOffset, marginTop: hOffset }]} />
                <View style={[hStyle, { top: '50%', right: hOffset, marginTop: hOffset }]} />
                <View style={[hStyle, { bottom: hOffset, left: hOffset }]} />
                <View style={[hStyle, { bottom: hOffset, left: '50%', marginLeft: hOffset }]} />
                <View style={[hStyle, { bottom: hOffset, right: hOffset }]} />
            </>
        );
    };

    // Active selected items
    const selectedBlock = textBlocks.find(b => b.id === selectedBlockId);
    const selectedEdit = edits.find(e => e.id === selectedEditId);
    const currentPageBlocks = textBlocks.filter(b => b.pageIndex === currentPage);
    const currentPageEdits = edits.filter(e => e.pageIndex === currentPage);

    return (
        <View style={styles.container}>
            {/* 1. TOP BAR */}
            <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                {/* Left section: Back + Title & Page Info + Master Mode Toggle */}
                <View style={styles.topBarLeft}>
                    <Pressable style={styles.iconButton} onPress={onCancel}>
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: colors.text }]}>Modifier PDF</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            Page {currentPage + 1} sur {pages.length}
                        </Text>
                    </View>

                    {/* Master Mode Switcher: Modifier vs Annoter */}
                    <View style={styles.masterPill}>
                        <Pressable
                            style={[
                                styles.masterPillOption,
                                masterMode === 'modify' && styles.masterPillOptionActive
                            ]}
                            onPress={() => {
                                setMasterMode('modify');
                                setSelectedEditId(null);
                            }}
                        >
                            <Ionicons
                                name="create"
                                size={14}
                                color={masterMode === 'modify' ? '#00D2FF' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.masterPillText,
                                    masterMode === 'modify' && styles.masterPillTextActive
                                ]}
                            >
                                Modifier
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.masterPillOption,
                                masterMode === 'annotate' && styles.masterPillOptionActive
                            ]}
                            onPress={() => {
                                setMasterMode('annotate');
                                setSelectedBlockId(null);
                            }}
                        >
                            <Ionicons
                                name="brush"
                                size={14}
                                color={masterMode === 'annotate' ? '#00D2FF' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.masterPillText,
                                    masterMode === 'annotate' && styles.masterPillTextActive
                                ]}
                            >
                                Annoter
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Center section: Unified iLovePDF Studio Toolbar */}
                <View style={styles.topBarCenter}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolSegment}>
                        {/* 1. Éditer le texte (Mode Word / Direct In-place) */}
                        <Pressable
                            style={[
                                styles.subToolBtn,
                                masterMode === 'modify' && activeModifyTool === 'text_edit' && styles.subToolBtnActive
                            ]}
                            onPress={() => {
                                setMasterMode('modify');
                                setActiveModifyTool('text_edit');
                                setSelectedEditId(null);
                            }}
                        >
                            <Ionicons
                                name="create"
                                size={15}
                                color={masterMode === 'modify' && activeModifyTool === 'text_edit' ? '#00D2FF' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.subToolText,
                                    masterMode === 'modify' && activeModifyTool === 'text_edit' && styles.subToolTextActive
                                ]}
                            >
                                Éditer texte
                            </Text>
                        </Pressable>

                        {/* 2. Ajouter texte libre */}
                        <Pressable
                            style={styles.subToolBtn}
                            onPress={handleAddNewText}
                        >
                            <Ionicons name="add-circle-outline" size={15} color="#94A3B8" />
                            <Text style={styles.subToolText}>+ Texte</Text>
                        </Pressable>

                        {/* 3. Ajouter image */}
                        <Pressable
                            style={styles.subToolBtn}
                            onPress={handleTriggerImageUpload}
                        >
                            <Ionicons name="image-outline" size={15} color="#94A3B8" />
                            <Text style={styles.subToolText}>+ Image</Text>
                        </Pressable>

                        {/* 4. Formes (Rectangle, Cercle, Flèche, Ligne) */}
                        <Pressable
                            style={[
                                styles.subToolBtn,
                                activeAnnotateTool === 'shape' && styles.subToolBtnActive
                            ]}
                            onPress={() => {
                                setActiveAnnotateTool('shape');
                                handleAddShape(shapeType);
                            }}
                        >
                            <Ionicons
                                name="shapes-outline"
                                size={15}
                                color={activeAnnotateTool === 'shape' ? '#00D2FF' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.subToolText,
                                    activeAnnotateTool === 'shape' && styles.subToolTextActive
                                ]}
                            >
                                Formes
                            </Text>
                        </Pressable>

                        {/* 5. Crayon (Dessiner) */}
                        <Pressable
                            style={[
                                styles.subToolBtn,
                                masterMode === 'annotate' && activeAnnotateTool === 'draw' && !isHighlighter && styles.subToolBtnActive
                            ]}
                            onPress={() => {
                                setMasterMode('annotate');
                                setActiveAnnotateTool('draw');
                                setIsHighlighter(false);
                                setSelectedBlockId(null);
                            }}
                        >
                            <Ionicons
                                name="pencil"
                                size={15}
                                color={masterMode === 'annotate' && activeAnnotateTool === 'draw' && !isHighlighter ? '#00D2FF' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.subToolText,
                                    masterMode === 'annotate' && activeAnnotateTool === 'draw' && !isHighlighter && styles.subToolTextActive
                                ]}
                            >
                                Crayon
                            </Text>
                        </Pressable>

                        {/* 6. Surligneur */}
                        <Pressable
                            style={[
                                styles.subToolBtn,
                                masterMode === 'annotate' && activeAnnotateTool === 'highlighter' && styles.subToolBtnActive
                            ]}
                            onPress={() => {
                                setMasterMode('annotate');
                                setActiveAnnotateTool('highlighter');
                                setIsHighlighter(true);
                                setSelectedBlockId(null);
                            }}
                        >
                            <Ionicons
                                name="color-wand-outline"
                                size={15}
                                color={masterMode === 'annotate' && activeAnnotateTool === 'highlighter' ? '#00D2FF' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.subToolText,
                                    masterMode === 'annotate' && activeAnnotateTool === 'highlighter' && styles.subToolTextActive
                                ]}
                            >
                                Surligneur
                            </Text>
                        </Pressable>

                        {/* 7. Signer */}
                        <Pressable
                            style={styles.subToolBtn}
                            onPress={() => setSignatureModalOpen(true)}
                        >
                            <Ionicons name="finger-print-outline" size={15} color="#94A3B8" />
                            <Text style={styles.subToolText}>Signer</Text>
                        </Pressable>

                        {/* 8. Gomme / Masquer zone */}
                        <Pressable
                            style={styles.subToolBtn}
                            onPress={handleAddWhiteout}
                        >
                            <Ionicons name="square-outline" size={15} color="#94A3B8" />
                            <Text style={styles.subToolText}>Gomme / Masquer</Text>
                        </Pressable>
                    </ScrollView>
                </View>

                {/* Right section: History Undo/Redo & Zoom controls */}
                <View style={styles.topBarRight}>
                    <Pressable
                        style={[styles.historyBtn, historyIndex <= 0 && styles.historyBtnDisabled]}
                        onPress={handleUndo}
                        disabled={historyIndex <= 0}
                    >
                        <Ionicons
                            name="arrow-undo"
                            size={16}
                            color={historyIndex > 0 ? colors.text : colors.textMuted}
                        />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.historyBtn,
                            historyIndex >= history.length - 1 && styles.historyBtnDisabled
                        ]}
                        onPress={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                    >
                        <Ionicons
                            name="arrow-redo"
                            size={16}
                            color={historyIndex < history.length - 1 ? colors.text : colors.textMuted}
                        />
                    </Pressable>

                    <View style={styles.zoomControls}>
                        <Pressable
                            style={styles.zoomBtn}
                            onPress={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                        >
                            <Ionicons name="remove" size={14} color={colors.text} />
                        </Pressable>
                        <Text style={[styles.zoomText, { color: colors.text }]}>
                            {Math.round(zoom * 100)}%
                        </Text>
                        <Pressable
                            style={styles.zoomBtn}
                            onPress={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
                        >
                            <Ionicons name="add" size={14} color={colors.text} />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* 2. MAIN 3-COLUMN STUDIO BODY */}
            <View style={styles.mainStudio}>
                {/* 2A. LEFT PANEL: PAGE THUMBNAILS NAVIGATOR */}
                <View
                    style={[
                        styles.leftThumbnailsPanel,
                        { backgroundColor: colors.card, borderRightColor: colors.border }
                    ]}
                >
                    <View style={styles.thumbHeader}>
                        <Ionicons name="documents-outline" size={15} color="#00D2FF" />
                        <Text style={styles.thumbHeaderText}>PAGES ({pages.length})</Text>
                    </View>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.thumbList}
                    >
                        {pages.map((pageUri, idx) => {
                            const isCurrent = currentPage === idx;
                            const hasEdits =
                                textBlocks.some(b => b.pageIndex === idx && (b.isEdited || b.isDeleted)) ||
                                edits.some(e => e.pageIndex === idx);

                            return (
                                <Pressable
                                    key={`thumb-${idx}`}
                                    style={[
                                        styles.thumbCard,
                                        isCurrent && styles.thumbCardActive
                                    ]}
                                    onPress={() => {
                                        setCurrentPage(idx);
                                        setSelectedBlockId(null);
                                        setSelectedEditId(null);
                                    }}
                                >
                                    <View style={styles.thumbBadge}>
                                        <Text style={styles.thumbBadgeText}>{idx + 1}</Text>
                                        {hasEdits && <View style={styles.thumbEditDot} />}
                                    </View>
                                    <Image
                                        source={{ uri: pageUri }}
                                        style={styles.thumbImage}
                                        resizeMode="contain"
                                    />
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 2B. CENTER WORKSPACE: REALISTIC PDF PAGE CANVAS */}
                <ScrollView
                    style={styles.centerWorkspace}
                    contentContainerStyle={styles.centerWorkspaceContent}
                    maximumZoomScale={2.5}
                    minimumZoomScale={0.5}
                >
                    <View
                        style={[
                            styles.canvasWrapper,
                            {
                                transform: [{ scale: zoom }]
                            }
                        ]}
                    >
                        {/* Realistic White Sheet Document with drop shadow */}
                        <Pressable
                            onLayout={e => {
                                const { width, height } = e.nativeEvent.layout;
                                if (width > 0 && height > 0) {
                                    setCanvasDimensions({ width, height });
                                }
                            }}
                            onPress={() => {
                                // Smooth click outside: deselect active text block or edit item without blocking
                                if (selectedBlockId !== null) setSelectedBlockId(null);
                                if (selectedEditId !== null) setSelectedEditId(null);
                            }}
                            style={[
                                styles.pageSheet,
                                {
                                    width: sheetDimensions.width,
                                    height: sheetDimensions.height
                                }
                            ]}
                            {...(Platform.OS === 'web' && masterMode === 'annotate'
                                ? {
                                      onPointerDown: handlePointerDown,
                                      onPointerMove: handlePointerMove,
                                      onPointerUp: handlePointerUp
                                  }
                                : {})}
                        >
                            {/* Base rendered PDF page image */}
                            {pages[currentPage] && (
                                <Image
                                    source={{ uri: pages[currentPage] }}
                                    style={styles.pageBackground}
                                    resizeMode="cover"
                                />
                            )}

                            {/* IN 'MODIFIER' MODE: UNIFIED WORD-LIKE LIVE TEXT BLOCKS */}
                            {masterMode === 'modify' &&
                                currentPageBlocks.map(block => {
                                    const isSelected = selectedBlockId === block.id;
                                    const scale = (block.pageWidth && sheetDimensions.width > 0)
                                        ? (sheetDimensions.width / block.pageWidth)
                                        : (sheetDimensions.width / 620);
                                    const effectiveFontSize = Math.max(9, Math.round(block.fontSize * scale));

                                    // Deleted block: whiteout patch
                                    if (block.isDeleted) {
                                        return (
                                            <View
                                                key={block.id}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${block.x}%`,
                                                    top: `${block.y}%`,
                                                    width: `${block.width}%`,
                                                    height: `${block.height}%`,
                                                    backgroundColor: '#FFFFFF',
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(239, 68, 68, 0.4)',
                                                    borderStyle: 'dashed',
                                                    borderRadius: 2,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    zIndex: 20
                                                }}
                                            >
                                                <Text style={{ fontSize: 9, color: '#EF4444', fontStyle: 'italic' }}>
                                                    [Texte supprimé]
                                                </Text>
                                            </View>
                                        );
                                    }

                                    // Unified Word-like Live In-Place Text Block
                                    return (
                                        <View
                                            key={block.id}
                                            onStartShouldSetResponder={() => true}
                                            {...(Platform.OS === 'web'
                                                ? {
                                                      onClick: (e: any) => e.stopPropagation(),
                                                      onMouseDown: (e: any) => e.stopPropagation(),
                                                      onTouchStart: (e: any) => e.stopPropagation()
                                                  }
                                                : {})}
                                            style={{
                                                position: 'absolute',
                                                left: `${block.x}%`,
                                                top: `${block.y}%`,
                                                width: `${Math.max(block.width, 10)}%`,
                                                minHeight: `${Math.max(block.height, 3.5)}%`,
                                                borderWidth: isSelected ? 1.5 : 1,
                                                borderColor: isSelected
                                                    ? '#00D2FF'
                                                    : block.isEdited
                                                    ? '#00D2FF'
                                                    : 'rgba(0, 180, 255, 0.45)',
                                                borderStyle: isSelected || block.isEdited ? 'solid' : 'dashed',
                                                borderRadius: 2,
                                                backgroundColor: '#FFFFFF',
                                                boxShadow: isSelected ? '0 0 14px rgba(0, 210, 255, 0.4)' : 'none',
                                                zIndex: isSelected ? 100 : 30,
                                                paddingHorizontal: 4,
                                                paddingVertical: 2
                                            }}
                                        >
                                            {/* 8 Selection Handles visible when selected */}
                                            {isSelected && render8Handles()}

                                            <TextInput
                                                value={block.currentText}
                                                onChangeText={txt =>
                                                    updateTextBlock(block.id, { currentText: txt, isEdited: true })
                                                }
                                                onFocus={() => {
                                                    setSelectedBlockId(block.id);
                                                    setSelectedEditId(null);
                                                }}
                                                multiline={true}
                                                scrollEnabled={false}
                                                style={{
                                                    fontSize: effectiveFontSize,
                                                    lineHeight: effectiveFontSize * 1.30,
                                                    fontFamily:
                                                        block.fontFamily === 'TimesRoman'
                                                            ? Platform.OS === 'web' ? 'Times New Roman, serif' : 'serif'
                                                            : block.fontFamily === 'Courier'
                                                            ? 'Courier, monospace'
                                                            : 'Arial, sans-serif',
                                                    fontWeight: block.fontWeight,
                                                    fontStyle: block.fontStyle,
                                                    textDecorationLine: block.isUnderline ? 'underline' : 'none',
                                                    color: block.color,
                                                    textAlign: block.textAlign,
                                                    padding: 0,
                                                    margin: 0,
                                                    backgroundColor: 'transparent',
                                                    outline: 'none',
                                                    minWidth: '100%',
                                                    cursor: 'text',
                                                    ...(Platform.OS === 'web'
                                                        ? {
                                                              overflow: 'hidden',
                                                              resize: 'none',
                                                              scrollbarWidth: 'none',
                                                              msOverflowStyle: 'none',
                                                              whiteSpace: 'pre-wrap',
                                                              wordBreak: 'break-word'
                                                          }
                                                        : {})
                                                } as any}
                                            />
                                        </View>
                                    );
                                })}

                            {/* CUSTOM ADDED ITEMS & ANNOTATIONS */}
                            {currentPageEdits.map(edit => {
                                if (edit.type === 'draw' && edit.signatureData?.data) {
                                    return (
                                        <View
                                            key={edit.id}
                                            style={StyleSheet.absoluteFill}
                                            pointerEvents="none"
                                        >
                                            <Svg width="100%" height="100%">
                                                <Path
                                                    d={edit.signatureData.data}
                                                    stroke={edit.color || '#000000'}
                                                    strokeWidth={edit.size || 3}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    fill="none"
                                                    opacity={edit.opacity !== undefined ? edit.opacity : 1}
                                                />
                                            </Svg>
                                        </View>
                                    );
                                }

                                return (
                                    <PdfEditItemView
                                        key={edit.id}
                                        edit={edit}
                                        isSelected={selectedEditId === edit.id}
                                        canvasSize={canvasDimensions}
                                        onSelect={() => {
                                            setSelectedEditId(edit.id);
                                            setSelectedBlockId(null);
                                        }}
                                        onRemove={() => {
                                            const updated = edits.filter(e => e.id !== edit.id);
                                            setEdits(updated);
                                            pushHistory(textBlocks, updated);
                                            setSelectedEditId(null);
                                        }}
                                        onChangeText={txt => {
                                            const updated = edits.map(e =>
                                                e.id === edit.id ? { ...e, text: txt } : e
                                            );
                                            setEdits(updated);
                                            pushHistory(textBlocks, updated);
                                        }}
                                        onResize={(w, h) => {
                                            const updated = edits.map(e =>
                                                e.id === edit.id ? { ...e, width: w, height: h } : e
                                            );
                                            setEdits(updated);
                                            pushHistory(textBlocks, updated);
                                        }}
                                        onDuplicate={() => {
                                            const dup: PdfEditItem = {
                                                ...edit,
                                                id: `edit-dup-${Date.now()}`,
                                                x: Math.min(80, (edit.x || 0) + 5),
                                                y: Math.min(80, (edit.y || 0) + 5)
                                            };
                                            const updated = [...edits, dup];
                                            setEdits(updated);
                                            setSelectedEditId(dup.id);
                                            pushHistory(textBlocks, updated);
                                        }}
                                        panHandlers={{}}
                                    />
                                );
                            })}

                            {/* Active SVG Drawing Path while dragging */}
                            {isDrawing && currentPath.length > 0 && (
                                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                    <Svg width="100%" height="100%">
                                        <Path
                                            d={currentPath}
                                            stroke={drawColor}
                                            strokeWidth={isHighlighter ? Math.max(12, drawStrokeWidth * 3) : drawStrokeWidth}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="none"
                                            opacity={isHighlighter ? 0.35 : 1}
                                        />
                                    </Svg>
                                </View>
                            )}
                        </Pressable>
                    </View>

                    {/* FLOATING BOTTOM TOOLBAR (iLovePDF Ergonomics) */}
                    <View style={styles.floatingBottomPill}>
                        <Pressable
                            style={styles.floatingNavBtn}
                            onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={16}
                                color={currentPage === 0 ? '#475569' : '#00D2FF'}
                            />
                        </Pressable>

                        <Text style={styles.floatingPageText}>
                            Page {currentPage + 1} / {pages.length}
                        </Text>

                        <Pressable
                            style={styles.floatingNavBtn}
                            onPress={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                            disabled={currentPage === pages.length - 1}
                        >
                            <Ionicons
                                name="chevron-forward"
                                size={16}
                                color={currentPage === pages.length - 1 ? '#475569' : '#00D2FF'}
                            />
                        </Pressable>

                        <View style={styles.floatingDivider} />

                        <Pressable
                            style={styles.floatingNavBtn}
                            onPress={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                        >
                            <Ionicons name="remove" size={14} color="#CBD5E1" />
                        </Pressable>

                        <Text style={styles.floatingZoomText}>{Math.round(zoom * 100)}%</Text>

                        <Pressable
                            style={styles.floatingNavBtn}
                            onPress={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
                        >
                            <Ionicons name="add" size={14} color="#CBD5E1" />
                        </Pressable>

                        <View style={styles.floatingDivider} />

                        <Pressable style={styles.floatingNavBtn} onPress={() => setZoom(1.0)}>
                            <Ionicons name="scan-outline" size={15} color="#00D2FF" />
                        </Pressable>
                    </View>
                </ScrollView>

                {/* 2C. RIGHT PANEL: PROPERTIES INSPECTOR ("Styles de texte" / "Styles d'annotation") */}
                <View
                    style={[
                        styles.rightInspectorPanel,
                        { backgroundColor: colors.card, borderLeftColor: colors.border }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.inspectorHeader}>
                        <Ionicons
                            name={masterMode === 'modify' ? 'text-outline' : 'color-palette-outline'}
                            size={18}
                            color="#00D2FF"
                        />
                        <Text style={styles.inspectorTitle}>
                            {masterMode === 'modify'
                                ? selectedBlock
                                    ? 'Styles de texte'
                                    : 'Modifier PDF'
                                : 'Styles d\'annotation'}
                        </Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.inspectorBody}>
                        {/* CASE 1: A text block is selected in Modifier mode */}
                        {masterMode === 'modify' && selectedBlock && (
                            <View style={styles.inspectorSection}>
                                <Text style={styles.sectionSubtitle}>
                                    Page {currentPage + 1} • Paragraphe sélectionné
                                </Text>

                                {/* Police (Font Family) */}
                                <Text style={styles.label}>Police</Text>
                                <View style={styles.segmentRow}>
                                    {(['Helvetica', 'TimesRoman', 'Courier'] as const).map(f => (
                                        <Pressable
                                            key={f}
                                            style={[
                                                styles.segmentBtn,
                                                selectedBlock.fontFamily === f && styles.segmentBtnActive
                                            ]}
                                            onPress={() => updateTextBlock(selectedBlock.id, { fontFamily: f })}
                                        >
                                            <Text
                                                style={[
                                                    styles.segmentBtnText,
                                                    selectedBlock.fontFamily === f && styles.segmentBtnTextActive
                                                ]}
                                            >
                                                {f === 'Helvetica' ? 'Carlito' : f === 'TimesRoman' ? 'Times' : 'Courier'}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                {/* Taille de police (Font Size) */}
                                <Text style={styles.label}>Taille de police</Text>
                                <View style={styles.sizeStepperRow}>
                                    <Pressable
                                        style={styles.stepperBtn}
                                        onPress={() =>
                                            updateTextBlock(selectedBlock.id, {
                                                fontSize: Math.max(8, selectedBlock.fontSize - 2)
                                            })
                                        }
                                    >
                                        <Ionicons name="remove" size={16} color="#FFFFFF" />
                                    </Pressable>
                                    <Text style={styles.stepperValue}>
                                        {selectedBlock.fontSize} pt
                                    </Text>
                                    <Pressable
                                        style={styles.stepperBtn}
                                        onPress={() =>
                                            updateTextBlock(selectedBlock.id, {
                                                fontSize: Math.min(96, selectedBlock.fontSize + 2)
                                            })
                                        }
                                    >
                                        <Ionicons name="add" size={16} color="#FFFFFF" />
                                    </Pressable>
                                </View>

                                {/* Styles: Gras, Italique, Souligné */}
                                <Text style={styles.label}>Formatage</Text>
                                <View style={styles.styleButtonsRow}>
                                    <Pressable
                                        style={[
                                            styles.formatBtn,
                                            selectedBlock.fontWeight === 'bold' && styles.formatBtnActive
                                        ]}
                                        onPress={() =>
                                            updateTextBlock(selectedBlock.id, {
                                                fontWeight: selectedBlock.fontWeight === 'bold' ? 'normal' : 'bold'
                                            })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.formatBtnText,
                                                { fontWeight: 'bold' },
                                                selectedBlock.fontWeight === 'bold' && styles.formatBtnTextActive
                                            ]}
                                        >
                                            B
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.formatBtn,
                                            selectedBlock.fontStyle === 'italic' && styles.formatBtnActive
                                        ]}
                                        onPress={() =>
                                            updateTextBlock(selectedBlock.id, {
                                                fontStyle: selectedBlock.fontStyle === 'italic' ? 'normal' : 'italic'
                                            })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.formatBtnText,
                                                { fontStyle: 'italic' },
                                                selectedBlock.fontStyle === 'italic' && styles.formatBtnTextActive
                                            ]}
                                        >
                                            I
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.formatBtn,
                                            selectedBlock.isUnderline && styles.formatBtnActive
                                        ]}
                                        onPress={() =>
                                            updateTextBlock(selectedBlock.id, {
                                                isUnderline: !selectedBlock.isUnderline
                                            })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.formatBtnText,
                                                { textDecorationLine: 'underline' },
                                                selectedBlock.isUnderline && styles.formatBtnTextActive
                                            ]}
                                        >
                                            U
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* Alignement */}
                                <Text style={styles.label}>Alignement</Text>
                                <View style={styles.segmentRow}>
                                    {(['left', 'center', 'right'] as const).map(align => (
                                        <Pressable
                                            key={align}
                                            style={[
                                                styles.segmentBtn,
                                                selectedBlock.textAlign === align && styles.segmentBtnActive
                                            ]}
                                            onPress={() => updateTextBlock(selectedBlock.id, { textAlign: align })}
                                        >
                                            <Ionicons
                                                name={
                                                    align === 'left'
                                                        ? 'reorder-two-outline'
                                                        : align === 'center'
                                                        ? 'reorder-three-outline'
                                                        : 'reorder-four-outline'
                                                }
                                                size={16}
                                                color={selectedBlock.textAlign === align ? '#00D2FF' : '#94A3B8'}
                                            />
                                        </Pressable>
                                    ))}
                                </View>

                                {/* Couleur actuelle */}
                                <Text style={styles.label}>Couleur actuelle</Text>
                                <View style={styles.colorPalette}>
                                    {PRESET_COLORS.map(c => (
                                        <Pressable
                                            key={c}
                                            style={[
                                                styles.colorSwatch,
                                                { backgroundColor: c },
                                                selectedBlock.color === c && styles.colorSwatchActive
                                            ]}
                                            onPress={() => updateTextBlock(selectedBlock.id, { color: c })}
                                        />
                                    ))}
                                </View>

                                {/* Actions sur ce bloc */}
                                <View style={styles.blockActionButtons}>
                                    <Pressable
                                        style={styles.deleteBlockBtn}
                                        onPress={() => handleDeleteTextBlock(selectedBlock.id)}
                                    >
                                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                        <Text style={styles.deleteBlockText}>Supprimer ce texte</Text>
                                    </Pressable>

                                    {selectedBlock.isEdited && (
                                        <Pressable
                                            style={styles.resetBlockBtn}
                                            onPress={() => handleResetTextBlock(selectedBlock.id)}
                                        >
                                            <Ionicons name="refresh-outline" size={15} color="#94A3B8" />
                                            <Text style={styles.resetBlockText}>Rétablir original</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* CASE 2: No block selected in Modifier mode */}
                        {masterMode === 'modify' && !selectedBlock && (
                            <View style={styles.inspectorSection}>
                                <View style={styles.infoBox}>
                                    <Ionicons name="information-circle-outline" size={20} color="#00D2FF" />
                                    <Text style={styles.infoBoxText}>
                                        Cliquez sur n'importe quel paragraphe dans la page pour le modifier directement comme dans Word, ou ajoutez de nouveaux éléments ci-dessous.
                                    </Text>
                                </View>

                                <Pressable style={styles.quickAddBtn} onPress={handleAddNewText}>
                                    <Ionicons name="add-circle" size={18} color="#00D2FF" />
                                    <Text style={styles.quickAddText}>Ajouter du texte libre</Text>
                                </Pressable>

                                <Pressable style={styles.quickAddBtn} onPress={handleAddWhiteout}>
                                    <Ionicons name="square" size={18} color="#00D2FF" />
                                    <Text style={styles.quickAddText}>Masquer une zone (Gomme)</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* CASE 3: Annotate Mode styles */}
                        {masterMode === 'annotate' && (
                            <View style={styles.inspectorSection}>
                                <Text style={styles.label}>Mode de dessin</Text>
                                <View style={styles.segmentRow}>
                                    <Pressable
                                        style={[
                                            styles.segmentBtn,
                                            !isHighlighter && styles.segmentBtnActive
                                        ]}
                                        onPress={() => {
                                            setIsHighlighter(false);
                                            setActiveAnnotateTool('draw');
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentBtnText,
                                                !isHighlighter && styles.segmentBtnTextActive
                                            ]}
                                        >
                                            Stylo (Opaque)
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.segmentBtn,
                                            isHighlighter && styles.segmentBtnActive
                                        ]}
                                        onPress={() => {
                                            setIsHighlighter(true);
                                            setActiveAnnotateTool('highlighter');
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentBtnText,
                                                isHighlighter && styles.segmentBtnTextActive
                                            ]}
                                        >
                                            Surligneur
                                        </Text>
                                    </Pressable>
                                </View>

                                <Text style={styles.label}>Épaisseur du trait</Text>
                                <View style={styles.segmentRow}>
                                    {[2, 4, 8, 14].map(size => (
                                        <Pressable
                                            key={size}
                                            style={[
                                                styles.segmentBtn,
                                                drawStrokeWidth === size && styles.segmentBtnActive
                                            ]}
                                            onPress={() => setDrawStrokeWidth(size)}
                                        >
                                            <Text
                                                style={[
                                                    styles.segmentBtnText,
                                                    drawStrokeWidth === size && styles.segmentBtnTextActive
                                                ]}
                                            >
                                                {size}px
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Text style={styles.label}>Couleur du trait</Text>
                                <View style={styles.colorPalette}>
                                    {PRESET_COLORS.map(c => (
                                        <Pressable
                                            key={c}
                                            style={[
                                                styles.colorSwatch,
                                                { backgroundColor: c },
                                                drawColor === c && styles.colorSwatchActive
                                            ]}
                                            onPress={() => setDrawColor(c)}
                                        />
                                    ))}
                                </View>

                                <Pressable
                                    style={styles.clearDrawingsBtn}
                                    onPress={() => {
                                        const updated = edits.filter(
                                            e => !(e.pageIndex === currentPage && e.type === 'draw')
                                        );
                                        setEdits(updated);
                                        pushHistory(textBlocks, updated);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                    <Text style={styles.clearDrawingsText}>
                                        Effacer les dessins de cette page
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </ScrollView>

                    {/* Bottom CTA: Fast Transfer Electric Blue Save Button */}
                    <View style={styles.inspectorFooter}>
                        <Pressable
                            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#0B0C10" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                                    <Ionicons name="checkmark-circle" size={18} color="#0B0C10" />
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Signature Pad Component */}
            {Platform.OS === 'web' && (
                <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            )}
            <SignaturePad
                visible={signatureModalOpen}
                onClose={() => setSignatureModalOpen(false)}
                onSave={handleSignatureSave}
                colors={colors}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0C10'
    },
    // Top Bar
    topBar: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        zIndex: 50
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    titleContainer: {
        justifyContent: 'center'
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    subtitle: {
        fontSize: 11
    },
    masterPill: {
        flexDirection: 'row',
        backgroundColor: '#0F131D',
        borderRadius: 20,
        padding: 3,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginLeft: 8
    },
    masterPillOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        gap: 6
    },
    masterPillOptionActive: {
        backgroundColor: 'rgba(0, 210, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.4)'
    },
    masterPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    masterPillTextActive: {
        color: '#00D2FF'
    },
    topBarCenter: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    toolSegment: {
        flexDirection: 'row',
        backgroundColor: '#0F131D',
        borderRadius: 10,
        padding: 3,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)'
    },
    subToolBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6
    },
    subToolBtnActive: {
        backgroundColor: 'rgba(0, 210, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.35)'
    },
    subToolText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94A3B8'
    },
    subToolTextActive: {
        color: '#00D2FF',
        fontWeight: '600'
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    historyBtn: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    historyBtnDisabled: {
        opacity: 0.35
    },
    zoomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F131D',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 6
    },
    zoomBtn: {
        padding: 4
    },
    zoomText: {
        fontSize: 11,
        fontWeight: '600',
        minWidth: 34,
        textAlign: 'center'
    },
    // Main Studio
    mainStudio: {
        flex: 1,
        flexDirection: 'row',
        overflow: 'hidden'
    },
    // Left thumbnails
    leftThumbnailsPanel: {
        width: 140,
        borderRightWidth: 1,
        paddingVertical: 12
    },
    thumbHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 10,
        gap: 6
    },
    thumbHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5
    },
    thumbList: {
        paddingHorizontal: 12,
        gap: 12
    },
    thumbCard: {
        width: '100%',
        aspectRatio: 0.72,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3
    },
    thumbCardActive: {
        borderColor: '#00D2FF',
        shadowColor: '#00D2FF',
        shadowOpacity: 0.6,
        shadowRadius: 10
    },
    thumbBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    thumbBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    thumbEditDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#00D2FF'
    },
    thumbImage: {
        width: '100%',
        height: '100%'
    },
    // Center Workspace
    centerWorkspace: {
        flex: 1,
        backgroundColor: '#0B0C10'
    },
    centerWorkspaceContent: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%'
    },
    canvasWrapper: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    pageSheet: {
        width: 780,
        height: 551,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
        elevation: 10
    },
    pageBackground: {
        width: '100%',
        height: '100%'
    },
    // Floating Bottom Pill
    floatingBottomPill: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 7,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
        zIndex: 60
    },
    floatingNavBtn: {
        padding: 4
    },
    floatingPageText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    floatingZoomText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#CBD5E1',
        minWidth: 36,
        textAlign: 'center'
    },
    floatingDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.15)'
    },
    // Right Inspector Panel
    rightInspectorPanel: {
        width: 310,
        borderLeftWidth: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    inspectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
        gap: 8
    },
    inspectorTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    inspectorBody: {
        flex: 1,
        padding: 16
    },
    inspectorSection: {
        gap: 14
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#CBD5E1',
        marginTop: 4
    },
    segmentRow: {
        flexDirection: 'row',
        backgroundColor: '#0F131D',
        borderRadius: 8,
        padding: 3,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)'
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6
    },
    segmentBtnActive: {
        backgroundColor: 'rgba(0, 210, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.4)'
    },
    segmentBtnText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8'
    },
    segmentBtnTextActive: {
        color: '#00D2FF',
        fontWeight: '700'
    },
    sizeStepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F131D',
        borderRadius: 8,
        padding: 4,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)'
    },
    stepperBtn: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    stepperValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    styleButtonsRow: {
        flexDirection: 'row',
        gap: 8
    },
    formatBtn: {
        flex: 1,
        height: 36,
        borderRadius: 6,
        backgroundColor: '#0F131D',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)'
    },
    formatBtnActive: {
        backgroundColor: 'rgba(0, 210, 255, 0.15)',
        borderColor: '#00D2FF'
    },
    formatBtnText: {
        fontSize: 13,
        color: '#94A3B8'
    },
    formatBtnTextActive: {
        color: '#00D2FF'
    },
    colorPalette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    colorSwatch: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)'
    },
    colorSwatchActive: {
        borderColor: '#00D2FF',
        transform: [{ scale: 1.15 }]
    },
    blockActionButtons: {
        marginTop: 10,
        gap: 8
    },
    deleteBlockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        gap: 6
    },
    deleteBlockText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444'
    },
    resetBlockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 8,
        gap: 6
    },
    resetBlockText: {
        fontSize: 11,
        color: '#94A3B8'
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 210, 255, 0.06)',
        borderRadius: 8,
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.2)'
    },
    infoBoxText: {
        flex: 1,
        fontSize: 12,
        color: '#CBD5E1',
        lineHeight: 18
    },
    quickAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 14,
        backgroundColor: '#0F131D',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 8
    },
    quickAddText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF'
    },
    clearDrawingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.25)',
        gap: 6,
        marginTop: 6
    },
    clearDrawingsText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#EF4444'
    },
    inspectorFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)'
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00D2FF',
        borderRadius: 10,
        paddingVertical: 13,
        gap: 8,
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5
    },
    saveBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0B0C10'
    }
});
