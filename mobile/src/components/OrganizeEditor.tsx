import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    SafeAreaView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface OrganizePageItem {
    id: string;
    fileIndex: number;
    fileName: string;
    pageIndex: number;
    imageUri: string;
}

interface OrganizeEditorProps {
    pages: OrganizePageItem[];
    files: { name: string, color: string }[];
    onComplete: (orderedPages: OrganizePageItem[]) => void;
    onCancel: () => void;
    colors: any;
}

export default function OrganizeEditor({ pages: initialPages, files, onComplete, onCancel, colors }: OrganizeEditorProps) {
    const [pages, setPages] = useState<OrganizePageItem[]>(initialPages);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [dragOverItem, setDragOverItem] = useState<number | null>(null);

    const onDragStart = (e: any, index: number) => {
        setDraggedItem(index);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
        }
    };

    const onDragOver = (e: any, index: number) => {
        e.preventDefault();
        setDragOverItem(index);
    };

    const onDrop = (e: any, targetIndex: number) => {
        e.preventDefault();
        setDragOverItem(null);
        if (draggedItem === null) return;
        if (draggedItem === targetIndex) return;

        setPages(prev => {
            const next = [...prev];
            const item = next.splice(draggedItem, 1)[0];
            next.splice(targetIndex, 0, item);
            return next;
        });
        setDraggedItem(null);
    };

    const removePage = (id: string) => {
        setPages(prev => prev.filter(p => p.id !== id));
    };

    const resetAll = () => {
        setPages(initialPages);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOOLBAR */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Pressable onPress={onCancel} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </Pressable>

                <View style={styles.toolsContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Organiser le PDF</Text>
                </View>

                <Pressable 
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={() => onComplete(pages)}
                >
                    <Text style={styles.doneButtonText}>Organiser</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{marginLeft: 4}} />
                </Pressable>
            </View>

            <View style={styles.content}>
                {/* PREVIEW AREA */}
                <ScrollView 
                    style={styles.scrollArea} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {pages.map((page, index) => (
                        <View 
                            key={page.id}
                            style={[
                                styles.pageWrapper,
                                draggedItem === index && styles.pageWrapperDragging,
                                dragOverItem === index && styles.pageWrapperDragOver,
                            ]}
                            draggable={Platform.OS === 'web'}
                            onDragStart={(e) => Platform.OS === 'web' && onDragStart(e, index)}
                            onDragOver={(e) => Platform.OS === 'web' && onDragOver(e, index)}
                            onDrop={(e) => Platform.OS === 'web' && onDrop(e, index)}
                            onDragEnd={() => { setDraggedItem(null); setDragOverItem(null); }}
                        >
                            <View style={[
                                styles.pageContainer, 
                                { borderColor: files[page.fileIndex]?.color || colors.border }
                            ]}>
                                <Image
                                    source={{ uri: page.imageUri }}
                                    style={styles.pageImage}
                                    resizeMode="contain"
                                    pointerEvents="none"
                                />
                                
                                {/* Delete Button */}
                                <Pressable 
                                    style={styles.deleteButton}
                                    onPress={() => removePage(page.id)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                                </Pressable>
                            </View>
                            <Text style={[styles.pageNumber, { color: colors.textMuted }]}>{index + 1}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* SIDEBAR */}
                <View style={[styles.sidebar, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
                    <View style={styles.sidebarHeader}>
                        <Text style={[styles.sidebarTitle, { color: colors.text }]}>Fichiers</Text>
                        <Pressable onPress={resetAll}>
                            <Text style={[styles.resetText, { color: colors.primary }]}>Réinitialiser tout</Text>
                        </Pressable>
                    </View>
                    
                    <ScrollView style={styles.fileList}>
                        {files.map((file, i) => {
                            const count = pages.filter(p => p.fileIndex === i).length;
                            return (
                                <View key={i} style={[styles.fileItem, { backgroundColor: file.color + '40', borderColor: file.color }]}>
                                    <View style={styles.fileIcon}>
                                        <Ionicons name="document-text" size={16} color={colors.text} />
                                    </View>
                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                        {String.fromCharCode(65 + i)}: {file.name}
                                    </Text>
                                    <Text style={[styles.pageCount, { color: colors.textMuted }]}>
                                        ({count})
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
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
    },
    title: {
        fontSize: 18,
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
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 40,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 32,
    },
    pageWrapper: {
        alignItems: 'center',
        cursor: 'move' as any,
    },
    pageWrapperDragging: {
        opacity: 0.5,
    },
    pageWrapperDragOver: {
        transform: [{ scale: 1.05 }],
    },
    pageContainer: {
        position: 'relative',
        backgroundColor: '#fff',
        borderWidth: 4, // Make border more visible
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'visible', // allow delete button to pop out
    },
    pageImage: {
        width: 140,
        height: 198,
        borderRadius: 4,
    },
    deleteButton: {
        position: 'absolute',
        top: -12,
        right: -12,
        backgroundColor: '#fff',
        borderRadius: 12,
        zIndex: 2,
    },
    pageNumber: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600'
    },
    sidebar: {
        width: 300,
        borderLeftWidth: 1,
        padding: 20,
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sidebarTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    resetText: {
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    fileList: {
        flex: 1,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 4,
        borderWidth: 2,
    },
    fileIcon: {
        marginRight: 8,
        opacity: 0.7,
    },
    fileName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    pageCount: {
        fontSize: 12,
        marginLeft: 8,
    }
});
