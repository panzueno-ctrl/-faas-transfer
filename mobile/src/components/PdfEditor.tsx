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
    Dimensions,
    PanResponder,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const DraggableItem = ({ x, y, canvasSize, onDragEnd, isSelected, onSelect, children }: any) => {
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                if (onSelect) onSelect();
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (e, gestureState) => {
                const percentDx = (gestureState.dx / canvasSize.width) * 100;
                const percentDy = (gestureState.dy / canvasSize.height) * 100;
                onDragEnd(x + percentDx, y + percentDy);
                pan.setValue({ x: 0, y: 0 });
            }
        })
    ).current;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
                flexDirection: 'column',
                zIndex: isSelected ? 1000 : 100,
            }}
        >
            {children(panResponder.panHandlers)}
        </Animated.View>
    );
};

export type PdfEditType = 'text' | 'image' | 'draw' | 'replace';

export interface PdfEditItem {
    id: string;
    pageIndex: number;
    type: PdfEditType;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width?: number; // for replace background
    height?: number; // for replace background
    backgroundColor?: string; // for replace background
    text?: string;
    color?: string;
    size?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right';
}

interface PdfEditorProps {
    pages: string[]; // Blob URLs of images
    onComplete: (edits: PdfEditItem[]) => void;
    onCancel: () => void;
    colors: any;
}

export default function PdfEditor({ pages, onComplete, onCancel, colors }: PdfEditorProps) {
    const { t } = useTranslation();
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [edits, setEdits] = useState<PdfEditItem[]>([]);
    const [activeTool, setActiveTool] = useState<PdfEditType | null>(null);
    const [selectedColor, setSelectedColor] = useState('#e74c3c');
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1131 });
    
    // Text formatting states
    const [selectedSize, setSelectedSize] = useState(18);
    const [selectedWeight, setSelectedWeight] = useState<'normal' | 'bold'>('normal');
    const [selectedStyle, setSelectedStyle] = useState<'normal' | 'italic'>('normal');
    const [selectedAlign, setSelectedAlign] = useState<'left' | 'center' | 'right'>('left');

    // For handling dragging and temporary text
    const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

    // Sync formatting states when an edit is selected
    useEffect(() => {
        if (selectedEditId) {
            const edit = edits.find(e => e.id === selectedEditId);
            if (edit) {
                if (edit.color) setSelectedColor(edit.color);
                if (edit.size) setSelectedSize(edit.size);
                if (edit.fontWeight) setSelectedWeight(edit.fontWeight);
                if (edit.fontStyle) setSelectedStyle(edit.fontStyle);
                if (edit.textAlign) setSelectedAlign(edit.textAlign);
            }
        }
    }, [selectedEditId]);

    // Update formatting for new items AND the currently selected item
    const updateFormatting = (updates: Partial<PdfEditItem>) => {
        if (updates.color) setSelectedColor(updates.color);
        if (updates.size) setSelectedSize(updates.size);
        if (updates.fontWeight) setSelectedWeight(updates.fontWeight);
        if (updates.fontStyle) setSelectedStyle(updates.fontStyle);
        if (updates.textAlign) setSelectedAlign(updates.textAlign);
        
        if (selectedEditId) {
            setEdits(prev => prev.map(e => e.id === selectedEditId ? { ...e, ...updates } : e));
        }
    };

    // Nettoyage des textes vides lors de la désélection
    useEffect(() => {
        setEdits(prev => prev.filter(e => e.type !== 'text' || e.text?.trim() !== '' || e.id === selectedEditId));
    }, [selectedEditId]);

    const handleCanvasPress = (e: any) => {
        if (selectedEditId) {
            setSelectedEditId(null);
        }

        if (activeTool !== 'text' && activeTool !== 'replace') return;
        
        // Use nativeEvent for cross-platform local coordinates
        // Cross-platform coordinate calculation
        let x = 0;
        let y = 0;

        if (Platform.OS === 'web') {
            // Sur le web, e.nativeEvent.offsetX/offsetY est le plus fiable
            const nativeEvent = e.nativeEvent as any;
            if (nativeEvent.offsetX !== undefined) {
                x = (nativeEvent.offsetX / canvasSize.width) * 100;
                y = (nativeEvent.offsetY / canvasSize.height) * 100;
            } else {
                // Fallback avec getBoundingClientRect
                const target = e.target as HTMLElement;
                const rect = target.getBoundingClientRect();
                x = ((nativeEvent.clientX - rect.left) / rect.width) * 100;
                y = ((nativeEvent.clientY - rect.top) / rect.height) * 100;
            }
        } else {
            // Sur mobile natif
            const { locationX, locationY } = e.nativeEvent;
            x = (locationX / canvasSize.width) * 100;
            y = (locationY / canvasSize.height) * 100;
        }
        
        if (activeTool === 'replace') {
            const newEdit: PdfEditItem = {
                id: Date.now().toString(),
                pageIndex: currentPageIndex,
                type: 'text',
                x, y,
                width: 15,
                height: 4,
                backgroundColor: '#ffffff',
                text: '',
                color: selectedColor,
                size: selectedSize,
                fontWeight: selectedWeight,
                fontStyle: selectedStyle,
                textAlign: selectedAlign,
            };
            setEdits([...edits, newEdit]);
            setSelectedEditId(newEdit.id);
            return;
        }

        if (activeTool === 'text') {
            const newEdit: PdfEditItem = {
                id: Date.now().toString(),
                pageIndex: currentPageIndex,
                type: 'text',
                x,
                y,
                text: '',
                color: selectedColor,
                size: selectedSize,
                fontWeight: selectedWeight,
                fontStyle: selectedStyle,
                textAlign: selectedAlign,
            };
            setEdits([...edits, newEdit]);
            setSelectedEditId(newEdit.id);
        }
    };

    const removeEdit = (id: string) => {
        setEdits(edits.filter(e => e.id !== id));
        if (selectedEditId === id) setSelectedEditId(null);
    };

    const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#000000', '#ffffff'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Toolbar */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.toolbarLeft}>
                    <Pressable style={styles.iconButton} onPress={onCancel}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.toolbarTitle, { color: colors.text }]}>
                        Modifier PDF
                    </Text>
                </View>

                <View style={[styles.toolbarCenter, { flex: 1, paddingHorizontal: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 8 }}>
                        <Pressable 
                            style={[styles.toolBtn, activeTool === 'text' && styles.toolBtnActive]} 
                            onPress={() => setActiveTool(activeTool === 'text' ? null : 'text')}
                        >
                            <Ionicons name="text" size={20} color={activeTool === 'text' ? '#3498db' : colors.text} />
                            <Text style={[styles.toolBtnText, { color: activeTool === 'text' ? '#3498db' : colors.text }]}>Texte</Text>
                        </Pressable>

                        <Pressable 
                            style={[styles.toolBtn, activeTool === 'replace' && styles.toolBtnActive, { marginLeft: 8 }]} 
                            onPress={() => setActiveTool(activeTool === 'replace' ? null : 'replace')}
                        >
                            <Ionicons name="create" size={20} color={activeTool === 'replace' ? '#e74c3c' : colors.text} />
                            <Text style={[styles.toolBtnText, { color: activeTool === 'replace' ? '#e74c3c' : colors.text }]}>Remplacer texte</Text>
                        </Pressable>
                    </View>

                    <View style={styles.toolbarDivider} />

                    {(activeTool === 'text' || activeTool === 'replace') && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Font Size */}
                            <View style={styles.richTextGroup}>
                                <Pressable onPress={() => updateFormatting({ size: Math.max(8, selectedSize - 2) })} style={styles.richTextBtn}>
                                    <Ionicons name="remove" size={16} color={colors.text} />
                                </Pressable>
                                <Text style={{ width: 24, textAlign: 'center', fontSize: 14 }}>{selectedSize}</Text>
                                <Pressable onPress={() => updateFormatting({ size: Math.min(72, selectedSize + 2) })} style={styles.richTextBtn}>
                                    <Ionicons name="add" size={16} color={colors.text} />
                                </Pressable>
                            </View>

                            {/* Formatting */}
                            <View style={styles.richTextGroup}>
                                <Pressable 
                                    onPress={() => updateFormatting({ fontWeight: selectedWeight === 'bold' ? 'normal' : 'bold' })} 
                                    style={[styles.richTextBtn, selectedWeight === 'bold' && { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}
                                >
                                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: selectedWeight === 'bold' ? '#3498db' : colors.text }}>B</Text>
                                </Pressable>
                                <Pressable 
                                    onPress={() => updateFormatting({ fontStyle: selectedStyle === 'italic' ? 'normal' : 'italic' })} 
                                    style={[styles.richTextBtn, selectedStyle === 'italic' && { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}
                                >
                                    <Text style={{ fontStyle: 'italic', fontSize: 16, fontFamily: 'serif', color: selectedStyle === 'italic' ? '#3498db' : colors.text }}>I</Text>
                                </Pressable>
                            </View>

                            {/* Alignment */}
                            <View style={styles.richTextGroup}>
                                <Pressable onPress={() => updateFormatting({ textAlign: 'left' })} style={[styles.richTextBtn, selectedAlign === 'left' && { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                                    <Ionicons name="menu" size={16} color={selectedAlign === 'left' ? '#3498db' : colors.text} style={{ transform: [{ scaleX: 0.8 }, { translateX: -2 }] }} />
                                </Pressable>
                                <Pressable onPress={() => updateFormatting({ textAlign: 'center' })} style={[styles.richTextBtn, selectedAlign === 'center' && { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                                    <Ionicons name="menu" size={16} color={selectedAlign === 'center' ? '#3498db' : colors.text} style={{ transform: [{ scaleX: 0.8 }] }} />
                                </Pressable>
                                <Pressable onPress={() => updateFormatting({ textAlign: 'right' })} style={[styles.richTextBtn, selectedAlign === 'right' && { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                                    <Ionicons name="menu" size={16} color={selectedAlign === 'right' ? '#3498db' : colors.text} style={{ transform: [{ scaleX: 0.8 }, { translateX: 2 }] }} />
                                </Pressable>
                            </View>

                            {/* Color Picker */}
                            <View style={styles.colorPicker}>
                                {COLORS.map(c => (
                                    <Pressable 
                                        key={c} 
                                        style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchActive]}
                                        onPress={() => updateFormatting({ color: c })}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.toolbarRight}>
                    <Pressable style={styles.primaryButton} onPress={() => { setSelectedEditId(null); onComplete(edits); }}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>Terminer</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.mainArea}>
                {/* Left Sidebar (Thumbnails) */}
                <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                        {pages.map((pageUrl, index) => (
                            <Pressable 
                                key={index} 
                                style={[styles.thumbnailContainer, currentPageIndex === index && { borderColor: '#3498db' }]}
                                onPress={() => setCurrentPageIndex(index)}
                            >
                                <Text style={[styles.thumbnailPageNum, { color: colors.textMuted }]}>{index + 1}</Text>
                                <Image source={{ uri: pageUrl }} style={styles.thumbnailImg} resizeMode="contain" />
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Center Canvas */}
                <View style={styles.canvasContainer}>
                    {/* The actual page image wrapper */}
                    <View style={styles.pageWrapper}>
                        <Image source={{ uri: pages[currentPageIndex] }} style={styles.pageImg} resizeMode="contain" />
                        
                        {/* Overlay for interactions */}
                        <Pressable 
                            style={styles.interactionOverlay} 
                            onLayout={(e) => setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
                            onPress={handleCanvasPress}
                        >
                            {/* Render all text edits for this page */}
                            {edits.filter(e => e.pageIndex === currentPageIndex).map(edit => {
                                const isSelected = edit.id === selectedEditId;
                                return (
                                    <DraggableItem 
                                        key={edit.id} 
                                        x={edit.x} 
                                        y={edit.y} 
                                        canvasSize={canvasSize} 
                                        isSelected={isSelected}
                                        onSelect={() => setSelectedEditId(edit.id)}
                                        onDragEnd={(newX: number, newY: number) => {
                                            setEdits(prev => prev.map(e => e.id === edit.id ? { ...e, x: newX, y: newY } : e));
                                        }}
                                    >
                                        {(panHandlers: any) => (
                                            <PdfEditItemView
                                                edit={edit}
                                                isSelected={isSelected}
                                                canvasSize={canvasSize}
                                                onSelect={() => setSelectedEditId(edit.id)}
                                                onRemove={() => removeEdit(edit.id)}
                                                onChangeText={(t: string) => setEdits(prev => prev.map(e => e.id === edit.id ? { ...e, text: t } : e))}
                                                onResize={(w: number, h: number) => setEdits(prev => prev.map(e => e.id === edit.id ? { ...e, width: w, height: h } : e))}
                                                panHandlers={panHandlers}
                                            />
                                        )}
                                    </DraggableItem>
                                );
                            })}
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100,
    },
    toolbar: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: 200,
    },
    iconButton: {
        padding: 8,
    },
    toolbarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    toolbarCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flex: 1,
    },
    toolBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    toolBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    colorPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 8,
        borderRadius: 20,
    },
    colorSwatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSwatchActive: {
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    toolbarRight: {
        width: 200,
        alignItems: 'flex-end',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    mainArea: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 200,
        borderRightWidth: 1,
    },
    thumbnailContainer: {
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        borderRadius: 8,
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    thumbnailPageNum: {
        fontSize: 12,
        marginBottom: 4,
    },
    thumbnailImg: {
        width: 150,
        height: 200,
        borderRadius: 4,
    },
    canvasContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pageWrapper: {
        position: 'relative',
        width: '100%',
        height: '100%',
        maxWidth: 800,
        maxHeight: 1131, // A4 ratio
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },
    pageImg: {
        width: '100%',
        height: '100%',
    },
    interactionOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        cursor: 'crosshair' as any,
    },
    premiumEditBox: {
        padding: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    premiumEditBoxSelected: {
        borderColor: '#3498db',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(52, 152, 219, 0.05)',
    },
    premiumToolbar: {
        position: 'absolute',
        top: -30,
        left: -1,
        flexDirection: 'row',
        backgroundColor: '#3498db',
        borderRadius: 4,
        overflow: 'hidden',
    },
    premiumDragHandle: {
        padding: 6,
        backgroundColor: '#2980b9',
    },
    premiumDeleteBtn: {
        padding: 6,
    },
    premiumTextInput: {
        minWidth: 100,
        outlineStyle: 'none' as any,
        padding: 0,
        margin: 0,
    },
    resizeHandle: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 16,
        height: 16,
        backgroundColor: '#3498db',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 101,
        cursor: Platform.OS === 'web' ? 'nwse-resize' : 'default',
    } as any,
    toolBtnActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
    },
    toolbarDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 12,
    },
    richTextGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 6,
        padding: 2,
        marginRight: 8,
    },
    richTextBtn: {
        padding: 6,
        borderRadius: 4,
        minWidth: 28,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

// Component to handle individual edit items and their resize handlers
function PdfEditItemView({ edit, isSelected, canvasSize, onSelect, onRemove, onChangeText, onResize, panHandlers }: any) {
    const editRef = React.useRef(edit);
    React.useEffect(() => {
        editRef.current = edit;
    }, [edit]);

    const initialSizeRef = React.useRef({ width: edit.width || 15, height: edit.height || 4 });

    const resizePanResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                initialSizeRef.current = { width: editRef.current.width || 15, height: editRef.current.height || 4 };
            },
            onPanResponderMove: (e, gestureState) => {
                const percentDx = (gestureState.dx / canvasSize.width) * 100;
                const percentDy = (gestureState.dy / canvasSize.height) * 100;
                onResize(
                    Math.max(2, initialSizeRef.current.width + percentDx), 
                    Math.max(1, initialSizeRef.current.height + percentDy)
                );
            },
            onPanResponderRelease: () => {}
        })
    ).current;

    const inputRef = React.useRef<any>(null);
    React.useEffect(() => {
        if (isSelected && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSelected]);

    const baseStyle = { 
        color: edit.color, 
        fontSize: edit.size || 18,
        fontWeight: edit.fontWeight || 'normal',
        fontStyle: edit.fontStyle || 'normal',
        textAlign: edit.textAlign || 'left',
    } as any;

    if (edit.type === 'text') {
        const hasBg = !!edit.backgroundColor;
        const boxWidth = hasBg && edit.width ? edit.width * (canvasSize.width / 100) : undefined;
        const boxHeight = hasBg && edit.height ? edit.height * (canvasSize.height / 100) : undefined;

        return (
            <View style={[styles.premiumEditBox, isSelected && styles.premiumEditBoxSelected, hasBg && { backgroundColor: edit.backgroundColor, width: boxWidth, height: boxHeight }]}>
                {isSelected && (
                    <View style={styles.premiumToolbar}>
                        <View {...panHandlers} style={[styles.premiumDragHandle, { cursor: Platform.OS === 'web' ? 'grab' : 'default' }] as any}>
                            <Ionicons name="move" size={16} color="#fff" />
                        </View>
                        <Pressable onPress={onRemove} style={styles.premiumDeleteBtn}>
                            <Ionicons name="trash" size={16} color="#fff" />
                        </Pressable>
                    </View>
                )}
                
                {isSelected ? (
                    <TextInput 
                        ref={inputRef}
                        style={[styles.premiumTextInput, baseStyle, hasBg && { flex: 1, padding: 4 }]}
                        value={edit.text}
                        onChangeText={onChangeText}
                        placeholder="Taper ici..."
                        placeholderTextColor="rgba(150,150,150,0.5)"
                        multiline
                    />
                ) : (
                    <Pressable onPress={onSelect} style={hasBg && { flex: 1, padding: 4 }}>
                        <Text style={[styles.premiumTextInput, baseStyle, hasBg && { flex: 1 }]}>
                            {edit.text || " "}
                        </Text>
                    </Pressable>
                )}

                {isSelected && hasBg && (
                    <View {...resizePanResponder.panHandlers} style={styles.resizeHandle} />
                )}
            </View>
        );
    }

    return null;
}
