import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform, PanResponder, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Ellipse } from 'react-native-svg';
import { PdfEditItem } from './PdfEditor';

interface Props {
    edit: PdfEditItem;
    isSelected: boolean;
    canvasSize: { width: number; height: number };
    onSelect: () => void;
    onRemove: () => void;
    onChangeText: (text: string) => void;
    onResize: (newWidth: number, newHeight: number) => void;
    onDuplicate?: () => void;
    panHandlers: any;
}

export default function PdfEditItemView({
    edit,
    isSelected,
    canvasSize,
    onSelect,
    onRemove,
    onChangeText,
    onResize,
    onDuplicate,
    panHandlers
}: Props) {
    // PanResponder for corner resizing
    const resizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gestureState) => {
                const percentDx = (gestureState.dx / canvasSize.width) * 100;
                const percentDy = (gestureState.dy / canvasSize.height) * 100;
                const currentWidth = edit.width || 18;
                const currentHeight = edit.height || 6;
                onResize(
                    Math.max(4, currentWidth + percentDx),
                    Math.max(2, currentHeight + percentDy)
                );
            },
            onPanResponderRelease: () => {}
        })
    ).current;

    // Floating action toolbar for selected item
    const renderFloatingToolbar = () => (
        <View style={styles.floatingToolbar}>
            <View
                {...panHandlers}
                style={[
                    styles.toolbarActionBtn,
                    { cursor: Platform.OS === 'web' ? 'grab' : 'default' } as any
                ]}
                accessibilityLabel="Déplacer"
            >
                <Ionicons name="move" size={14} color="#ffffff" />
            </View>
            {onDuplicate && (
                <Pressable
                    onPress={onDuplicate}
                    style={styles.toolbarActionBtn}
                    accessibilityLabel="Dupliquer"
                >
                    <Ionicons name="copy-outline" size={14} color="#ffffff" />
                </Pressable>
            )}
            <Pressable
                onPress={onRemove}
                style={[styles.toolbarActionBtn, styles.deleteBtn]}
                accessibilityLabel="Supprimer"
            >
                <Ionicons name="trash-outline" size={14} color="#ffffff" />
            </Pressable>
        </View>
    );

    // 4 Corner handles for professional bounding box (like iLovePDF)
    const renderResizeHandles = () => (
        <>
            <View style={[styles.cornerDot, styles.dotTopLeft]} />
            <View style={[styles.cornerDot, styles.dotTopRight]} />
            <View style={[styles.cornerDot, styles.dotBottomLeft]} />
            <View
                {...resizePanResponder.panHandlers}
                style={[
                    styles.cornerDot,
                    styles.dotBottomRight,
                    { cursor: Platform.OS === 'web' ? 'se-resize' : 'default' } as any
                ]}
            />
        </>
    );

    // 0. INSERTED IMAGE
    if (edit.type === 'image' && edit.imageUri) {
        return (
            <Pressable
                onPress={onSelect}
                style={[
                    styles.boxContainer,
                    isSelected && styles.boxSelected,
                    {
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        backgroundColor: 'transparent'
                    }
                ]}
            >
                {isSelected && renderFloatingToolbar()}
                <Image
                    source={{ uri: edit.imageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                />
                {isSelected && renderResizeHandles()}
            </Pressable>
        );
    }

    // 1. WHITEOUT / GOMME
    if (edit.type === 'whiteout') {
        return (
            <Pressable
                onPress={onSelect}
                style={[
                    styles.boxContainer,
                    isSelected && styles.boxSelected,
                    {
                        width: '100%',
                        height: '100%',
                        backgroundColor: edit.color || '#ffffff'
                    }
                ]}
            >
                {isSelected && renderFloatingToolbar()}
                {isSelected && renderResizeHandles()}
            </Pressable>
        );
    }

    // 2. SHAPE (Rectangle, Circle, Line)
    if (edit.type === 'shape') {
        const isCircle = edit.shapeType === 'circle';
        const isLine = edit.shapeType === 'line';
        return (
            <Pressable
                onPress={onSelect}
                style={[
                    styles.boxContainer,
                    isSelected && styles.boxSelected,
                    {
                        width: '100%',
                        height: isLine ? 4 : '100%',
                        borderRadius: isCircle ? 9999 : 4,
                        borderWidth: isLine ? 0 : (edit.size || 2),
                        borderColor: edit.color || '#000000',
                        backgroundColor: isLine ? (edit.color || '#000000') : 'transparent'
                    }
                ]}
            >
                {isSelected && renderFloatingToolbar()}
                {isSelected && renderResizeHandles()}
            </Pressable>
        );
    }

    // 3. SIGNATURE
    if (edit.type === 'signature' && edit.signatureData) {
        const sig = edit.signatureData as any;
        return (
            <Pressable
                onPress={onSelect}
                style={[styles.boxContainer, isSelected && styles.boxSelected, { width: '100%', height: '100%', padding: 4 }]}
            >
                {isSelected && renderFloatingToolbar()}
                {sig.type === 'text' ? (
                    <Text style={{ fontStyle: 'italic', fontSize: 24, color: '#000000' }}>{sig.data}</Text>
                ) : sig.type === 'path' ? (
                    <Svg width="100%" height="100%" viewBox={`0 0 ${sig.width || 500} ${sig.height || 200}`}>
                        <Path d={sig.data} stroke="#000000" strokeWidth={3} fill="none" />
                    </Svg>
                ) : null}
                {isSelected && renderResizeHandles()}
            </Pressable>
        );
    }

    // 4. TEXT BLOCK (Default)
    const baseStyle = {
        color: edit.color || '#000000',
        fontSize: edit.size || 18,
        fontWeight: edit.fontWeight || 'normal',
        fontStyle: edit.fontStyle || 'normal',
        textAlign: edit.textAlign || 'left',
        textDecorationLine: edit.isUnderline ? ('underline' as const) : ('none' as const),
    };

    return (
        <Pressable
            onPress={onSelect}
            style={[
                styles.boxContainer,
                isSelected && styles.boxSelected,
                {
                    backgroundColor: edit.backgroundColor || 'transparent',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    minWidth: 60
                }
            ]}
        >
            {isSelected && renderFloatingToolbar()}
            <TextInput
                value={edit.text || ''}
                onChangeText={onChangeText}
                style={[
                    baseStyle as any,
                    {
                        flex: 1,
                        outlineStyle: 'none',
                        minWidth: 40,
                        backgroundColor: 'transparent'
                    }
                ]}
                multiline
                placeholder="Tapez votre texte..."
                placeholderTextColor="#94a3b8"
                autoFocus={isSelected && (!edit.text || edit.text.length === 0)}
            />
            {isSelected && renderResizeHandles()}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    boxContainer: {
        position: 'relative',
        borderWidth: 1.5,
        borderColor: 'transparent',
        borderRadius: 4,
    },
    boxSelected: {
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    floatingToolbar: {
        position: 'absolute',
        top: -36,
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 4,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 200,
        borderWidth: 1,
        borderColor: '#334155',
    },
    toolbarActionBtn: {
        padding: 5,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteBtn: {
        backgroundColor: '#ef4444',
    },
    cornerDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: '#3b82f6',
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: '#ffffff',
        zIndex: 150,
    },
    dotTopLeft: {
        top: -5,
        left: -5,
    },
    dotTopRight: {
        top: -5,
        right: -5,
    },
    dotBottomLeft: {
        bottom: -5,
        left: -5,
    },
    dotBottomRight: {
        bottom: -5,
        right: -5,
    },
});
