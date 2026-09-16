import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RotationEditorProps {
    pages: string[];
    onComplete: (rotations: number[]) => void;
    onCancel: () => void;
    colors: any;
}

export default function RotationEditor({ pages, onComplete, onCancel, colors }: RotationEditorProps) {
    // Array to hold the rotation angle (0, 90, 180, 270) for each page
    const [rotations, setRotations] = useState<number[]>(pages.map(() => 0));

    const rotateAll = (direction: 'left' | 'right') => {
        setRotations(prev => prev.map(angle => {
            let newAngle = direction === 'right' ? angle + 90 : angle - 90;
            if (newAngle >= 360) newAngle -= 360;
            if (newAngle < 0) newAngle += 360;
            return newAngle;
        }));
    };

    const rotatePage = (index: number) => {
        setRotations(prev => {
            const next = [...prev];
            next[index] = (next[index] + 90) % 360;
            return next;
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOOLBAR */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Pressable onPress={onCancel} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </Pressable>

                <View style={styles.toolsContainer}>
                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.toolButton,
                            { backgroundColor: 'rgba(0,0,0,0.2)' },
                            (pressed || hovered) && { backgroundColor: 'rgba(255,255,255,0.1)' }
                        ]}
                        onPress={() => rotateAll('left')}
                    >
                        <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                        <Text style={[styles.toolButtonText, { color: colors.text }]}>Tout à gauche</Text>
                    </Pressable>
                    
                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.toolButton,
                            { backgroundColor: 'rgba(0,0,0,0.2)' },
                            (pressed || hovered) && { backgroundColor: 'rgba(255,255,255,0.1)' }
                        ]}
                        onPress={() => rotateAll('right')}
                    >
                        <Ionicons name="arrow-redo-outline" size={20} color={colors.text} />
                        <Text style={[styles.toolButtonText, { color: colors.text }]}>Tout à droite</Text>
                    </Pressable>
                </View>

                <Pressable 
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={() => onComplete(rotations)}
                >
                    <Text style={styles.doneButtonText}>Terminer</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{marginLeft: 4}} />
                </Pressable>
            </View>

            {/* PREVIEW AREA */}
            <ScrollView 
                style={styles.scrollArea} 
                contentContainerStyle={styles.scrollContent}
            >
                {pages.map((page, index) => (
                    <View key={index} style={styles.pageWrapper}>
                        <View style={[styles.pageContainer, { borderColor: colors.border }]}>
                            {/* Inner container handles the rotation so the outer container stays the same size */}
                            <View style={{ width: 210, height: 297, alignItems: 'center', justifyContent: 'center' }}>
                                <Image
                                    source={{ uri: page }}
                                    style={[
                                        styles.pageImage,
                                        { transform: [{ rotate: rotations[index] + 'deg' }] }
                                    ]}
                                    resizeMode="contain"
                                />
                            </View>
                            
                            {/* Circular Rotate Button overlay */}
                            <Pressable 
                                style={[styles.rotateButton, { backgroundColor: colors.primary }]}
                                onPress={() => rotatePage(index)}
                            >
                                <Ionicons name="refresh" size={24} color="#fff" />
                            </Pressable>
                        </View>
                        <Text style={[styles.pageNumber, { color: colors.textMuted }]}>Page {index + 1}</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    toolsContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    toolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        transitionDuration: '0.2s',
    },
    toolButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    doneButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 40,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 40,
    },
    pageWrapper: {
        alignItems: 'center',
    },
    pageContainer: {
        position: 'relative',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageImage: {
        width: 210,
        height: 297,
        transitionDuration: '0.3s', 
    },
    rotateButton: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        opacity: 0.9,
    },
    pageNumber: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600'
    }
});
