import React, { useState } from 'react';
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
import { OrganizePageItem, OrganizeFileItem } from './OrganizeEditor';

interface MergeEditorProps {
    pages: OrganizePageItem[];
    files: OrganizeFileItem[];
    onComplete: (type: 'files' | 'pages', data: any) => void;
    onCancel: () => void;
    onAddFiles: () => void;
    colors: any;
}

export default function MergeEditor({ 
    pages: initialPages, 
    files: initialFiles, 
    onComplete, 
    onCancel, 
    onAddFiles,
    colors 
}: MergeEditorProps) {
    const [activeTab, setActiveTab] = useState<'fichiers' | 'pages'>('fichiers');
    
    const [pages, setPages] = useState<OrganizePageItem[]>(initialPages);
    const [filesOrder, setFilesOrder] = useState<OrganizeFileItem[]>(initialFiles);
    
    const [draggedPage, setDraggedPage] = useState<number | null>(null);
    const [dragOverPage, setDragOverPage] = useState<number | null>(null);

    const [draggedFile, setDraggedFile] = useState<number | null>(null);
    const [dragOverFile, setDragOverFile] = useState<number | null>(null);

    // --- DRAG & DROP FOR PAGES ---
    const onPageDragStart = (e: any, index: number) => {
        setDraggedPage(index);
        const dataTransfer = e.nativeEvent?.dataTransfer || e.dataTransfer;
        if (dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', index.toString());
        }
    };

    const onPageDragOver = (e: any, index: number) => {
        e.preventDefault();
        setDragOverPage(index);
    };

    const onPageDrop = (e: any, targetIndex: number) => {
        e.preventDefault();
        setDragOverPage(null);
        if (draggedPage === null) return;
        if (draggedPage === targetIndex) return;

        setPages(prev => {
            const next = [...prev];
            const item = next.splice(draggedPage, 1)[0];
            next.splice(targetIndex, 0, item);
            return next;
        });
        setDraggedPage(null);
    };

    // --- DRAG & DROP FOR FILES ---
    const onFileDragStart = (e: any, index: number) => {
        setDraggedFile(index);
        const dataTransfer = e.nativeEvent?.dataTransfer || e.dataTransfer;
        if (dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', index.toString());
        }
    };

    const onFileDragOver = (e: any, index: number) => {
        e.preventDefault();
        setDragOverFile(index);
    };

    const onFileDrop = (e: any, targetIndex: number) => {
        e.preventDefault();
        setDragOverFile(null);
        if (draggedFile === null) return;
        if (draggedFile === targetIndex) return;

        setFilesOrder(prev => {
            const next = [...prev];
            const item = next.splice(draggedFile, 1)[0];
            next.splice(targetIndex, 0, item);
            
            reorderPagesByFiles(next);
            
            return next;
        });
        setDraggedFile(null);
    };

    const reorderPagesByFiles = (newFilesOrder: OrganizeFileItem[]) => {
        setPages(prev => {
            const groupedPages = new Map<number, OrganizePageItem[]>();
            prev.forEach(p => {
                if (!groupedPages.has(p.fileIndex)) {
                    groupedPages.set(p.fileIndex, []);
                }
                groupedPages.get(p.fileIndex)!.push(p);
            });

            const newPages: OrganizePageItem[] = [];
            newFilesOrder.forEach(file => {
                const pagesForFile = groupedPages.get(file.originalIndex);
                if (pagesForFile) {
                    newPages.push(...pagesForFile);
                }
            });
            return newPages;
        });
    };

    const removeFile = (originalIndex: number) => {
        setFilesOrder(prev => prev.filter(f => f.originalIndex !== originalIndex));
        setPages(prev => prev.filter(p => p.fileIndex !== originalIndex));
    };

    const removePage = (id: string) => {
        setPages(prev => prev.filter(p => p.id !== id));
    };

    const handleDone = () => {
        if (activeTab === 'fichiers') {
            onComplete('files', filesOrder);
        } else {
            onComplete('pages', pages);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOOLBAR */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.toolbarLeft}>
                    <Pressable onPress={onCancel} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.toolbarTitle, { color: colors.text }]}>Fusionner</Text>
                    
                    <View style={styles.tabContainer}>
                        <Pressable 
                            style={[styles.tab, activeTab === 'fichiers' && styles.activeTab, activeTab === 'fichiers' && { backgroundColor: colors.primary }]}
                            onPress={() => setActiveTab('fichiers')}
                        >
                            <Ionicons name="document-outline" size={16} color={activeTab === 'fichiers' ? '#fff' : colors.text} />
                            <Text style={[styles.tabText, { color: activeTab === 'fichiers' ? '#fff' : colors.text }]}>Fichiers</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.tab, activeTab === 'pages' && styles.activeTab, activeTab === 'pages' && { backgroundColor: colors.primary }]}
                            onPress={() => setActiveTab('pages')}
                        >
                            <Ionicons name="documents-outline" size={16} color={activeTab === 'pages' ? '#fff' : colors.text} />
                            <Text style={[styles.tabText, { color: activeTab === 'pages' ? '#fff' : colors.text }]}>Pages</Text>
                        </Pressable>
                    </View>

                    <Pressable style={styles.addMenuButton} onPress={onAddFiles}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.text} />
                        <Text style={[styles.addMenuText, { color: colors.text }]}>Ajouter</Text>
                    </Pressable>
                </View>

                <Pressable 
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={handleDone}
                >
                    <Text style={styles.doneButtonText}>Terminer</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{marginLeft: 4}} />
                </Pressable>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={styles.content}>
                <ScrollView 
                    style={styles.scrollArea} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {activeTab === 'fichiers' && filesOrder.map((file, index) => {
                        const firstPage = pages.find(p => p.fileIndex === file.originalIndex);
                        const isDragged = draggedFile === index;
                        const isDragOver = dragOverFile === index;
                        const pageCount = pages.filter(p => p.fileIndex === file.originalIndex).length;

                        const content = (
                            <>
                                <View style={[
                                    styles.itemContainer, 
                                    { borderColor: file.color, backgroundColor: colors.card }
                                ]}>
                                    {firstPage ? (
                                        <Image
                                            source={{ uri: firstPage.imageUri }}
                                            style={styles.itemImage}
                                            resizeMode="contain"
                                            pointerEvents="none"
                                        />
                                    ) : (
                                        <View style={[styles.itemImage, { alignItems: 'center', justifyContent: 'center' }]}>
                                            <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
                                        </View>
                                    )}
                                    
                                    <Pressable 
                                        style={styles.deleteButton}
                                        onPress={() => removeFile(file.originalIndex)}
                                    >
                                        <Ionicons name="close" size={12} color="#fff" />
                                    </Pressable>
                                </View>
                                <View style={styles.itemMeta}>
                                    <View style={[styles.fileNameTag, { backgroundColor: file.color + '40' }]}>
                                        <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.fileName, { color: colors.text }]}>{file.name}</Text>
                                    </View>
                                    <Text style={[styles.pageCount, { color: colors.textMuted }]}>{pageCount} page{pageCount > 1 ? 's' : ''}</Text>
                                </View>
                            </>
                        );

                        return Platform.OS === 'web' ? (
                            <div
                                key={file.originalIndex}
                                style={{
                                    ...StyleSheet.flatten([
                                        styles.itemWrapper,
                                        isDragged && styles.itemWrapperDragging,
                                        isDragOver && styles.itemWrapperDragOver,
                                    ])
                                }}
                                draggable={true}
                                onDragStart={(e: any) => onFileDragStart(e, index)}
                                onDragOver={(e: any) => onFileDragOver(e, index)}
                                onDrop={(e: any) => onFileDrop(e, index)}
                                onDragEnd={() => { setDraggedFile(null); setDragOverFile(null); }}
                            >
                                {content}
                            </div>
                        ) : (
                            <View 
                                key={file.originalIndex}
                                style={[
                                    styles.itemWrapper,
                                    isDragged && styles.itemWrapperDragging,
                                    isDragOver && styles.itemWrapperDragOver,
                                ]}
                            >
                                {content}
                            </View>
                        );
                    })}

                    {activeTab === 'pages' && pages.map((page, index) => {
                        const fileInfo = filesOrder.find(f => f.originalIndex === page.fileIndex) || filesOrder[0];
                        const isDragged = draggedPage === index;
                        const isDragOver = dragOverPage === index;

                        const content = (
                            <>
                                <View style={[
                                    styles.itemContainer, 
                                    { borderColor: fileInfo.color, backgroundColor: colors.card }
                                ]}>
                                    <Image
                                        source={{ uri: page.imageUri }}
                                        style={styles.itemImage}
                                        resizeMode="contain"
                                        pointerEvents="none"
                                    />
                                    
                                    <Pressable 
                                        style={styles.deleteButton}
                                        onPress={() => removePage(page.id)}
                                    >
                                        <Ionicons name="close" size={12} color="#fff" />
                                    </Pressable>
                                </View>
                                <View style={styles.itemMeta}>
                                    <View style={[styles.fileNameTag, { backgroundColor: fileInfo.color + '40' }]}>
                                        <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.fileName, { color: colors.text }]}>{fileInfo.name}</Text>
                                    </View>
                                    <Text style={[styles.pageCount, { color: colors.textMuted }]}>{index + 1}</Text>
                                </View>
                            </>
                        );

                        return Platform.OS === 'web' ? (
                            <div
                                key={page.id}
                                style={{
                                    ...StyleSheet.flatten([
                                        styles.itemWrapper,
                                        isDragged && styles.itemWrapperDragging,
                                        isDragOver && styles.itemWrapperDragOver,
                                    ])
                                }}
                                draggable={true}
                                onDragStart={(e: any) => onPageDragStart(e, index)}
                                onDragOver={(e: any) => onPageDragOver(e, index)}
                                onDrop={(e: any) => onPageDrop(e, index)}
                                onDragEnd={() => { setDraggedPage(null); setDragOverPage(null); }}
                            >
                                {content}
                            </div>
                        ) : (
                            <View 
                                key={page.id}
                                style={[
                                    styles.itemWrapper,
                                    isDragged && styles.itemWrapperDragging,
                                    isDragOver && styles.itemWrapperDragOver,
                                ]}
                            >
                                {content}
                            </View>
                        );
                    })}

                    {/* BIG ADD BUTTON */}
                    <Pressable style={[styles.addBox, { borderColor: colors.primary }]} onPress={onAddFiles}>
                        <Ionicons name="add" size={48} color={colors.primary} />
                        <Text style={[styles.addBoxText, { color: colors.primary }]}>Ajouter des fichiers</Text>
                    </Pressable>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    toolbar: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    toolbarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 24,
    },
    tabContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 24,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    activeTab: {
    },
    tabText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    addMenuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    addMenuText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 32,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
        alignItems: 'flex-start',
    },
    itemWrapper: {
        width: 180,
        alignItems: 'center',
        cursor: 'grab',
    },
    itemWrapperDragging: {
        opacity: 0.5,
    },
    itemWrapperDragOver: {
        opacity: 0.8,
        transform: [{ scale: 1.05 }],
    },
    itemContainer: {
        width: 160,
        height: 226,
        borderWidth: 2,
        borderRadius: 8,
        padding: 8,
        position: 'relative',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    deleteButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e74c3c',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    itemMeta: {
        alignItems: 'center',
        width: '100%',
    },
    fileNameTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 4,
        width: '100%',
    },
    fileName: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    pageCount: {
        fontSize: 12,
    },
    addBox: {
        width: 160,
        height: 226,
        borderWidth: 2,
        borderRadius: 8,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        cursor: 'pointer',
    },
    addBoxText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 16,
    }
});
