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
            <View style={[styles.premiumEditBox, isSelected && styles.premiumEditBoxSelected]}>
                {isSelected && (
                    <View style={styles.premiumToolbar}>
                        <View {...panHandlers} style={[styles.premiumDragHandle, { cursor: Platform.OS === 'web' ? 'grab' : 'default' }]}>
                            <Ionicons name=\
