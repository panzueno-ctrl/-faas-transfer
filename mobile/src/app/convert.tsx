/**
 * app/convert.tsx
 *
 * Écran de conversion et traitement de fichiers.
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import ActionCard from '../components/ActionCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

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
    {
        id: 'pdf-to-pptx',
        label: 'PDF → PPTX',
        icon: 'easel-outline',
        endpoint: '/convert/pdf-to-pptx',
        mimeTypes: ['application/pdf'],
        outputExt: 'pptx',
    },
    {
        id: 'pages-to-pdf',
        label: 'Pages → PDF',
        icon: 'document-text-outline',
        endpoint: '/convert/pages-to-pdf',
        mimeTypes: ['application/vnd.apple.pages'],
        outputExt: 'pdf',
    },
    {
        id: 'keynote-to-pdf',
        label: 'Keynote → PDF',
        icon: 'easel-outline',
        endpoint: '/convert/keynote-to-pdf',
        mimeTypes: ['application/vnd.apple.keynote'],
        outputExt: 'pdf',
    },
    {
        id: 'numbers-to-pdf',
        label: 'Numbers → PDF',
        icon: 'grid-outline',
        endpoint: '/convert/numbers-to-pdf',
        mimeTypes: ['application/vnd.apple.numbers'],
        outputExt: 'pdf',
    },
    {
        id: 'txt-to-pdf',
        label: 'TXT → PDF',
        icon: 'document-text-outline',
        endpoint: '/convert/txt-to-pdf',
        mimeTypes: ['text/plain'],
        outputExt: 'pdf',
    },
    {
        id: 'pdf-to-txt',
        label: 'PDF → TXT',
        icon: 'document-outline',
        endpoint: '/convert/pdf-to-txt',
        mimeTypes: ['application/pdf'],
        outputExt: 'txt',
    },
    {
        id: 'jpg-to-png',
        label: 'JPG → PNG',
        icon: 'image-outline',
        endpoint: '/convert/jpg-to-png',
        mimeTypes: ['image/jpeg'],
        outputExt: 'png',
    },
    {
        id: 'png-to-jpg',
        label: 'PNG → JPG',
        icon: 'image-outline',
        endpoint: '/convert/png-to-jpg',
        mimeTypes: ['image/png'],
        outputExt: 'jpg',
    },
    {
        id: 'heic-to-jpg',
        label: 'HEIC → JPG',
        icon: 'logo-apple',
        endpoint: '/convert/heic-to-jpg',
        mimeTypes: ['image/heic', 'image/heif'],
        outputExt: 'jpg',
    },
    {
        id: 'mp4-to-mp3',
        label: 'Vidéo → Audio',
        icon: 'musical-notes-outline',
        endpoint: '/convert/mp4-to-mp3',
        mimeTypes: ['video/mp4', 'video/quicktime'],
        outputExt: 'mp3',
    },
    {
        id: 'wav-to-mp3',
        label: 'WAV → MP3',
        icon: 'musical-notes-outline',
        endpoint: '/convert/wav-to-mp3',
        mimeTypes: ['audio/wav', 'audio/x-wav'],
        outputExt: 'mp3',
    },
    {
        id: 'mp3-to-wav',
        label: 'MP3 → WAV',
        icon: 'musical-note-outline',
        endpoint: '/convert/mp3-to-wav',
        mimeTypes: ['audio/mpeg'],
        outputExt: 'wav',
    },
    {
        id: 'mp4-to-gif',
        label: 'Vidéo → GIF',
        icon: 'images-outline',
        endpoint: '/convert/mp4-to-gif',
        mimeTypes: ['video/mp4', 'video/quicktime'],
        outputExt: 'gif',
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
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    const [step, setStep] = useState<'menu' | 'processing' | 'done'>('menu');
    const [selectedService, setSelectedService] = useState<any>(null);
    const [fileName, setFileName] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        
        return () => subscription.unsubscribe();
    }, []);

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
            Alert.alert(t('common.error'), 'Impossible de sélectionner le fichier.');
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
                t('common.error'),
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
        const filteredConversions = CONVERSIONS.filter(c => 
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const filteredPdfTools = PDF_TOOLS.filter(c => 
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={styles.contentWrapper}>
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.backButton,
                                (pressed || hovered) && styles.backButtonHovered,
                                { position: 'relative', top: 0, left: 0 }
                            ]}
                            onPress={() => router.push('/')}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>{t('common.back')}</Text>
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>{t('convert.title')}</Text>
                            <Text style={styles.subtitle}>{t('convert.subtitle')}</Text>
                            
                            <View style={styles.searchContainer}>
                                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Chercher une conversion (ex: pdf, mp3, heic...)"
                                    placeholderTextColor={colors.textMuted}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <Pressable onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {filteredConversions.length > 0 && (
                            <>
                                <Text style={styles.groupTitle}>{t('convert.popular')}</Text>
                                <View style={styles.grid}>
                                    {filteredConversions.map((service) => (
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
                            </>
                        )}

                        {filteredPdfTools.length > 0 && (
                            <>
                                <Text style={styles.groupTitle}>{t('convert.advanced')}</Text>
                                <View style={styles.grid}>
                                    {filteredPdfTools.map((service) => (
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
                            </>
                        )}

                        {filteredConversions.length === 0 && filteredPdfTools.length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                                <Text style={[styles.subtitle, { marginTop: 16 }]}>Aucune conversion trouvée</Text>
                            </View>
                        )}
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
                        <Ionicons name="cog-outline" size={80} color={colors.primary} />
                    </View>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.processingTitle}>{t('convert.processing')}</Text>
                    <Text style={styles.processingFile}>{fileName}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                <Text style={styles.successTitle}>{t('convert.done')}</Text>
                <Text style={styles.successFile}>{fileName}</Text>

                <Pressable style={styles.downloadButton} onPress={downloadResult}>
                    <Ionicons name="download-outline" size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>{t('convert.download')}</Text>
                </Pressable>

                <Pressable style={styles.resetButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.resetButtonText}>{t('convert.new')}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        backgroundColor: colors.glow,
        shadowColor: colors.primary,
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
        backgroundColor: colors.card,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        transitionDuration: '0.2s',
    },

    backButtonHovered: {
        backgroundColor: colors.cardHovered,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        transform: [{ translateY: -1 }],
    },

    backButtonText: {
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },

    scrollContent: {
        paddingTop: 100, 
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
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },

    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
    },

    groupTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
        alignSelf: 'flex-start',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
        color: colors.text,
        textAlign: 'center',
    },

    processingFile: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
    },

    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },

    successFile: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
    },

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
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
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
        justifyContent: 'center',
    },

    resetButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },

    authWallContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    lockIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
    },
    authWallTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    authWallSubtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginBottom: 40,
        textAlign: 'center',
        lineHeight: 24,
    },
    authWallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    authWallButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },
});
