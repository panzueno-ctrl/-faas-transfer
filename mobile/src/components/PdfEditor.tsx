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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type PdfEditType = 'text' | 'image' | 'draw';

export interface PdfEditItem {
    id: string;
    pageIndex: number;
    type: PdfEditType;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    text?: string;
    color?: string;
    size?: number;
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
    
    // For handling dragging and temporary text
    const [draftText, setDraftText] = useState<{ x: number, y: number, text: string } | null>(null);
    const textInputRef = useRef<TextInput>(null);

    const handleCanvasPress = (e: any) => {
        if (activeTool !== 'text') return;
        
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
        
        if (draftText) {
            commitDraftText();
        } else {
            setDraftText({ x, y, text: '' });
            setTimeout(() => textInputRef.current?.focus(), 50);
        }
    };

    const commitDraftText = () => {
        if (draftText && draftText.text.trim().length > 0) {
            const newEdit: PdfEditItem = {
                id: Date.now().toString(),
                pageIndex: currentPageIndex,
                type: 'text',
                x: draftText.x,
                y: draftText.y,
                text: draftText.text,
                color: selectedColor,
                size: 24, // default relative size
            };
            setEdits([...edits, newEdit]);
        }
        setDraftText(null);
        setActiveTool(null);
    };

    const removeEdit = (id: string) => {
        setEdits(edits.filter(e => e.id !== id));
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

                <View style={styles.toolbarCenter}>
                    <Pressable 
                        style={[styles.toolBtn, activeTool === 'text' && { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]} 
                        onPress={() => setActiveTool(activeTool === 'text' ? null : 'text')}
                    >
                        <Ionicons name="text" size={20} color={activeTool === 'text' ? '#3498db' : colors.text} />
                        <Text style={[styles.toolBtnText, { color: activeTool === 'text' ? '#3498db' : colors.text }]}>Texte</Text>
                    </Pressable>
                    {/* Add more tools here like 'image', 'draw' in the future */}
                    
                    {activeTool === 'text' && (
                        <View style={styles.colorPicker}>
                            {COLORS.map(c => (
                                <Pressable 
                                    key={c} 
                                    style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchActive]}
                                    onPress={() => setSelectedColor(c)}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.toolbarRight}>
                    <Pressable style={styles.primaryButton} onPress={() => { commitDraftText(); onComplete(edits); }}>
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
                            {/* Render existing edits for this page */}
                            {edits.filter(e => e.pageIndex === currentPageIndex).map(edit => (
                                <View key={edit.id} style={[styles.renderedEdit, { left: `${edit.x}%`, top: `${edit.y}%` }]}>
                                    {edit.type === 'text' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: edit.color, fontSize: 18, fontWeight: 'bold' }}>{edit.text}</Text>
                                            <Pressable style={styles.deleteEditBtn} onPress={() => removeEdit(edit.id)}>
                                                <Ionicons name="close-circle" size={16} color="#ff4444" />
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            ))}

                            {/* Render active draft text */}
                            {draftText && (
                                <View style={[styles.draftTextContainer, { left: `${draftText.x}%`, top: `${draftText.y}%` }]}>
                                    <TextInput 
                                        ref={textInputRef}
                                        style={[styles.draftTextInput, { color: selectedColor }]}
                                        value={draftText.text}
                                        onChangeText={(t) => setDraftText({ ...draftText, text: t })}
                                        placeholder="Taper ici..."
                                        placeholderTextColor="rgba(150,150,150,0.5)"
                                        autoFocus
                                        onBlur={commitDraftText}
                                        onSubmitEditing={commitDraftText}
                                    />
                                </View>
                            )}
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
    renderedEdit: {
        position: 'absolute',
        transform: [{ translateY: -12 }], // center roughly
    },
    deleteEditBtn: {
        marginLeft: 8,
        padding: 4,
    },
    draftTextContainer: {
        position: 'absolute',
        transform: [{ translateY: -12 }], // center roughly
    },
    draftTextInput: {
        fontSize: 18,
        fontWeight: 'bold',
        minWidth: 150,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
        borderColor: '#3498db',
        padding: 4,
        borderRadius: 4,
    }
});
