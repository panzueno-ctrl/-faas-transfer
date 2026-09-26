import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform, PanResponder, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PdfEditItem } from './PdfEditor';

interface Props {
    edit: PdfEditItem;
    isSelected: boolean;
    canvasSize: { width: number; height: number };
    onSelect: () => void;
    onRemove: () => void;
    onChangeText: (text: string) => void;
    onResize: (newWidth: number, newHeight: number) => void;
    panHandlers: any; // For dragging
}

export default function PdfEditItemView({ edit, isSelected, canvasSize, onSelect, onRemove, onChangeText, onResize, panHandlers }: Props) {
    
    // PanResponder for resizing
    const resizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gestureState) => {
                const percentDx = (gestureState.dx / canvasSize.width) * 100;
                const percentDy = (gestureState.dy / canvasSize.height) * 100;
                const currentWidth = edit.width || 15;
                const currentHeight = edit.height || 3;
                onResize(Math.max(2, currentWidth + percentDx), Math.max(1, currentHeight + percentDy));
            },
            onPanResponderRelease: () => {
                // Done resizing
            }
        })
    ).current;

    const baseStyle = { 
        color: edit.color, 
        fontSize: edit.size || 18,
        fontWeight: edit.fontWeight || 'normal',
        fontStyle: edit.fontStyle || 'normal',
        textAlign: edit.textAlign || 'left',
    };

    if (edit.type === 'whiteout') {
        return (
            <Pressable onPress={onSelect} style={[styles.premiumEditBox, isSelected && styles.premiumEditBoxSelected]}>
                {isSelected && (
                    <View style={styles.premiumToolbar}>
                        <View {...panHandlers} style={[styles.premiumDragHandle, { cursor: Platform.OS === 'web' ? 'grab' : 'default' }]}>
                            <Ionicons name="move" size={16} color="#ffffff" />
                        </View>
                        <Pressable onPress={onRemove} style={styles.premiumDeleteBtn}>
                            <Ionicons name="trash" size={16} color="#ffffff" />
                        </Pressable>
                    </View>
                )}
                <View style={{ width: '100%', height: '100%', backgroundColor: edit.color }} />
                
                {isSelected && (
                    <View
                        {...resizePanResponder.panHandlers}
                        style={[styles.resizeHandle, { cursor: Platform.OS === 'web' ? 'se-resize' : 'default' }]}
                    >
                        <View style={styles.resizeHandleInner} />
                    </View>
                )}
            </Pressable>
        );
    }

    // Default text edit
    return (
        <Pressable onPress={onSelect} style={[styles.premiumEditBox, isSelected && styles.premiumEditBoxSelected, { padding: 4 }]}>
            {isSelected && (
                <View style={styles.premiumToolbar}>
                    <View {...panHandlers} style={[styles.premiumDragHandle, { cursor: Platform.OS === 'web' ? 'grab' : 'default' }]}>
                        <Ionicons name="move" size={16} color="#ffffff" />
                    </View>
                    <Pressable onPress={onRemove} style={styles.premiumDeleteBtn}>
                        <Ionicons name="trash" size={16} color="#ffffff" />
                    </Pressable>
                </View>
            )}
            <TextInput
                value={edit.text || ''}
                onChangeText={onChangeText}
                style={[baseStyle as any, { flex: 1, minWidth: 50, outlineStyle: 'none' }]}
                multiline
                placeholder="Tapez ici..."
                placeholderTextColor="#999"
            />
            {isSelected && (
                <View
                    {...resizePanResponder.panHandlers}
                    style={[styles.resizeHandle, { cursor: Platform.OS === 'web' ? 'se-resize' : 'default' }]}
                >
                    <View style={styles.resizeHandleInner} />
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    premiumEditBox: {
        width: '100%',
        height: '100%',
        borderWidth: 2,
        borderColor: 'transparent',
        borderRadius: 4,
        position: 'relative',
    },
    premiumEditBoxSelected: {
        borderColor: '#4facfe',
        backgroundColor: 'rgba(79, 172, 254, 0.1)',
    },
    premiumToolbar: {
        position: 'absolute',
        top: -30,
        right: -2,
        flexDirection: 'row',
        backgroundColor: '#1E1E1E',
        borderRadius: 6,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 100,
    },
    premiumDragHandle: {
        padding: 4,
        marginRight: 8,
        borderRadius: 4,
    },
    premiumDeleteBtn: {
        padding: 4,
        backgroundColor: '#e74c3c',
        borderRadius: 4,
    },
    resizeHandle: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 101,
    },
    resizeHandleInner: {
        width: 10,
        height: 10,
        backgroundColor: '#4facfe',
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#fff',
    }
});
