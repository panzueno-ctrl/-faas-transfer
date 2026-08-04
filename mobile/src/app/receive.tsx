/**
 * app/receive.tsx
 *
 * Écran de réception de fichiers.
 * Flux en 3 étapes :
 * 1. Choix du mode — scanner QR code ou entrer le lien manuellement
 * 2. Téléchargement en cours avec animation
 * 3. Confirmation du téléchargement réussi
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ActionCard from '../components/ActionCard';

const SERVER_URL = 'https://faas-transfer.onrender.com';

export default function ReceiveScreen() {
    const router = useRouter();
    const [step, setStep] = useState<'choice' | 'scanning' | 'manual' | 'downloading' | 'done'>('choice');
    const [link, setLink] = useState('');
    const [fileName, setFileName] = useState('');
    const [permission, requestPermission] = useCameraPermissions();

    const extractId = (url: string) => {
        const parts = url.split('/download/');
        return parts.length > 1 ? parts[1].trim() : null;
    };

    const downloadFile = async (url: string) => {
        setStep('downloading');
        const id = extractId(url);

        if (!id) {
            Alert.alert('Erreur', 'Le lien est invalide. Vérifiez et réessayez.');
            setStep('choice');
            return;
        }

        try {
            const downloadUrl = `${SERVER_URL}/download/${id}`;
            const supported = await Linking.canOpenURL(downloadUrl);

            if (!supported) {
                throw new Error('URL non supportée');
            }

            await Linking.openURL(downloadUrl);

            setFileName(id);
            setStep('done');

        } catch (error) {
            Alert.alert(
                'Erreur',
                'Le téléchargement a échoué. Le lien est peut-être expiré.'
            );
            setStep('choice');
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
                    {/* Bouton retour hors flux, positionné en absolu */}
                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.backButton,
                            (pressed || hovered) && styles.backButtonHovered
                        ]}
                        onPress={() => router.push('/')}>
                        <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                        <Text style={styles.backButtonText}>Accueil</Text>
                    </Pressable>

                    <Text style={styles.title}>Recevoir un fichier</Text>
                    <Text style={styles.subtitle}>Comment voulez-vous recevoir ?</Text>

                    <View style={styles.choicesContainer}>
                        <ActionCard 
                            icon="qr-code-outline" 
                            title="Scanner un QR code" 
                            description="Scannez le QR code affiché sur l'écran de l'envoyeur" 
                            onPress={openScanner} 
                        />
                        <ActionCard 
                            icon="link-outline" 
                            title="Entrer le lien" 
                            description="Collez le lien reçu par message ou email" 
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
                        <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                        <Text style={styles.backButtonText}>Retour</Text>
                    </Pressable>

                    <Text style={styles.title}>Scanner le QR code</Text>
                    <Text style={styles.subtitle}>Pointez la caméra vers le QR code</Text>

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
                        <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                        <Text style={styles.backButtonText}>Retour</Text>
                    </Pressable>

                    <Text style={styles.title}>Entrer le lien</Text>
                    <Text style={styles.subtitle}>Collez le lien reçu de l'envoyeur</Text>

                    <View style={styles.inputContainer}>
                        <Ionicons name="link-outline" size={20} color="#94A3B8" />
                        <TextInput
                            style={styles.input}
                            placeholder="http://..."
                            placeholderTextColor="#475569"
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
                        <Text style={styles.downloadButtonText}>Télécharger</Text>
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
                        <Ionicons name="arrow-down-circle" size={80} color="#3B82F6" />
                    </View>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.downloadingTitle}>Transfert en cours...</Text>
                    <Text style={styles.downloadingSubtitle}>Veuillez patienter</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                <Text style={styles.successTitle}>Téléchargé avec succès ✅</Text>
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
                    <Ionicons name="arrow-back-outline" size={20} color="#94A3B8" />
                    <Text style={styles.backButtonFullText}>Recevoir un autre fichier</Text>
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

    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F8FAFC',
        marginBottom: 8,
        letterSpacing: -0.5,
    },

    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
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
        borderColor: '#1F232D',
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
        borderColor: '#3B82F6',
        borderRadius: 12,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#13151A',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#1F232D',
        marginBottom: 24,
        width: '100%',
        maxWidth: 500,
    },

    input: {
        flex: 1,
        color: '#F8FAFC',
        fontSize: 16,
    },

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        maxWidth: 500,
    },

    downloadButtonPressed: {
        backgroundColor: '#2563EB',
    },

    downloadButtonDisabled: {
        backgroundColor: '#1F232D',
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
        color: '#F8FAFC',
    },

    downloadingSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
    },

    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8FAFC',
        textAlign: 'center',
    },

    successSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },

    backButtonFull: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#13151A',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F232D',
    },

    backButtonFullText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
    },
});

