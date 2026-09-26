import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ProcessingScreenProps {
    processingTime: number;
    selectedFilesCount: number;
    fileName: string;
    colors: any;
    t: (key: string) => string;
    styles: any;
}

export default function ProcessingScreen({
    processingTime,
    selectedFilesCount,
    fileName,
    colors,
    t,
    styles,
}: ProcessingScreenProps) {
    const minutes = Math.floor(processingTime / 60);
    const seconds = processingTime % 60;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <View style={styles.downloadIcon}>
                    <Ionicons name="cog-outline" size={80} color={colors.primary} />
                </View>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingTitle}>{t('convert.processing')}</Text>
                <Text style={styles.processingFile}>
                    {selectedFilesCount > 1 ? `${selectedFilesCount} fichiers en cours...` : fileName}
                </Text>
                {processingTime > 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 16 }}>
                        Temps écoulé : {minutes > 0 ? `${minutes}m ` : ''}{seconds}s / 30s
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}
