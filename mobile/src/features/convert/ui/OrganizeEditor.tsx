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

export interface OrganizePageItem {
    id: string;
    fileIndex: number;
    fileName: string;
    pageIndex: number;
    imageUri: string;
}

export interface OrganizeFileItem {
    name: string;
    color: string;
    originalIndex: number;
    pageCount?: number;
    pageCount?: number;
}

interface OrganizeEditorProps {
    pages: OrganizePageItem[];
    files: OrganizeFileItem[];
    onComplete: (orderedPages: OrganizePageItem[]) => void;
    onCancel: () => void;
    onAddFiles: () => void;
    colors: any;
}

export default function OrganizeEditor({ 
    pages: initialPages, 
    files: initialFiles, 
    onComplete, 
    onCancel, 
    onAddFiles,
    colors 
}: OrganizeEditorProps) {
    const [pages, setPages] = useState<OrganizePageItem[]>(initialPages);
    const [filesOrder, setFilesOrder] = useState<OrganizeFileItem[]>(initialFiles);

    React.useEffect(() => {
        setPages(prev => {
            const newPages = [...prev];
            let changed = false;
            initialPages.forEach(p => {
                const existingIdx = newPages.findIndex(existing => existing.id === p.id);
                if (existingIdx === -1) {
                    newPages.push(p);
                    changed = true;
                } else if (newPages[existingIdx].imageUri !== p.imageUri) {
                    newPages[existingIdx] = { ...newPages[existingIdx], imageUri: p.imageUri };
                    changed = true;
                }
            });
            if (changed) {
                newPages.sort((a, b) => {
                    if (a.fileIndex !== b.fileIndex) return a.fileIndex - b.fileIndex;
                    return a.pageIndex - b.pageIndex;
                });
            }
            return changed ? newPages : prev;
        });
    }, [initialPages]);

    React.useEffect(() => {
        setFilesOrder(prev => {
            const newFiles = [...prev];
            let changed = false;
            initialFiles.forEach(f => {
                const existingIdx = newFiles.findIndex(existing => existing.originalIndex === f.originalIndex);
                if (existingIdx === -1) {
                    newFiles.push(f);
                    changed = true;
                } else if (newFiles[existingIdx].pageCount !== f.pageCount) {
                    newFiles[existingIdx] = { ...newFiles[existingIdx], pageCount: f.pageCount };
                    changed = true;
                }
            });
            return changed ? newFiles : prev;
        });
    }, [initialFiles]);
    
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

    // --- DRAG & DROP FOR FILES (SIDEBAR) ---
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

    const removePage = (id: string) => {
        setPages(prev => prev.filter(p => p.id !== id));
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
            </View>

            <View style={styles.content}>
                {/* PREVIEW AREA */}
                <View style={styles.mainArea}>
                    <View style={styles.addFileWrapper}>
                        <Pressable 
                            style={styles.addFileButton}
                            onPress={onAddFiles}
                        >
                            <Ionicons name="add" size={32} color="#fff" />
                        </Pressable>
                    </View>

                    <ScrollView 
                        style={styles.scrollArea} 
                        contentContainerStyle={styles.scrollContent}
                    >
                        {pages.map((page, index) => {
                            const fileInfo = filesOrder.find(f => f.originalIndex === page.fileIndex) || filesOrder[0];
                            const isDragged = draggedPage === index;
                            const isDragOver = dragOverPage === index;

                            const content = (
                                <>
                                    <View style={[
                                        styles.pageContainer, 
                                        { borderColor: fileInfo.color }
                                    ]}>
                                        <Image
                                            source={{ uri: page.imageUri }}
                                            style={styles.pageImage}
                                            resizeMode="contain"
                                            pointerEvents="none"
                                        />
                                        
                                        {/* Delete Button (iLovePDF style) */}
                                        <Pressable 
                                            style={styles.deleteButton}
                                            onPress={() => removePage(page.id)}
                                        >
                                            <Ionicons name="close" size={12} color="#fff" />
                                        </Pressable>
                                    </View>
                                    <Text style={[styles.pageNumber, { color: colors.textMuted }]}>{index + 1}</Text>
                                </>
                            );

                            return Platform.OS === 'web' ? (
                                <div
                                    key={page.id}
                                    style={{
                                        ...StyleSheet.flatten([
                                            styles.pageWrapper,
                                            isDragged && styles.pageWrapperDragging,
                                            isDragOver && styles.pageWrapperDragOver,
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
                                        styles.pageWrapper,
                                        isDragged && styles.pageWrapperDragging,
                                        isDragOver && styles.pageWrapperDragOver,
                                    ]}
                                >
                                    {content}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* SIDEBAR */}
                <View style={[styles.sidebar, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
                    <View style={styles.sidebarHeader}>
                        <Text style={[styles.sidebarTitle, { color: colors.text }]}>Fichiers</Text>
                    </View>
                    
                    <ScrollView style={styles.fileList}>
                        {filesOrder.map((file, i) => {
                            const count = pages.filter(p => p.fileIndex === file.originalIndex).length;
                            const isDragged = draggedFile === i;
                            const isDragOver = dragOverFile === i;

                            const content = (
                                <View style={[styles.fileItem, { backgroundColor: file.color }]}>
                                    <View style={styles.fileIcon}>
                                        <Ionicons name="swap-vertical" size={16} color="#333" />
                                    </View>
                                    <Text style={[styles.fileName, { color: '#333' }]} numberOfLines={1}>
                                        {String.fromCharCode(65 + i)}: {file.name}
                                    </Text>
                                    <Text style={[styles.pageCount, { color: '#555' }]}>
                                        ({count})
                                    </Text>
                                </View>
                            );

                            return Platform.OS === 'web' ? (
                                <div 
                                    key={file.originalIndex} 
                                    style={{
                                        ...StyleSheet.flatten([
                                            styles.fileItemWrapper,
                                            isDragged && styles.fileItemDragging,
                                            isDragOver && styles.fileItemDragOver
                                        ])
                                    }}
                                    draggable={true}
                                    onDragStart={(e: any) => onFileDragStart(e, i)}
                                    onDragOver={(e: any) => onFileDragOver(e, i)}
                                    onDrop={(e: any) => onFileDrop(e, i)}
                                    onDragEnd={() => { setDraggedFile(null); setDragOverFile(null); }}
                                >
                                    {content}
                                </div>
                            ) : (
                                <View 
                                    key={file.originalIndex} 
                                    style={[
                                        styles.fileItemWrapper,
                                        isDragged && styles.fileItemDragging,
                                        isDragOver && styles.fileItemDragOver
                                    ]}
                                >
                                    {content}
                                </View>
                            );
                        })}
                    </ScrollView>

                    <Pressable 
                        style={[styles.doneButton, { backgroundColor: '#e74c3c' }]}
                        onPress={() => onComplete(pages)}
                    >
                        <Text style={styles.doneButtonText}>Organiser</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" style={{marginLeft: 4}} />
                    </Pressable>
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
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    mainArea: {
        flex: 1,
        position: 'relative',
    },
    addFileWrapper: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 100,
    },
    addFileButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e74c3c',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 60,
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
        borderWidth: 2,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        padding: 4, 
    },
    pageImage: {
        width: 140,
        height: 198,
    },
    deleteButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#e74c3c',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    pageNumber: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500'
    },
    sidebar: {
        width: 320,
        borderLeftWidth: 1,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    sidebarTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    fileList: {
        flex: 1,
    },
    fileItemWrapper: {
        cursor: 'move' as any,
        marginBottom: 8,
    },
    fileItemDragging: {
        opacity: 0.5,
    },
    fileItemDragOver: {
        transform: [{ scale: 1.02 }],
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 4,
    },
    fileIcon: {
        marginRight: 8,
        opacity: 0.5,
    },
    fileName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    pageCount: {
        fontSize: 12,
        marginLeft: 8,
    },
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 8,
        marginTop: 16,
    },
    doneButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    }
});
