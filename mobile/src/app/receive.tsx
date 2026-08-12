/**
 * app/receive.tsx
 *
 * Écran de réception de fichiers.
 */

import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
    Linking,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import ActionCard from '../components/ActionCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

export default function ReceiveScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, isDark);

    const [step, setStep] = useState<'choice' | 'scanning' | 'manual' | 'downloading' | 'preview' | 'done'>('choice');
    const [previewData, setPreviewData] = useState<any>(null);
    const [link, setLink] = useState('');
    const [fileName, setFileName] = useState('');
    const [permission, requestPermission] = useCameraPermissions();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (step === 'preview') {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [step, fadeAnim]);

    const extractId = (url: string) => {
        const parts = url.split('/download/');
        return parts.length > 1 ? parts[1].trim() : null;
    };

    const downloadFile = async (url: string) => {
        setStep('downloading');
        const id = extractId(url);

        if (!id) {
            Alert.alert(t('common.error'), 'Le lien est invalide. Vérifiez et réessayez.');
            setStep('choice');
            return;
        }

        try {
            const res = await fetch(`${SERVER_URL}/download/${id}/details`);
            if (!res.ok) throw new Error('Introuvable');
            const data = await res.json();
            setPreviewData({ ...data, id });
            setStep('preview');
        } catch (error) {
            Alert.alert(
                t('common.error'),
                'Le téléchargement a échoué. Le lien est peut-être expiré.'
            );
            setStep('choice');
        }
    };

    const performRealDownload = async () => {
        if (!previewData?.id) return;
        const id = previewData.id;
        try {
            const downloadUrl = `${SERVER_URL}/download/${id}?zip=true`;
            const supported = await Linking.canOpenURL(downloadUrl);
            if (!supported) throw new Error('URL non supportée');

            await Linking.openURL(downloadUrl);

            setFileName(id);
            setStep('done');

            const receivedTransfer = {
                id: id,
                fileName: previewData.fileName || `Fichier reçu (${id})`,
                downloadUrl: downloadUrl,
                sentAt: new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                status: 'downloaded',
            };

            const existing = await AsyncStorage.getItem('faas_received_history');
            const history = existing ? JSON.parse(existing) : [];
            if (!history.find((t: any) => t.id === id)) {
                history.unshift(receivedTransfer);
                await AsyncStorage.setItem('faas_received_history', JSON.stringify(history));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleQRScan = ({ data }: { data: string }) => {
        setLink(data);
        downloadFile(data);
    };

    const openScanner = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(
                    'Permission refusée',
                    'Autorisez l\'accès à la caméra pour scanner un QR code.'
                );
                return;
            }
        }
        setStep('scanning');
    };

    if (step === 'choice') {
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
                        <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.backButtonText}>{t('common.back')}</Text>
                    </Pressable>

                    <Text style={styles.title}>{t('receive.title')}</Text>
                    <Text style={styles.subtitle}>{t('receive.subtitle')}</Text>

                    <View style={styles.choicesContainer}>
                        <ActionCard 
                            icon="qr-code-outline" 
                            title={t('receive.scan_qr')} 
                            description={t('receive.scan_desc')} 
                            onPress={openScanner} 
                        />
                        <ActionCard 
                            icon="link-outline" 
                            title={t('receive.enter_link')} 
                            description={t('receive.link_desc')} 
                            onPress={() => setStep('manual')} 
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'scanning') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={styles.contentWrapper}>
                    <Pressable style={styles.backButton} onPress={() => setStep('choice')}>
                        <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.backButtonText}>{t('common.back')}</Text>
                    </Pressable>

                    <Text style={styles.title}>{t('receive.scan_qr')}</Text>
                    <Text style={styles.subtitle}>{t('receive.scan_desc')}</Text>

                    <View style={styles.cameraContainer}>
                        <CameraView
                            style={styles.camera}
                            facing="back"
                            autofocus={true}
                            onBarcodeScanned={handleQRScan}
                            barcodeScannerSettings={{
                                barcodeTypes: ['qr'],
                            }}
                        />
                        <View style={styles.scanOverlay}>
                            <View style={styles.scanCorner} />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'manual') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={styles.contentWrapper}>
                    <Pressable style={styles.backButton} onPress={() => setStep('choice')}>
                        <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.backButtonText}>{t('common.back')}</Text>
                    </Pressable>

                    <Text style={styles.title}>{t('receive.enter_link')}</Text>
                    <Text style={styles.subtitle}>{t('receive.link_desc')}</Text>

                    <View style={styles.inputContainer}>
                        <Ionicons name="link-outline" size={20} color={colors.textMuted} />
                        <TextInput
                            style={styles.input}
                            placeholder="http://..."
                            placeholderTextColor={colors.textSubtle}
                            value={link}
                            onChangeText={setLink}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.downloadButton,
                            pressed && styles.downloadButtonPressed,
                            !link && styles.downloadButtonDisabled,
                        ]}
                        onPress={() => downloadFile(link)}
                        disabled={!link}>
                        <Ionicons name="download-outline" size={20} color="#ffffff" />
                        <Text style={styles.downloadButtonText}>{t('receive.download')}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'downloading') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>
                    <View style={styles.downloadIcon}>
                        <Ionicons name="arrow-down-circle" size={80} color={colors.primary} />
                    </View>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.downloadingTitle}>{t('receive.downloading')}</Text>
                    <Text style={styles.downloadingSubtitle}>Veuillez patienter</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'preview') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={[styles.contentWrapper, { paddingBottom: 20 }]}>
                    <Pressable style={styles.backButton} onPress={() => setStep('choice')}>
                        <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.backButtonText}>{t('common.back')}</Text>
                    </Pressable>

                    <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center', flex: 1 }}>
                        <Text style={[styles.title, { marginTop: 40 }]}>Fichiers prêts</Text>
                        <Text style={styles.subtitle}>{previewData?.files?.length} fichier(s) dans ce lot</Text>

                        <View style={{ flex: 1, width: '100%', marginTop: 20 }}>
                            <ScrollView contentContainerStyle={{ gap: 16 }}>
                                {previewData?.files?.map((file: any, idx: number) => (
                                    <View key={idx} style={{ 
                                        backgroundColor: colors.card, 
                                        borderRadius: 16, 
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: colors.border
                                    }}>
                                        {file.isImage && (
                                            <Image source={{ uri: file.url }} style={{ width: '100%', height: 200 }} contentFit="cover" />
                                        )}
                                        {file.isVideo && (
                                            <Video 
                                                source={{ uri: file.url }} 
                                                style={{ width: '100%', height: 200 }} 
                                                resizeMode={ResizeMode.COVER} 
                                                useNativeControls 
                                            />
                                        )}
                                        {!file.isImage && !file.isVideo && (
                                            <View style={{ width: '100%', height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardHovered }}>
                                                <Ionicons name="document-text" size={40} color={colors.textMuted} />
                                            </View>
                                        )}
                                        <View style={{ padding: 12 }}>
                                            <Text style={{ color: colors.text, fontWeight: '600' }}>{file.name}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <Pressable
                            style={[styles.downloadButton, { marginTop: 20, width: '100%' }]}
                            onPress={performRealDownload}>
                            <Ionicons name="download-outline" size={20} color="#ffffff" />
                            <Text style={styles.downloadButtonText}>Télécharger ({previewData?.files?.length > 1 ? 'ZIP' : 'Fichier'})</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                <Text style={styles.successTitle}>{t('receive.success')}</Text>
                <Text style={styles.successSubtitle}>
                    Le fichier a été ouvert dans votre navigateur.
                </Text>

                <Pressable
                    style={styles.backButtonFull}
                    onPress={() => {
                        setStep('choice');
                        setLink('');
                        setFileName('');
                    }}>
                    <Ionicons name="arrow-back-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.backButtonFullText}>{t('receive.another')}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
        justifyContent: 'center',
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

    title: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },

    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginBottom: 40,
    },

    choicesContainer: {
        justifyContent: 'center',
        gap: 16,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },

    cameraContainer: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        maxWidth: 500,
        maxHeight: 500,
        borderWidth: 1,
        borderColor: colors.border,
    },

    camera: {
        flex: 1,
    },

    scanOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scanCorner: {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 12,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
        width: '100%',
        maxWidth: 500,
    },

    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
    },

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        maxWidth: 500,
    },

    downloadButtonPressed: {
        backgroundColor: colors.cardHovered,
    },

    downloadButtonDisabled: {
        backgroundColor: colors.border,
        opacity: 0.5,
    },

    downloadButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },

    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
    },

    downloadIcon: {
        marginBottom: 8,
    },

    downloadingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },

    downloadingSubtitle: {
        fontSize: 16,
        color: colors.textMuted,
    },

    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },

    successSubtitle: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },

    backButtonFull: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },

    backButtonFullText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
});
