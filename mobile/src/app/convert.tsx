/**
 * app/convert.tsx
 *
 * Écran de conversion et traitement de fichiers.
 * Deux groupes : Conversions et Traitement PDF.
 * L'utilisateur sélectionne un service, choisit un fichier,
 * le serveur le traite et retourne le fichier transformé.
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import ActionCard from '../components/ActionCard';

const SERVER_URL = 'http://localhost:3000';

const CONVERSIONS = [
    {
        id: 'word-to-pdf',
        label: 'Word → PDF',
        icon: 'document-text-outline',
        endpoint: '/convert/word-to-pdf',
        mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        outputExt: 'pdf',
    },
    {
        id: 'pdf-to-word',
        label: 'PDF → Word',
        icon: 'document-outline',
        endpoint: '/convert/pdf-to-word',
        mimeTypes: ['application/pdf'],
        outputExt: 'docx',
    },
    {
        id: 'pdf-to-image',
        label: 'PDF → Image',
        icon: 'image-outline',
        endpoint: '/convert/pdf-to-image',
        mimeTypes: ['application/pdf'],
        outputExt: 'jpg',
    },
    {
        id: 'image-to-pdf',
        label: 'Image → PDF',
        icon: 'images-outline',
        endpoint: '/convert/image-to-pdf',
        mimeTypes: ['image/*'],
        outputExt: 'pdf',
    },
    {
        id: 'pptx-to-pdf',
        label: 'PPTX → PDF',
        icon: 'easel-outline',
        endpoint: '/convert/pptx-to-pdf',
        mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        outputExt: 'pdf',
    },
    {
        id: 'excel-to-pdf',
        label: 'Excel → PDF',
        icon: 'grid-outline',
        endpoint: '/convert/excel-to-pdf',
        mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        outputExt: 'pdf',
    },
    {
        id: 'pdf-to-excel',
        label: 'PDF → Excel',
        icon: 'grid-outline',
        endpoint: '/convert/pdf-to-excel',
        mimeTypes: ['application/pdf'],
        outputExt: 'xlsx',
    },
];

const PDF_TOOLS = [
    {
        id: 'merge-pdf',
        label: 'Fusionner',
        icon: 'git-merge-outline',
        endpoint: '/convert/merge-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'pdf',
        multiple: true,
    },
    {
        id: 'split-pdf',
        label: 'Diviser',
        icon: 'cut-outline',
        endpoint: '/convert/split-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'zip',
    },
    {
        id: 'rotate-pdf',
        label: 'Pivoter',
        icon: 'refresh-outline',
        endpoint: '/convert/rotate-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'pdf',
    },
    {
        id: 'watermark-pdf',
        label: 'Filigrane',
        icon: 'water-outline',
        endpoint: '/convert/watermark-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'pdf',
    },
    {
        id: 'number-pdf',
        label: 'Numéroter',
        icon: 'list-outline',
        endpoint: '/convert/number-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'pdf',
    },
    {
        id: 'protect-pdf',
        label: 'Protéger',
        icon: 'lock-closed-outline',
        endpoint: '/convert/protect-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'pdf',
    },
    {
        id: 'ocr-image',
        label: 'OCR Image',
        icon: 'scan-outline',
        endpoint: '/convert/ocr-image',
        mimeTypes: ['image/*'],
        outputExt: 'txt',
    },
    {
        id: 'ocr-pdf',
        label: 'OCR PDF',
        icon: 'scan-outline',
        endpoint: '/convert/ocr-pdf',
        mimeTypes: ['application/pdf'],
        outputExt: 'txt',
    },
];

export default function ConvertScreen() {
    const router = useRouter();
    const [step, setStep] = useState<'menu' | 'processing' | 'done'>('menu');
    const [selectedService, setSelectedService] = useState<any>(null);
    const [fileName, setFileName] = useState('');
    const [resultUrl, setResultUrl] = useState('');

    const handleServicePress = async (service: any) => {
        setSelectedService(service);
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: service.mimeTypes,
                copyToCacheDirectory: true,
                multiple: service.multiple || false,
            });

            if (res.canceled) return;

            const file = res.assets[0];
            setFileName(file.name);
            await processFile(service, file);

        } catch (error) {
            Alert.alert('Erreur', 'Impossible de sélectionner le fichier.');
        }
    };

    const processFile = async (service: any, file: any) => {
        setStep('processing');
        try {
            const formData = new FormData();
            const response_file = await fetch(file.uri);
            const blob = await response_file.blob();
            formData.append('file', blob, file.name);

            if (service.id === 'rotate-pdf') {
                formData.append('rotation', '90');
            }
            if (service.id === 'watermark-pdf') {
                formData.append('text', 'CONFIDENTIEL');
            }
            if (service.id === 'protect-pdf') {
                formData.append('password', 'faas2024');
            }

            const response = await fetch(`${SERVER_URL}${service.endpoint}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Erreur serveur');
            }

            const resultBlob = await response.blob();
            const url = URL.createObjectURL(resultBlob);
            setResultUrl(url);
            setStep('done');

        } catch (error) {
            Alert.alert(
                'Erreur',
                'Le traitement a échoué. Vérifiez votre fichier et réessayez.'
            );
            setStep('menu');
        }
    };

    const downloadResult = () => {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `faas-${selectedService.id}.${selectedService.outputExt}`;
        a.click();
    };

    const reset = () => {
        setStep('menu');
        setSelectedService(null);
        setFileName('');
        setResultUrl('');
    };

    if (step === 'menu') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={styles.contentWrapper}>
                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.backButton,
                            (pressed || hovered) && styles.backButtonHovered
                        ]}
                        onPress={() => router.push('/')}>
                        <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                        <Text style={styles.backButtonText}>Accueil</Text>
                    </Pressable>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Boîte à outils PDF</Text>
                            <Text style={styles.subtitle}>Convertissez et modifiez vos fichiers</Text>
                        </View>

                        <Text style={styles.groupTitle}>Conversions populaires</Text>
                        <View style={styles.grid}>
                            {CONVERSIONS.map((service) => (
                                <ActionCard
                                    key={service.id}
                                    title={service.label}
                                    description=""
                                    icon={service.icon as any}
                                    onPress={() => handleServicePress(service)}
                                    style={styles.serviceCard}
                                    compact={true}
                                />
                            ))}
                        </View>

                        <Text style={styles.groupTitle}>Traitement PDF avancé</Text>
                        <View style={styles.grid}>
                            {PDF_TOOLS.map((service) => (
                                <ActionCard
                                    key={service.id}
                                    title={service.label}
                                    description=""
                                    icon={service.icon as any}
                                    onPress={() => handleServicePress(service)}
                                    style={styles.serviceCard}
                                    compact={true}
                                />
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'processing') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>
                    <View style={styles.downloadIcon}>
                        <Ionicons name="cog-outline" size={80} color="#3B82F6" />
                    </View>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.processingTitle}>Traitement en cours...</Text>
                    <Text style={styles.processingFile}>{fileName}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                <Text style={styles.successTitle}>Traitement terminé ✅</Text>
                <Text style={styles.successFile}>{fileName}</Text>

                <Pressable style={styles.downloadButton} onPress={downloadResult}>
                    <Ionicons name="download-outline" size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>Télécharger le fichier</Text>
                </Pressable>

                <Pressable style={styles.resetButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={20} color="#94A3B8" />
                    <Text style={styles.resetButtonText}>Nouveau traitement</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0C10',
        padding: 32,
        position: 'relative',
        overflow: 'hidden',
    },

    contentWrapper: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },

    backgroundGlow: {
        position: 'absolute',
        top: -150,
        left: '50%',
        transform: [{ translateX: -400 }],
        width: 800,
        height: 800,
        borderRadius: 400,
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 120,
        zIndex: 0,
    },

    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        position: 'absolute',
        top: 32,
        left: 32,
        zIndex: 20,
        backgroundColor: '#13151A',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F232D',
        transitionDuration: '0.2s',
    },

    backButtonHovered: {
        backgroundColor: '#1E2433',
        borderColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        transform: [{ translateY: -1 }],
    },

    backButtonText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
    },

    scrollContent: {
        paddingTop: 100, // Espace pour le bouton retour absolu
        paddingBottom: 40,
        alignItems: 'center',
        width: '100%',
        maxWidth: 900,
    },

    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },

    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F8FAFC',
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },

    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
    },

    groupTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 16,
        alignSelf: 'flex-start',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#1F232D',
        paddingBottom: 8,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
        width: '100%',
        justifyContent: 'center',
    },

    serviceCard: {
        width: 260,
    },

    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
        width: '100%',
        maxWidth: 400,
    },

    downloadIcon: {
        marginBottom: 8,
    },

    processingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8FAFC',
        textAlign: 'center',
    },

    processingFile: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
    },

    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8FAFC',
        textAlign: 'center',
    },

    successFile: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 24,
    },

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        marginBottom: 12,
    },

    downloadButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },

    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#13151A',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F232D',
        width: '100%',
        justifyContent: 'center',
    },

    resetButtonText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
    },
});
