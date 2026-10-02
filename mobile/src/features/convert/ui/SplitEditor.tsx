import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrganizePageItem, OrganizeFileItem } from './OrganizeEditor';

interface SplitEditorProps {
    pages: OrganizePageItem[];
    files: OrganizeFileItem[];
    splitTab: 'split' | 'extract';
    setSplitTab: (tab: 'split' | 'extract') => void;
    splitPoints: number[];
    setSplitPoints: React.Dispatch<React.SetStateAction<number[]>>;
    extractedPages: number[];
    setExtractedPages: React.Dispatch<React.SetStateAction<number[]>>;
    onComplete: () => void;
    onCancel: () => void;
    colors: any;
    isSplitting?: boolean;
}

export default function SplitEditor({
    pages,
    files,
    splitTab,
    setSplitTab,
    splitPoints,
    setSplitPoints,
    extractedPages,
    setExtractedPages,
    onComplete,
    onCancel,
    colors,
    isSplitting = false
}: SplitEditorProps) {

    const toggleSplitPoint = (index: number) => {
        setSplitPoints(prev => {
            if (prev.includes(index)) {
                return prev.filter(p => p !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const toggleExtractedPage = (index: number) => {
        setExtractedPages(prev => {
            if (prev.includes(index)) {
                return prev.filter(p => p !== index);
            } else {
                return [...prev, index];
            }
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
                        onPress={() => setSplitTab('split')}
                        style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: splitTab === 'split' ? colors.primary : 'transparent' }}>
                        <Text style={{ color: splitTab === 'split' ? '#fff' : colors.textMuted, fontWeight: '600' }}>✂️ Diviser</Text>
                    </Pressable>
                    <Pressable 
                        onPress={() => setSplitTab('extract')}
                        style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: splitTab === 'extract' ? colors.primary : 'transparent' }}>
                        <Text style={{ color: splitTab === 'extract' ? '#fff' : colors.textMuted, fontWeight: '600' }}>✅ Extraire</Text>
                    </Pressable>
                </View>

                <Pressable 
                    onPress={onComplete}
                    disabled={splitTab === 'extract' && extractedPages.length === 0}
                    style={[styles.continueButton, { 
                        backgroundColor: (splitTab === 'extract' && extractedPages.length === 0) ? colors.border : colors.primary, 
                        opacity: isSplitting ? 0.7 : 1 
                    }]}
                >
                    <Text style={styles.continueButtonText}>
                        {isSplitting ? 'Création...' : (splitTab === 'split' ? `Diviser (${splitPoints.length + 1} PDF)` : `Extraire (${extractedPages.length} pages)`)}
                    </Text>
                    {!isSplitting && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                </Pressable>
            </View>

            <View style={styles.content}>
                <View style={styles.mainArea}>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.title, { color: colors.text }]}>{splitTab === 'split' ? 'Diviser le PDF' : 'Extraire des pages'}</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            {splitTab === 'split' ? 'Cliquez sur les ciseaux pour séparer les pages.' : 'Cochez les pages que vous souhaitez conserver.'}
                        </Text>
                    </View>

                    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                        <View style={[styles.grid, { gap: splitTab === 'extract' ? 20 : 0 }]}>
                            {pages.map((page, index) => {
                                const fileInfo = files.find(f => f.originalIndex === page.fileIndex) || files[0];
                                const hasCutAfter = splitTab === 'split' && splitPoints.includes(index);
                                const isExtracted = splitTab === 'extract' && extractedPages.includes(index);

                                return (
                                    <React.Fragment key={page.id}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Pressable 
                                                onPress={() => {
                                                    if (splitTab === 'extract') {
                                                        toggleExtractedPage(index);
                                                    }
                                                }}
                                                style={[
                                                    styles.pageWrapper, 
                                                    { 
                                                        borderColor: splitTab === 'extract' && isExtracted ? colors.primary : (splitTab === 'extract' ? 'transparent' : fileInfo.color), 
                                                        borderWidth: splitTab === 'extract' ? 2 : 1, 
                                                        opacity: (splitTab === 'extract' && !isExtracted) ? 0.7 : 1
                                                    }
                                                ]}
                                            >
                                                <Image source={{ uri: page.imageUri }} style={styles.pageImage} resizeMode="contain" />
                                                
                                                {splitTab === 'extract' && (
                                                    <View style={[styles.checkCircle, { 
                                                        backgroundColor: isExtracted ? colors.primary : 'rgba(0,0,0,0.5)',
                                                        borderColor: isExtracted ? colors.primary : '#fff'
                                                    }]}>
                                                        {isExtracted && <Ionicons name="checkmark" size={16} color="#fff" />}
                                                    </View>
                                                )}
                                            </Pressable>

                                            {splitTab === 'split' && index < pages.length - 1 && (
                                                <Pressable 
                                                    onPress={() => toggleSplitPoint(index)}
                                                    style={styles.scissorsArea}
                                                >
                                                    <View style={[styles.cutLine, hasCutAfter && { backgroundColor: colors.primary }]} />
                                                    <View style={[styles.scissorsIcon, hasCutAfter && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                                        <Ionicons name="cut" size={16} color={hasCutAfter ? '#fff' : colors.textMuted} />
                                                    </View>
                                                </Pressable>
                                            )}
                                        </View>
                                    </React.Fragment>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, zIndex: 10 },
    backButton: { padding: 8 },
    toolsContainer: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 4 },
    continueButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    continueButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    content: { flex: 1, flexDirection: 'row' },
    mainArea: { flex: 1, position: 'relative' },
    headerInfo: { alignItems: 'center', paddingVertical: 24 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: 15 },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 100, alignItems: 'center' },
    grid: { width: '100%', maxWidth: 1200, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    pageWrapper: { width: 140, height: 180, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', position: 'relative' },
    pageImage: { width: '100%', height: '100%' },
    checkCircle: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    scissorsArea: { width: 40, height: 180, alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' },
    cutLine: { position: 'absolute', left: '50%', transform: [{translateX: -1}], width: 2, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
    scissorsIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }
});
