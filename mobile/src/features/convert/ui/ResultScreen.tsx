import React from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PdfThumbnail from './PdfThumbnail';

export interface ResultScreenProps {
    resultUrl: string;
    selectedService: any;
    splitTab: string;
    fileName: string;
    resultFiles: { name: string; url: string }[];
    colors: any;
    t: (key: string) => string;
    styles: any;
    onDownload: () => void;
    onReset: () => void;
}

export default function ResultScreen({
    resultUrl,
    selectedService,
    splitTab,
    fileName,
    resultFiles,
    colors,
    t,
    styles,
    onDownload,
    onReset
}: ResultScreenProps) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                
                {resultUrl && ((selectedService?.id === 'split-pdf' && splitTab === 'extract') || selectedService?.outputExt === 'pdf') ? (
                    <View style={{ marginBottom: 24, position: 'relative', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }}>
                        <PdfThumbnail fileUri={resultUrl} pageIndex={0} style={{ width: 150, height: 212 }} />
                        <View style={{ position: 'absolute', bottom: -10, right: -10, backgroundColor: colors.success, borderRadius: 20, padding: 4 }}>
                            <Ionicons name="checkmark-circle" size={32} color="#fff" />
                        </View>
                    </View>
                ) : resultUrl && ['jpg', 'png', 'gif'].includes(selectedService?.outputExt || '') ? (
                    <View style={{ marginBottom: 24, position: 'relative', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                        <Image source={{ uri: resultUrl }} style={{ width: 150, height: 150 }} resizeMode="cover" />
                        <View style={{ position: 'absolute', bottom: -10, right: -10, backgroundColor: colors.success, borderRadius: 20, padding: 4 }}>
                            <Ionicons name="checkmark-circle" size={32} color="#fff" />
                        </View>
                    </View>
                ) : (
                    <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                )}

                <Text style={styles.successTitle}>{t('convert.done')}</Text>
                <Text style={styles.successFile}>{fileName}.{(selectedService?.id === 'split-pdf' && splitTab === 'extract') ? 'pdf' : selectedService?.outputExt}</Text>

                {resultFiles && resultFiles.length > 0 ? (
                    <View style={{ width: '100%', maxHeight: 300, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8, marginBottom: 16 }}>
                        <ScrollView style={{ width: '100%' }}>
                            {resultFiles.map((f, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: i < resultFiles.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                        <Ionicons name="document-text-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                                        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">{f.name}</Text>
                                    </View>
                                    <Pressable 
                                        style={({ hovered }: any) => [{ backgroundColor: colors.cardHovered, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, hovered && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                        onPress={() => {
                                            const a = document.createElement('a');
                                            a.href = f.url;
                                            a.download = f.name;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                        }}>
                                        <Ionicons name="download-outline" size={16} color={colors.text} />
                                    </Pressable>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <Pressable style={[styles.downloadButton, { marginTop: 16 }]} onPress={onDownload}>
                            <Ionicons name="archive-outline" size={20} color="#ffffff" />
                            <Text style={styles.downloadButtonText}>Télécharger tout (ZIP)</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable style={styles.downloadButton} onPress={onDownload}>
                        <Ionicons name="download-outline" size={20} color="#ffffff" />
                        <Text style={styles.downloadButtonText}>{t('convert.download')}</Text>
                    </Pressable>
                )}

                <Pressable style={styles.resetButton} onPress={onReset}>
                    <Ionicons name="arrow-back-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.resetButtonText}>{t('convert.new')}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
