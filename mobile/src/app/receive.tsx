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

// Adresse du serveur
const SERVER_URL = 'https://faas-transfer-production.up.railway.app';

export default function ReceiveScreen() {

    // Pour naviguer vers d'autres écrans
    const router = useRouter();

    // Étape actuelle du flux
    const [step, setStep] = useState<'choice' | 'scanning' | 'manual' | 'downloading' | 'done'>('choice');

    // Lien entré manuellement ou scanné
    const [link, setLink] = useState('');

    // Nom du fichier téléchargé
    const [fileName, setFileName] = useState('');

    // Permission caméra pour le scanner QR
    const [permission, requestPermission] = useCameraPermissions();

    // Extrait l'id depuis le lien de téléchargement
    // ex: http://localhost:3000/download/abc123 → abc123
    const extractId = (url: string) => {
        const parts = url.split('/download/');
        return parts.length > 1 ? parts[1].trim() : null;
    };

    // Démarre le téléchargement depuis le lien
    const downloadFile = async (url: string) => {
        setStep('downloading');

        const id = extractId(url);

        // Si l'id n'est pas valide on affiche une erreur
        if (!id) {
            Alert.alert('Erreur', 'Le lien est invalide. Vérifiez et réessayez.');
            setStep('choice');
            return;
        }

        try {
            // On ouvre le lien dans le navigateur pour déclencher le téléchargement
            // C'est la façon la plus simple et compatible avec tous les appareils
            const downloadUrl = `${SERVER_URL}/download/${id}`;
            const supported = await Linking.canOpenURL(downloadUrl);

            if (!supported) {
                throw new Error('URL non supportée');
            }

            await Linking.openURL(downloadUrl);

            // On considère le téléchargement réussi après l'ouverture du lien
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

    // Gère le scan d'un QR code
    const handleQRScan = ({ data }: { data: string }) => {
        // On arrête le scanner et on démarre le téléchargement
        setLink(data);
        downloadFile(data);
    };

    // Demande la permission caméra et ouvre le scanner
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

    // ── ÉTAPE 1 — Choix du mode ──
    if (step === 'choice') {
        return (
            <SafeAreaView style={styles.container}>

                {/* Bouton retour vers l'accueil */}
                <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                    <Text style={styles.backButtonText}>Accueil</Text>
                </Pressable>

                <Text style={styles.title}>Recevoir un fichier</Text>
                <Text style={styles.subtitle}>Comment voulez-vous recevoir ?</Text>

                <View style={styles.choicesContainer}>

                    {/* Option 1 — Scanner le QR code */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.choiceCard,
                            pressed && styles.choiceCardPressed,
                        ]}
                        onPress={openScanner}>
                        <Ionicons name="qr-code-outline" size={48} color="#4a9eff" />
                        <Text style={styles.choiceLabel}>Scanner un QR code</Text>
                        <Text style={styles.choiceDescription}>
                            Scannez le QR code affiché sur l'écran de l'envoyeur
                        </Text>
                    </Pressable>

                    {/* Option 2 — Entrer le lien manuellement */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.choiceCard,
                            pressed && styles.choiceCardPressed,
                        ]}
                        onPress={() => setStep('manual')}>
                        <Ionicons name="link-outline" size={48} color="#4a9eff" />
                        <Text style={styles.choiceLabel}>Entrer le lien</Text>
                        <Text style={styles.choiceDescription}>
                            Collez le lien reçu par message ou email
                        </Text>
                    </Pressable>

                </View>

            </SafeAreaView>
        );
    }

    // ── ÉTAPE 2 — Scanner QR code ──
    if (step === 'scanning') {
        return (
            <SafeAreaView style={styles.container}>

                {/* Bouton retour */}
                <Pressable style={styles.backButton} onPress={() => setStep('choice')}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                    <Text style={styles.backButtonText}>Retour</Text>
                </Pressable>

                <Text style={styles.title}>Scanner le QR code</Text>
                <Text style={styles.subtitle}>Pointez la caméra vers le QR code</Text>

                {/* Vue caméra pour scanner le QR code */}
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={handleQRScan}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                    />
                    {/* Viseur au centre */}
                    <View style={styles.scanOverlay}>
                        <View style={styles.scanCorner} />
                    </View>
                </View>

            </SafeAreaView>
        );
    }

    // ── ÉTAPE 3 — Entrer le lien manuellement ──
    if (step === 'manual') {
        return (
            <SafeAreaView style={styles.container}>

                {/* Bouton retour */}
                <Pressable style={styles.backButton} onPress={() => setStep('choice')}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                    <Text style={styles.backButtonText}>Retour</Text>
                </Pressable>

                <Text style={styles.title}>Entrer le lien</Text>
                <Text style={styles.subtitle}>Collez le lien reçu de l'envoyeur</Text>

                {/* Champ de saisie du lien */}
                <View style={styles.inputContainer}>
                    <Ionicons name="link-outline" size={20} color="#666666" />
                    <TextInput
                        style={styles.input}
                        placeholder="http://..."
                        placeholderTextColor="#444444"
                        value={link}
                        onChangeText={setLink}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                </View>

                {/* Bouton télécharger */}
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

            </SafeAreaView>
        );
    }

    // ── ÉTAPE 4 — Téléchargement en cours ──
    if (step === 'downloading') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>

                    {/* Flèche animée vers le bas */}
                    <View style={styles.downloadIcon}>
                        <Ionicons name="arrow-down-circle" size={80} color="#4a9eff" />
                    </View>

                    <ActivityIndicator size="large" color="#4a9eff" />
                    <Text style={styles.downloadingTitle}>Téléchargement en cours...</Text>
                    <Text style={styles.downloadingSubtitle}>Veuillez patienter</Text>

                </View>
            </SafeAreaView>
        );
    }

    // ── ÉTAPE 5 — Téléchargement réussi ──
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.centerContent}>

                {/* Icône succès */}
                <Ionicons name="checkmark-circle" size={80} color="#4caf50" />

                <Text style={styles.successTitle}>Téléchargé avec succès ✅</Text>
                <Text style={styles.successSubtitle}>
                    Le fichier a été ouvert dans votre navigateur.
                </Text>

                {/* Bouton pour recevoir un autre fichier */}
                <Pressable
                    style={styles.downloadButton}
                    onPress={() => {
                        setStep('choice');
                        setLink('');
                        setFileName('');
                    }}>
                    <Ionicons name="arrow-back-outline" size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>Recevoir un autre fichier</Text>
                </Pressable>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        padding: 20,
    },

    // Bouton retour en haut à gauche
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },

    backButtonText: {
        color: '#aaaaaa',
        fontSize: 14,
    },

    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },

    subtitle: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 24,
    },

    // Conteneur des deux choix
    choicesContainer: {
        gap: 16,
        flex: 1,
        justifyContent: 'center',
    },

    // Carte de choix
    choiceCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#222222',
    },

    choiceCardPressed: {
        backgroundColor: '#222222',
        borderColor: '#4a9eff',
    },

    choiceLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    choiceDescription: {
        fontSize: 13,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Caméra pour scanner le QR code
    cameraContainer: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },

    camera: {
        flex: 1,
    },

    // Viseur au centre de la caméra
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
        borderColor: '#4a9eff',
        borderRadius: 12,
    },

    // Champ de saisie du lien
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#333333',
        marginBottom: 16,
    },

    input: {
        flex: 1,
        color: '#ffffff',
        fontSize: 14,
    },

    // Bouton télécharger
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4a9eff',
        paddingVertical: 16,
        borderRadius: 12,
    },

    downloadButtonPressed: {
        backgroundColor: '#3a8eef',
    },

    downloadButtonDisabled: {
        backgroundColor: '#333333',
        opacity: 0.5,
    },

    downloadButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },

    // Centrage du contenu
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },

    // Icône téléchargement en cours
    downloadIcon: {
        marginBottom: 8,
    },

    downloadingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    downloadingSubtitle: {
        fontSize: 14,
        color: '#666666',
    },

    // Écran succès
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
    },

    successSubtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
    },

});