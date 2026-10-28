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
    ActivityIndicator,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import SignaturePad, { SignatureData } from './SignaturePad';
import PdfEditItemView from './PdfEditItemView';

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
    signatureData?: SignatureData;
    shapeType?: 'rectangle' | 'circle' | 'line';
    opacity?: number;
}

interface PdfEditorProps {
    pages: string[]; // Blob URLs of images
    onComplete: (edits: PdfEditItem[]) => void;
    onCancel: () => void;
    colors: any;
    autoOpenSignTool?: boolean;
    restrictedMode?: boolean;
}

const PRESET_COLORS = [
    '#000000',
    '#ffffff',
    '#ef4444',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#475569'
];

export default function PdfEditor({
    pages,
    onComplete,
    onCancel,
    colors,
    autoOpenSignTool,
    restrictedMode
}: PdfEditorProps) {
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 980;

    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [edits, setEdits] = useState<PdfEditItem[]>([]);
    const [activeTool, setActiveTool] = useState<PdfEditType | null>(autoOpenSignTool ? 'signature' : 'text');
    const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

    // Zoom state
    const [zoom, setZoom] = useState<number>(100);

    // Canvas size
    const [canvasSize, setCanvasSize] = useState({ width: 700, height: 990 });

    // History stack for Undo / Redo
    const [history, setHistory] = useState<PdfEditItem[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Text formatting state
    const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');
    const [selectedSize, setSelectedSize] = useState(20);
    const [selectedWeight, setSelectedWeight] = useState<'normal' | 'bold'>('normal');
    const [selectedStyle, setSelectedStyle] = useState<'normal' | 'italic'>('normal');
    const [isUnderline, setIsUnderline] = useState(false);
    const [selectedAlign, setSelectedAlign] = useState<'left' | 'center' | 'right'>('left');
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [hasTextBg, setHasTextBg] = useState(false);

    // Draw / Ink (Annoter) state
    const [drawMode, setDrawMode] = useState<'pen' | 'highlighter'>('pen');
    const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPathPoints, setCurrentPathPoints] = useState<{ x: number; y: number }[]>([]);

    // Shape state
    const [shapeType, setShapeType] = useState<'rectangle' | 'circle' | 'line'>('rectangle');
    const [shapeStrokeWidth, setShapeStrokeWidth] = useState(3);

    // Whiteout drag state
    const [drawingWhiteout, setDrawingWhiteout] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

    // Signature Pad modal
    const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);

    useEffect(() => {
        if (autoOpenSignTool) {
            setActiveTool('signature');
            setIsSignaturePadOpen(true);
        }
    }, [autoOpenSignTool]);

    // Push state to history
    const pushHistory = (newEdits: PdfEditItem[]) => {
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push(newEdits);
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        setEdits(newEdits);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setEdits(history[newIndex]);
            setSelectedEditId(null);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setEdits(history[newIndex]);
            setSelectedEditId(null);
        }
    };

    // Synchronize properties when an edit is selected
    useEffect(() => {
        if (selectedEditId) {
            const item = edits.find(e => e.id === selectedEditId);
            if (item) {
                if (item.type === 'text') {
                    if (item.color) setSelectedColor(item.color);
                    if (item.size) setSelectedSize(item.size);
                    if (item.fontWeight) setSelectedWeight(item.fontWeight);
                    if (item.fontStyle) setSelectedStyle(item.fontStyle);
                    if (item.textAlign) setSelectedAlign(item.textAlign);
                    if (item.fontFamily) setFontFamily(item.fontFamily);
                    setIsUnderline(!!item.isUnderline);
                    setHasTextBg(!!item.backgroundColor);
                    setActiveTool('text');
                } else if (item.type === 'draw') {
                    if (item.color) setSelectedColor(item.color);
                    if (item.size) setDrawStrokeWidth(item.size);
                    setActiveTool('draw');
                } else if (item.type === 'shape') {
                    if (item.color) setSelectedColor(item.color);
                    if (item.size) setShapeStrokeWidth(item.size);
                    if (item.shapeType) setShapeType(item.shapeType);
                    setActiveTool('shape');
                } else if (item.type === 'whiteout') {
                    setActiveTool('whiteout');
                }
            }
        }
    }, [selectedEditId]);

    // Update formatting for currently selected edit item
    const updateActiveItem = (updates: Partial<PdfEditItem>) => {
        if (selectedEditId) {
            const updated = edits.map(e => (e.id === selectedEditId ? { ...e, ...updates } : e));
            pushHistory(updated);
        }
    };

    // Add a new Text Box
    const addTextEdit = (xPercent: number, yPercent: number) => {
        const newEdit: PdfEditItem = {
            id: Date.now().toString(),
            pageIndex: currentPageIndex,
            type: 'text',
            x: Math.max(2, Math.min(80, xPercent)),
            y: Math.max(2, Math.min(90, yPercent)),
            width: 30,
            height: 6,
            text: '',
            color: selectedColor,
            size: selectedSize,
            fontFamily,
            fontWeight: selectedWeight,
            fontStyle: selectedStyle,
            textAlign: selectedAlign,
            isUnderline,
            backgroundColor: hasTextBg ? '#ffffff' : undefined
        };
        const updated = [...edits, newEdit];
        pushHistory(updated);
        setSelectedEditId(newEdit.id);
    };

    // Add a Shape
    const addShape = (type: 'rectangle' | 'circle' | 'line', xPercent = 35, yPercent = 35) => {
        const newEdit: PdfEditItem = {
            id: Date.now().toString(),
            pageIndex: currentPageIndex,
            type: 'shape',
            shapeType: type,
            x: xPercent,
            y: yPercent,
            width: type === 'line' ? 30 : 22,
            height: type === 'line' ? 2 : 14,
            color: selectedColor,
            size: shapeStrokeWidth
        };
        const updated = [...edits, newEdit];
        pushHistory(updated);
        setSelectedEditId(newEdit.id);
    };

    // Add a Whiteout Box
    const addWhiteoutBox = (xPercent = 30, yPercent = 40, width = 25, height = 5) => {
        const newEdit: PdfEditItem = {
            id: Date.now().toString(),
            pageIndex: currentPageIndex,
            type: 'whiteout',
            x: xPercent,
            y: yPercent,
            width,
            height,
            backgroundColor: '#ffffff',
            color: '#ffffff'
        };
        const updated = [...edits, newEdit];
        pushHistory(updated);
        setSelectedEditId(newEdit.id);
    };

    // Signature Save
    const handleSignatureSave = (signature: SignatureData) => {
        const newEdit: PdfEditItem = {
            id: Date.now().toString(),
            pageIndex: currentPageIndex,
            type: 'signature',
            x: 35,
            y: 45,
            width: 25,
            height: 12,
            signatureData: signature
        };
        const updated = [...edits, newEdit];
        pushHistory(updated);
        setSelectedEditId(newEdit.id);
    };

    // Duplicate an item
    const duplicateEdit = (id: string) => {
        const item = edits.find(e => e.id === id);
        if (!item) return;
        const newItem: PdfEditItem = {
            ...item,
            id: Date.now().toString(),
            x: Math.min(85, item.x + 4),
            y: Math.min(90, item.y + 4)
        };
        const updated = [...edits, newItem];
        pushHistory(updated);
        setSelectedEditId(newItem.id);
    };

    // Remove an item
    const removeEdit = (id: string) => {
        const updated = edits.filter(e => e.id !== id);
        pushHistory(updated);
        if (selectedEditId === id) setSelectedEditId(null);
    };

    // Clear drawings for current page
    const clearDrawingsForCurrentPage = () => {
        const updated = edits.filter(e => !(e.pageIndex === currentPageIndex && e.type === 'draw'));
        pushHistory(updated);
    };

    // Helper to calculate percentages from mouse/touch event
    const getCoordinates = (e: any) => {
        let x = 0;
        let y = 0;
        try {
            if (Platform.OS === 'web') {
                const nativeEvent = e.nativeEvent || e;
                const overlay = document.getElementById('pdf-canvas-overlay');
                if (overlay) {
                    const rect = overlay.getBoundingClientRect();
                    const clientX = nativeEvent.clientX ?? (nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0].clientX : 0);
                    const clientY = nativeEvent.clientY ?? (nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0].clientY : 0);
                    x = ((clientX - rect.left) / rect.width) * 100;
                    y = ((clientY - rect.top) / rect.height) * 100;
                }
            } else {
                x = (e.nativeEvent.locationX / canvasSize.width) * 100;
                y = (e.nativeEvent.locationY / canvasSize.height) * 100;
            }
        } catch (err) {
            console.warn("Coords error", err);
        }
        return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    };

    // Freehand drawing mouse handlers (Annoter / Encre)
    const handleDrawStart = (e: any) => {
        if (activeTool !== 'draw') return;
        const nativeEvent = e.nativeEvent || e;
        const overlay = document.getElementById('pdf-canvas-overlay');
        if (!overlay) return;
        const rect = overlay.getBoundingClientRect();
        const clientX = nativeEvent.clientX ?? (nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0].clientX : 0);
        const clientY = nativeEvent.clientY ?? (nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0].clientY : 0);
        const px = clientX - rect.left;
        const py = clientY - rect.top;

        setIsDrawing(true);
        setCurrentPathPoints([{ x: px, y: py }]);
    };

    const handleDrawMove = (e: any) => {
        if (!isDrawing || activeTool !== 'draw') return;
        const nativeEvent = e.nativeEvent || e;
        const overlay = document.getElementById('pdf-canvas-overlay');
        if (!overlay) return;
        const rect = overlay.getBoundingClientRect();
        const clientX = nativeEvent.clientX ?? (nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0].clientX : 0);
        const clientY = nativeEvent.clientY ?? (nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0].clientY : 0);
        const px = clientX - rect.left;
        const py = clientY - rect.top;

        setCurrentPathPoints(prev => [...prev, { x: px, y: py }]);
    };

    const handleDrawEnd = () => {
        if (!isDrawing || activeTool !== 'draw') return;
        setIsDrawing(false);

        if (currentPathPoints.length > 1) {
            let svgPath = `M ${currentPathPoints[0].x.toFixed(1)} ${currentPathPoints[0].y.toFixed(1)}`;
            for (let i = 1; i < currentPathPoints.length; i++) {
                svgPath += ` L ${currentPathPoints[i].x.toFixed(1)} ${currentPathPoints[i].y.toFixed(1)}`;
            }

            const newDrawEdit: PdfEditItem = {
                id: Date.now().toString(),
                pageIndex: currentPageIndex,
                type: 'draw',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                color: selectedColor,
                size: drawStrokeWidth,
                opacity: drawMode === 'highlighter' ? 0.35 : 1,
                signatureData: {
                    type: 'path',
                    data: svgPath,
                    width: canvasSize.width,
                    height: canvasSize.height
                }
            };
            const updated = [...edits, newDrawEdit];
            pushHistory(updated);
        }
        setCurrentPathPoints([]);
    };

    // Canvas click
    const handleCanvasPress = (e: any) => {
        if (selectedEditId) {
            setSelectedEditId(null);
        }
        if (activeTool === 'text') {
            const coords = getCoordinates(e);
            addTextEdit(coords.x, coords.y);
        } else if (activeTool === 'whiteout') {
            const coords = getCoordinates(e);
            addWhiteoutBox(coords.x, coords.y, 20, 5);
        } else if (activeTool === 'shape') {
            const coords = getCoordinates(e);
            addShape(shapeType, coords.x, coords.y);
        }
    };

    // Active item being inspected
    const activeEdit = edits.find(e => e.id === selectedEditId);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Signature Fast Transfer Glowing Halo */}
            <View
                style={[
                    styles.backgroundGlow,
                    {
                        backgroundColor: colors.glow || 'rgba(59, 130, 246, 0.03)',
                        shadowColor: colors.primary
                    }
                ]}
                pointerEvents="none"
            />

            {/* TOP BAR */}
            <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                {/* Left: Back & Title */}
                <View style={styles.topBarLeft}>
                    <Pressable
                        style={({ pressed }: any) => [
                            styles.iconButton,
                            { backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)' }
                        ]}
                        onPress={onCancel}
                    >
                        <Ionicons name="close" size={20} color={colors.text} />
                    </Pressable>
                    <View>
                        <Text style={[styles.topBarTitle, { color: colors.text }]}>
                            {autoOpenSignTool ? 'Signer PDF' : 'Modifier PDF'}
                        </Text>
                        <Text style={[styles.topBarSubtitle, { color: colors.textMuted }]}>
                            Page {currentPageIndex + 1} sur {pages.length}
                        </Text>
                    </View>
                </View>

                {/* Center: Tools Switcher (iLovePDF Style) */}
                <View style={[styles.toolsSwitcher, { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: colors.border }]}>
                    {!restrictedMode && (
                        <Pressable
                            style={[
                                styles.toolPill,
                                activeTool === 'text' && [styles.toolPillActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => {
                                setActiveTool(activeTool === 'text' ? null : 'text');
                                setSelectedEditId(null);
                            }}
                        >
                            <Ionicons name="text" size={17} color={activeTool === 'text' ? '#ffffff' : colors.textMuted} />
                            <Text style={[styles.toolPillText, { color: activeTool === 'text' ? '#ffffff' : colors.textMuted }]}>
                                Texte
                            </Text>
                        </Pressable>
                    )}

                    {!restrictedMode && (
                        <Pressable
                            style={[
                                styles.toolPill,
                                activeTool === 'draw' && [styles.toolPillActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => {
                                setActiveTool(activeTool === 'draw' ? null : 'draw');
                                setSelectedEditId(null);
                            }}
                        >
                            <Ionicons name="brush" size={17} color={activeTool === 'draw' ? '#ffffff' : colors.textMuted} />
                            <Text style={[styles.toolPillText, { color: activeTool === 'draw' ? '#ffffff' : colors.textMuted }]}>
                                Annoter
                            </Text>
                        </Pressable>
                    )}

                    {!restrictedMode && (
                        <Pressable
                            style={[
                                styles.toolPill,
                                activeTool === 'shape' && [styles.toolPillActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => {
                                setActiveTool(activeTool === 'shape' ? null : 'shape');
                                setSelectedEditId(null);
                            }}
                        >
                            <Ionicons name="shapes" size={17} color={activeTool === 'shape' ? '#ffffff' : colors.textMuted} />
                            <Text style={[styles.toolPillText, { color: activeTool === 'shape' ? '#ffffff' : colors.textMuted }]}>
                                Formes
                            </Text>
                        </Pressable>
                    )}

                    {!restrictedMode && (
                        <Pressable
                            style={[
                                styles.toolPill,
                                activeTool === 'whiteout' && [styles.toolPillActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => {
                                setActiveTool(activeTool === 'whiteout' ? null : 'whiteout');
                                setSelectedEditId(null);
                            }}
                        >
                            <Ionicons name="square" size={17} color={activeTool === 'whiteout' ? '#ffffff' : colors.textMuted} />
                            <Text style={[styles.toolPillText, { color: activeTool === 'whiteout' ? '#ffffff' : colors.textMuted }]}>
                                Gomme
                            </Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={[
                            styles.toolPill,
                            activeTool === 'signature' && [styles.toolPillActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => {
                            setActiveTool('signature');
                            setIsSignaturePadOpen(true);
                        }}
                    >
                        <Ionicons name="create" size={17} color={activeTool === 'signature' ? '#ffffff' : colors.textMuted} />
                        <Text style={[styles.toolPillText, { color: activeTool === 'signature' ? '#ffffff' : colors.textMuted }]}>
                            Signer
                        </Text>
                    </Pressable>
                </View>

                {/* Right: History & Zoom */}
                <View style={styles.topBarRight}>
                    {/* Undo / Redo */}
                    <View style={styles.historyGroup}>
                        <Pressable
                            onPress={handleUndo}
                            disabled={historyIndex === 0}
                            style={[styles.historyBtn, historyIndex === 0 && { opacity: 0.3 }]}
                            accessibilityLabel="Annuler"
                        >
                            <Ionicons name="arrow-undo" size={18} color={colors.text} />
                        </Pressable>
                        <Pressable
                            onPress={handleRedo}
                            disabled={historyIndex === history.length - 1}
                            style={[styles.historyBtn, historyIndex === history.length - 1 && { opacity: 0.3 }]}
                            accessibilityLabel="Rétablir"
                        >
                            <Ionicons name="arrow-redo" size={18} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* Zoom Stepper */}
                    <View style={[styles.zoomStepper, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                        <Pressable
                            onPress={() => setZoom(Math.max(60, zoom - 15))}
                            style={styles.zoomBtn}
                        >
                            <Ionicons name="remove" size={14} color={colors.text} />
                        </Pressable>
                        <Text style={[styles.zoomText, { color: colors.text }]}>{zoom}%</Text>
                        <Pressable
                            onPress={() => setZoom(Math.min(160, zoom + 15))}
                            style={styles.zoomBtn}
                        >
                            <Ionicons name="add" size={14} color={colors.text} />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* MAIN 3-PANEL LAYOUT */}
            <View style={styles.mainLayout}>
                {/* 1. LEFT PANEL: PAGE THUMBNAILS NAVIGATOR */}
                <View style={[styles.leftNav, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
                    <Text style={[styles.leftNavTitle, { color: colors.textMuted }]}>PAGES</Text>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.leftNavScroll}>
                        {pages.map((pageUrl, index) => {
                            const isCurrent = currentPageIndex === index;
                            return (
                                <Pressable
                                    key={`thumb-${index}`}
                                    style={[
                                        styles.thumbCard,
                                        { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.02)' },
                                        isCurrent && { borderColor: colors.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => {
                                        setCurrentPageIndex(index);
                                        setSelectedEditId(null);
                                    }}
                                >
                                    <View style={[styles.thumbBadge, isCurrent && { backgroundColor: colors.primary }]}>
                                        <Text style={styles.thumbBadgeText}>{index + 1}</Text>
                                    </View>
                                    <Image source={{ uri: pageUrl }} style={styles.thumbImage} resizeMode="contain" />
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 2. CENTER AREA: SCROLLABLE DOCUMENT CANVAS */}
                <ScrollView
                    style={styles.centerCanvasScroll}
                    contentContainerStyle={styles.centerCanvasContent}
                    showsVerticalScrollIndicator={true}
                    showsHorizontalScrollIndicator={true}
                >
                    <View
                        style={[
                            styles.pageSheetWrapper,
                            {
                                transform: [{ scale: zoom / 100 }],
                                width: canvasSize.width,
                                height: canvasSize.height
                            }
                        ]}
                    >
                        {/* Realistic white paper sheet with drop shadow */}
                        <Image
                            source={{ uri: pages[currentPageIndex] }}
                            style={styles.pageSheetImage}
                            resizeMode="contain"
                        />

                        {/* Interactive Overlay */}
                        <Pressable
                            nativeID="pdf-canvas-overlay"
                            style={styles.interactionOverlay}
                            onLayout={e => {
                                setCanvasSize({
                                    width: e.nativeEvent.layout.width,
                                    height: e.nativeEvent.layout.height
                                });
                            }}
                            onPress={handleCanvasPress}
                        >
                            {/* Render all existing edits on this page */}
                            {edits
                                .filter(e => e.pageIndex === currentPageIndex)
                                .map(edit => {
                                    const isSelected = edit.id === selectedEditId;

                                    // Special render for SVG freehand drawings
                                    if (edit.type === 'draw' && edit.signatureData?.data) {
                                        return (
                                            <Pressable
                                                key={edit.id}
                                                style={[styles.drawItemWrapper, isSelected && styles.drawItemSelected]}
                                                onPress={() => setSelectedEditId(edit.id)}
                                            >
                                                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                                                    <Path
                                                        d={edit.signatureData.data}
                                                        stroke={edit.color || '#000000'}
                                                        strokeWidth={edit.size || 3}
                                                        fill="none"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        opacity={edit.opacity || 1}
                                                    />
                                                </Svg>
                                                {isSelected && (
                                                    <Pressable
                                                        onPress={() => removeEdit(edit.id)}
                                                        style={styles.drawDeleteBtn}
                                                    >
                                                        <Ionicons name="trash" size={14} color="#ffffff" />
                                                    </Pressable>
                                                )}
                                            </Pressable>
                                        );
                                    }

                                    return (
                                        <View
                                            key={edit.id}
                                            style={{
                                                position: 'absolute',
                                                left: `${edit.x}%`,
                                                top: `${edit.y}%`,
                                                width: edit.width ? `${edit.width}%` : undefined,
                                                height: edit.height ? `${edit.height}%` : undefined,
                                                zIndex: isSelected ? 100 : 10
                                            }}
                                        >
                                            <PdfEditItemView
                                                edit={edit}
                                                isSelected={isSelected}
                                                canvasSize={canvasSize}
                                                onSelect={() => setSelectedEditId(edit.id)}
                                                onRemove={() => removeEdit(edit.id)}
                                                onDuplicate={() => duplicateEdit(edit.id)}
                                                onChangeText={t => {
                                                    const updated = edits.map(item =>
                                                        item.id === edit.id ? { ...item, text: t } : item
                                                    );
                                                    setEdits(updated);
                                                }}
                                                onResize={(w, h) => {
                                                    const updated = edits.map(item =>
                                                        item.id === edit.id ? { ...item, width: w, height: h } : item
                                                    );
                                                    setEdits(updated);
                                                }}
                                                panHandlers={{
                                                    onStartShouldSetResponder: () => true,
                                                    onMoveShouldSetResponder: () => true,
                                                    onResponderMove: (e: any) => {
                                                        const coords = getCoordinates(e);
                                                        setEdits(prev =>
                                                            prev.map(item =>
                                                                item.id === edit.id
                                                                    ? { ...item, x: coords.x, y: coords.y }
                                                                    : item
                                                            )
                                                        );
                                                    }
                                                }}
                                            />
                                        </View>
                                    );
                                })}

                            {/* Live Freehand Drawing Preview Layer (Annoter) */}
                            {activeTool === 'draw' && (
                                <View
                                    style={[styles.interactionOverlay, { zIndex: 120, cursor: 'crosshair' as any }]}
                                    onStartShouldSetResponder={() => true}
                                    onMoveShouldSetResponder={() => true}
                                    onResponderGrant={handleDrawStart}
                                    onResponderMove={handleDrawMove}
                                    onResponderRelease={handleDrawEnd}
                                    onResponderTerminate={handleDrawEnd}
                                >
                                    {currentPathPoints.length > 1 && (
                                        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                                            <Path
                                                d={`M ${currentPathPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`}
                                                stroke={selectedColor}
                                                strokeWidth={drawStrokeWidth}
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={drawMode === 'highlighter' ? 0.35 : 1}
                                            />
                                        </Svg>
                                    )}
                                </View>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>

                {/* 3. RIGHT PANEL: PROPERTIES INSPECTOR (Styles de texte / Outils) */}
                <View style={[styles.rightSidebar, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
                    <ScrollView
                        style={styles.sidebarScroll}
                        contentContainerStyle={styles.sidebarContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* A. TEXT PROPERTIES PANEL */}
                        {(activeTool === 'text' || activeEdit?.type === 'text') && (
                            <View style={styles.sectionBlock}>
                                <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
                                    <Ionicons name="text" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.sidebarTitle, { color: colors.text }]}>Styles de texte</Text>
                                </View>

                                {/* Police */}
                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Police</Text>
                                <View style={styles.pillsRow}>
                                    {(['Helvetica', 'TimesRoman', 'Courier'] as const).map(f => {
                                        const names = { Helvetica: 'Arial', TimesRoman: 'Times', Courier: 'Courier' };
                                        const isSel = fontFamily === f;
                                        return (
                                            <Pressable
                                                key={f}
                                                style={[
                                                    styles.selectorPill,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    isSel && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    setFontFamily(f);
                                                    updateActiveItem({ fontFamily: f });
                                                }}
                                            >
                                                <Text style={[styles.selectorPillText, { color: isSel ? colors.primary : colors.textMuted }]}>
                                                    {names[f]}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Taille & Styles B, I, U */}
                                <View style={styles.rowBetween}>
                                    <View>
                                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Taille</Text>
                                        <View style={[styles.stepperBox, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                                            <Pressable
                                                style={[styles.stepperBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                                onPress={() => {
                                                    const s = Math.max(10, selectedSize - 2);
                                                    setSelectedSize(s);
                                                    updateActiveItem({ size: s });
                                                }}
                                            >
                                                <Ionicons name="remove" size={14} color={colors.text} />
                                            </Pressable>
                                            <Text style={[styles.stepperValue, { color: colors.text }]}>{selectedSize}pt</Text>
                                            <Pressable
                                                style={[styles.stepperBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                                onPress={() => {
                                                    const s = Math.min(64, selectedSize + 2);
                                                    setSelectedSize(s);
                                                    updateActiveItem({ size: s });
                                                }}
                                            >
                                                <Ionicons name="add" size={14} color={colors.text} />
                                            </Pressable>
                                        </View>
                                    </View>

                                    <View>
                                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Format</Text>
                                        <View style={styles.styleButtonsRow}>
                                            <Pressable
                                                style={[
                                                    styles.styleBtn,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    selectedWeight === 'bold' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    const w = selectedWeight === 'bold' ? 'normal' : 'bold';
                                                    setSelectedWeight(w);
                                                    updateActiveItem({ fontWeight: w });
                                                }}
                                            >
                                                <Text style={{ fontWeight: 'bold', color: selectedWeight === 'bold' ? '#fff' : colors.text }}>B</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[
                                                    styles.styleBtn,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    selectedStyle === 'italic' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    const st = selectedStyle === 'italic' ? 'normal' : 'italic';
                                                    setSelectedStyle(st);
                                                    updateActiveItem({ fontStyle: st });
                                                }}
                                            >
                                                <Text style={{ fontStyle: 'italic', color: selectedStyle === 'italic' ? '#fff' : colors.text }}>I</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[
                                                    styles.styleBtn,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    isUnderline && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    const u = !isUnderline;
                                                    setIsUnderline(u);
                                                    updateActiveItem({ isUnderline: u });
                                                }}
                                            >
                                                <Text style={{ textDecorationLine: 'underline', color: isUnderline ? '#fff' : colors.text }}>U</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>

                                {/* Alignement */}
                                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Alignement</Text>
                                <View style={styles.pillsRow}>
                                    {(['left', 'center', 'right'] as const).map(al => {
                                        const isSel = selectedAlign === al;
                                        const icons = { left: 'menu-outline', center: 'reorder-two-outline', right: 'menu-outline' };
                                        return (
                                            <Pressable
                                                key={al}
                                                style={[
                                                    styles.selectorPill,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    isSel && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    setSelectedAlign(al);
                                                    updateActiveItem({ textAlign: al });
                                                }}
                                            >
                                                <Ionicons name={icons[al] as any} size={16} color={isSel ? colors.primary : colors.textMuted} />
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Couleur actuelle & Palette */}
                                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Couleur du texte</Text>
                                <View style={styles.colorSwatchesGroup}>
                                    {PRESET_COLORS.map(c => {
                                        const isSel = selectedColor === c;
                                        return (
                                            <Pressable
                                                key={c}
                                                style={[
                                                    styles.colorCircle,
                                                    { backgroundColor: c },
                                                    isSel && styles.colorCircleActive
                                                ]}
                                                onPress={() => {
                                                    setSelectedColor(c);
                                                    updateActiveItem({ color: c });
                                                }}
                                            >
                                                {isSel && <Ionicons name="checkmark" size={12} color={c === '#ffffff' ? '#000000' : '#ffffff'} />}
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Masquage de fond */}
                                <Pressable
                                    style={styles.checkboxRow}
                                    onPress={() => {
                                        const bg = !hasTextBg;
                                        setHasTextBg(bg);
                                        updateActiveItem({ backgroundColor: bg ? '#ffffff' : undefined });
                                    }}
                                >
                                    <Ionicons
                                        name={hasTextBg ? 'checkbox' : 'square-outline'}
                                        size={18}
                                        color={hasTextBg ? colors.primary : colors.textMuted}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                                        Boîte de fond opaque (masquage)
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {/* B. DRAW / ANNOTER PROPERTIES PANEL */}
                        {activeTool === 'draw' && (
                            <View style={styles.sectionBlock}>
                                <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
                                    <Ionicons name="brush" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.sidebarTitle, { color: colors.text }]}>Styles d'annotation</Text>
                                </View>

                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Mode de dessin</Text>
                                <View style={styles.pillsRow}>
                                    <Pressable
                                        style={[
                                            styles.selectorPill,
                                            { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                            drawMode === 'pen' && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary }
                                        ]}
                                        onPress={() => setDrawMode('pen')}
                                    >
                                        <Text style={[styles.selectorPillText, { color: drawMode === 'pen' ? colors.primary : colors.textMuted }]}>
                                            Stylo (Opaque)
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.selectorPill,
                                            { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                            drawMode === 'highlighter' && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary }
                                        ]}
                                        onPress={() => {
                                            setDrawMode('highlighter');
                                            setSelectedColor('#f59e0b');
                                            setDrawStrokeWidth(8);
                                        }}
                                    >
                                        <Text style={[styles.selectorPillText, { color: drawMode === 'highlighter' ? colors.primary : colors.textMuted }]}>
                                            Surligneur
                                        </Text>
                                    </Pressable>
                                </View>

                                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Épaisseur du trait</Text>
                                <View style={styles.pillsRow}>
                                    {[2, 4, 8, 14].map(w => {
                                        const isSel = drawStrokeWidth === w;
                                        return (
                                            <Pressable
                                                key={w}
                                                style={[
                                                    styles.selectorPill,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    isSel && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary }
                                                ]}
                                                onPress={() => setDrawStrokeWidth(w)}
                                            >
                                                <Text style={[styles.selectorPillText, { color: isSel ? colors.primary : colors.textMuted }]}>
                                                    {w}px
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Couleur du trait</Text>
                                <View style={styles.colorSwatchesGroup}>
                                    {PRESET_COLORS.map(c => {
                                        const isSel = selectedColor === c;
                                        return (
                                            <Pressable
                                                key={c}
                                                style={[
                                                    styles.colorCircle,
                                                    { backgroundColor: c },
                                                    isSel && styles.colorCircleActive
                                                ]}
                                                onPress={() => setSelectedColor(c)}
                                            >
                                                {isSel && <Ionicons name="checkmark" size={12} color={c === '#ffffff' ? '#000000' : '#ffffff'} />}
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Pressable
                                    style={[styles.outlineActionBtn, { borderColor: colors.border, marginTop: 20 }]}
                                    onPress={clearDrawingsForCurrentPage}
                                >
                                    <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
                                        Effacer les dessins de cette page
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {/* C. SHAPE PROPERTIES PANEL */}
                        {activeTool === 'shape' && (
                            <View style={styles.sectionBlock}>
                                <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
                                    <Ionicons name="shapes" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.sidebarTitle, { color: colors.text }]}>Options de forme</Text>
                                </View>

                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Type de forme</Text>
                                <View style={styles.pillsRow}>
                                    {(['rectangle', 'circle', 'line'] as const).map(sh => {
                                        const names = { rectangle: 'Rectangle', circle: 'Cercle', line: 'Ligne' };
                                        const isSel = shapeType === sh;
                                        return (
                                            <Pressable
                                                key={sh}
                                                style={[
                                                    styles.selectorPill,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    isSel && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    setShapeType(sh);
                                                    updateActiveItem({ shapeType: sh });
                                                }}
                                            >
                                                <Text style={[styles.selectorPillText, { color: isSel ? colors.primary : colors.textMuted }]}>
                                                    {names[sh]}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Pressable
                                    style={[styles.actionPrimaryBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary, marginTop: 14 }]}
                                    onPress={() => addShape(shapeType)}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                                        Insérer la forme sur la page
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {/* D. WHITEOUT PROPERTIES PANEL */}
                        {activeTool === 'whiteout' && (
                            <View style={styles.sectionBlock}>
                                <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
                                    <Ionicons name="square" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.sidebarTitle, { color: colors.text }]}>Outil Gomme (Masquage)</Text>
                                </View>

                                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                                    Cliquez sur le document pour effacer ou masquer du texte existant avec un bloc blanc opaque.
                                </Text>

                                <Pressable
                                    style={[styles.actionPrimaryBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.primary, marginTop: 14 }]}
                                    onPress={() => addWhiteoutBox(30, 40, 30, 6)}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                                        Ajouter un bloc blanc
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </ScrollView>

                    {/* BIG FAST TRANSFER ACTION CTA (Enregistrer les modifications) */}
                    <View style={[styles.ctaContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                        <Pressable
                            style={({ pressed }: any) => [
                                styles.ctaButton,
                                { backgroundColor: colors.primary },
                                pressed && styles.ctaButtonPressed
                            ]}
                            onPress={() => onComplete(edits)}
                        >
                            <Text style={styles.ctaButtonText}>Enregistrer les modifications</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* SIGNATURE PAD MODAL */}
            <SignaturePad
                visible={isSignaturePadOpen}
                onClose={() => setIsSignaturePadOpen(false)}
                onSave={handleSignatureSave}
                colors={colors}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
    },
    backgroundGlow: {
        position: 'absolute',
        top: -150,
        left: '50%',
        transform: [{ translateX: -400 }],
        width: 800,
        height: 800,
        borderRadius: 400,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 140,
        zIndex: 0,
    },
    topBar: {
        height: 62,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 20,
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
    },
    topBarTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    topBarSubtitle: {
        fontSize: 11,
    },
    toolsSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
    },
    toolPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 7,
        gap: 6,
    },
    toolPillActive: {
        shadowColor: '#3b82f6',
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    toolPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    historyGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    historyBtn: {
        padding: 6,
        borderRadius: 6,
    },
    zoomStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
        overflow: 'hidden',
    },
    zoomBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    zoomText: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 6,
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
        zIndex: 1,
    },
    leftNav: {
        width: 150,
        borderRightWidth: 1,
        paddingTop: 14,
    },
    leftNavTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    leftNavScroll: {
        paddingHorizontal: 14,
        paddingBottom: 30,
        gap: 14,
    },
    thumbCard: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    thumbBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: '#475569',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 10,
    },
    thumbBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    centerCanvasScroll: {
        flex: 1,
    },
    centerCanvasContent: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
    },
    pageSheetWrapper: {
        backgroundColor: '#ffffff',
        borderRadius: 6,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 10,
    },
    pageSheetImage: {
        width: '100%',
        height: '100%',
    },
    interactionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    drawItemWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    drawItemSelected: {
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
    },
    drawDeleteBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#ef4444',
        padding: 6,
        borderRadius: 6,
        zIndex: 150,
    },
    rightSidebar: {
        width: 330,
        borderLeftWidth: 1,
        flexDirection: 'column',
    },
    sidebarScroll: {
        flex: 1,
    },
    sidebarContent: {
        padding: 20,
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: 1,
        marginBottom: 18,
    },
    sidebarTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionBlock: {
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    selectorPill: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    stepperBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
        overflow: 'hidden',
    },
    stepperBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    stepperValue: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 8,
    },
    styleButtonsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    styleBtn: {
        width: 32,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorSwatchesGroup: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    colorCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    colorCircleActive: {
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 3,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    checkboxLabel: {
        fontSize: 12,
        marginLeft: 8,
    },
    hintText: {
        fontSize: 12,
        lineHeight: 18,
    },
    outlineActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    actionPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    ctaContainer: {
        padding: 18,
        borderTopWidth: 1,
    },
    ctaButton: {
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    ctaButtonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    ctaButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
});
