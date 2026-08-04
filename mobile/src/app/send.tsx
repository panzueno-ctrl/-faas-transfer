/**
 * app/send.tsx
 *
 * Écran d'envoi de fichiers.
 * Flux en 4 étapes :
 * 1. Sélection de la catégorie
 * 2. Sélection du fichier
 * 3. Upload avec barre de progression
 * 4. Résultat avec QR code et lien
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
    Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ActionCard from '../components/ActionCard';

// On importe AsyncStorage pour sauvegarder l'historique des envois
import AsyncStorage from '@react-native-async-storage/async-storage';

// On importe QRCode pour générer le QR code du lien de téléchargement
import QRCode from 'react-native-qrcode-svg';

// Adresse du serveur
const SERVER_URL = 'https://faas-transfer.onrender.com';

// Catégories de fichiers disponibles avec leurs types MIME
const CATEGORIES = [
    {
        id: 'images',
        label: 'Photos',
        icon: 'image-outline',
        mimeTypes: ['image/*'],
    },
    {
        id: 'audio',
        label: 'Audio',
        icon: 'musical-notes-outline',
        mimeTypes: ['audio/*'],
    },
    {
        id: 'video',
        label: 'Vidéos',
        icon: 'videocam-outline',
        mimeTypes: ['video/*'],
    },
    {
        id: 'downloads',
        label: 'Téléchargements',
        icon: 'download-outline',
        mimeTypes: ['*/*'],
    },
    {
        id: 'documents',
        label: 'Documents',
        icon: 'document-outline',
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
    },
    {
        id: 'all',
        label: 'Tous les fichiers',
        icon: 'folder-outline',
        mimeTypes: ['*/*'],
    },
];

export default function SendScreen() {

    // Pour naviguer vers d'autres écrans
    const router = useRouter();

    // Étape actuelle du flux
    const [step, setStep] = useState<'category' | 'uploading' | 'done'>('category');

    // Fichier sélectionné par l'utilisateur
    const [selectedFile, setSelectedFile] = useState<any>(null);

    // Progression de l'upload de 0 à 100
    const [progress, setProgress] = useState(0);

    // Résultat retourné par le serveur après upload
    const [result, setResult] = useState<{ id: string; downloadUrl: string } | null>(null);

    // Contrôle l'affichage du toast "Copié ✓"
    const [copied, setCopied] = useState(false);

    // Ouvre le sélecteur de fichier selon la catégorie choisie
    const pickFile = async (mimeTypes: string[]) => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: mimeTypes,
                copyToCacheDirectory: true,
                // On autorise la sélection de plusieurs fichiers
                multiple: true,
            });

            if (res.canceled) return;

            const files = res.assets;
            setSelectedFile(files[0]);

            // Si un seul fichier → endpoint normal
            // Si plusieurs fichiers → endpoint multiple
            if (files.length === 1) {
                await uploadFile(files[0]);
            } else {
                await uploadMultipleFiles(files);
            }

        } catch (error) {
            Alert.alert('Erreur', 'Impossible de sélectionner le fichier.');
        }
    };

    // Envoie le fichier au serveur Express
    const uploadFile = async (file: any) => {
        setStep('uploading');
        setProgress(0);

        try {
            // On crée un FormData pour envoyer le fichier
            const formData = new FormData();

            // Sur le web on convertit d'abord le fichier en Blob
            // car on ne peut pas envoyer directement l'URI
            const response_file = await fetch(file.uri);
            const blob = await response_file.blob();

            // On ajoute le blob au FormData avec le nom original du fichier
            formData.append('file', blob, file.name);

            // Simulation de la progression — on monte jusqu'à 90%
            // Les 10% restants arrivent quand le serveur confirme la réception
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Envoi du fichier vers le serveur Express
            const response = await fetch(`${SERVER_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            // On arrête la progression simulée et on passe à 100%
            clearInterval(progressInterval);
            setProgress(100);

            // Si le serveur retourne une erreur
            if (!response.ok) {
                throw new Error('Erreur serveur');
            }

            // On récupère l'id unique et le lien de téléchargement
            const data = await response.json();
            setResult(data);

            // On sauvegarde le transfert dans l'historique local
            const transfer = {
                id: data.id,
                fileName: file.name,
                downloadUrl: data.downloadUrl,
                sentAt: new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                status: 'pending',
            };

            // On récupère l'historique existant et on ajoute le nouveau transfert en tête
            const existing = await AsyncStorage.getItem('faas_history');
            const history = existing ? JSON.parse(existing) : [];
            history.unshift(transfer);
            await AsyncStorage.setItem('faas_history', JSON.stringify(history));

            setStep('done');

        } catch (error) {
            // Message d'erreur simple pour l'utilisateur
            Alert.alert(
                'Erreur',
                'Le transfert a échoué. Vérifiez votre connexion et réessayez.'
            );
            setStep('category');
        }
    };

    // Envoie plusieurs fichiers vers le serveur qui les zippe
    const uploadMultipleFiles = async (files: any[]) => {
        setStep('uploading');
        setProgress(0);

        try {
            // On crée un FormData avec tous les fichiers
            const formData = new FormData();

            // On convertit chaque fichier en Blob et on l'ajoute au FormData
            for (const file of files) {
                const response_file = await fetch(file.uri);
                const blob = await response_file.blob();
                formData.append('files', blob, file.name);
            }

            // Simulation de progression
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Envoi vers le nouvel endpoint multiple
            const response = await fetch(`${SERVER_URL}/upload/multiple`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                throw new Error('Erreur serveur');
            }

            // On récupère l'id et le lien du ZIP
            const data = await response.json();
            setResult(data);

            // On sauvegarde dans l'historique
            const transfer = {
                id: data.id,
                fileName: `${files.length} fichiers envoyés`,
                downloadUrl: data.downloadUrl,
                sentAt: new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                status: 'pending',
            };

            const existing = await AsyncStorage.getItem('faas_history');
            const history = existing ? JSON.parse(existing) : [];
            history.unshift(transfer);
            await AsyncStorage.setItem('faas_history', JSON.stringify(history));

            setStep('done');

        } catch (error) {
            Alert.alert(
                'Erreur',
                'Le transfert a échoué. Vérifiez votre connexion et réessayez.'
            );
            setStep('category');
        }
    };

    // Copie le lien dans le presse-papier et affiche le toast
    const copyLink = () => {
        Clipboard.setString(result?.downloadUrl || '');
        // On affiche le toast pendant 3 secondes
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    // Réinitialise le flux pour un nouveau transfert
    const reset = () => {
        setStep('category');
        setSelectedFile(null);
        setProgress(0);
        setResult(null);
        setCopied(false);
    };

    // ── ÉTAPE 1 — Sélection de la catégorie ──
    if (step === 'category') {
        return (
            <View style={styles.container}>
                {/* Orbe lumineux en fond */}
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                {/* Conteneur principal avec zIndex élevé pour forcer le premier plan */}
                <View style={styles.contentWrapper}>
                    {/* Bouton retour hors du bloc centré */}
                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.backButton,
                            (pressed || hovered) && styles.backButtonHovered
                        ]}
                        onPress={() => router.push('/')}>
                        <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                        <Text style={styles.backButtonText}>Accueil</Text>
                    </Pressable>
                    
                    <Text style={styles.title}>Envoyer un fichier</Text>
                    <Text style={styles.subtitle}>Choisissez une catégorie</Text>
                    
                    <View style={styles.categoriesGrid}>
                        {CATEGORIES.map((cat) => (
                            <ActionCard
                                key={cat.id}
                                title={cat.label}
                                description="" 
                                icon={cat.icon as any}
                                onPress={() => pickFile(cat.mimeTypes)}
                                style={styles.categoryCard} 
                                compact={true} 
                            />
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    // ── ÉTAPE 2 — Upload en cours ──
    if (step === 'uploading') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>

                    {/* Indicateur de chargement animé */}
                    <ActivityIndicator size="large" color="#3B82F6" />

                    <Text style={styles.uploadingTitle}>Transfert en cours...</Text>
                    <Text style={styles.uploadingFile}>{selectedFile?.name}</Text>

                    {/* Barre de progression */}
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{progress}%</Text>

                </View>
            </SafeAreaView>
        );
    }

    // ── ÉTAPE 3 — Transfert effectué ──
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />

            <ScrollView style={{ flex: 1, zIndex: 10, width: '100%' }} contentContainerStyle={styles.resultContent}>

                {/* Bouton pour recommencer un nouveau transfert */}
                <Pressable style={styles.backButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                    <Text style={styles.backButtonText}>Nouveau transfert</Text>
                </Pressable>

                {/* Icône de succès */}
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
                </View>

                <Text style={styles.successTitle}>Transfert effectué ✅</Text>
                <Text style={styles.successFile}>{selectedFile?.name}</Text>

                {/* QR Code — le receiver scanne pour télécharger directement */}
                <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>Scanner pour télécharger</Text>
                    <QRCode
                        value={result?.downloadUrl || ''}
                        size={180}
                        color="#ffffff"
                        backgroundColor="#1a1a1a"
                    />
                </View>

                {/* Lien de téléchargement — affiché mais pas cliquable */}
                {/* Non cliquable volontairement : évite que le sender déclenche */}
                {/* le téléchargement par erreur et supprime le fichier */}
                <View style={styles.linkContainer}>
                    <Text style={styles.linkLabel}>Lien de téléchargement</Text>
                    <View style={styles.linkRow}>

                        {/* Texte du lien */}
                        <View style={styles.linkTextContainer}>
                            <Text style={styles.linkText} numberOfLines={2}>
                                {result?.downloadUrl}
                            </Text>
                        </View>

                        {/* Bouton copier — copie le lien et affiche le toast */}
                        <Pressable style={styles.copyButton} onPress={copyLink}>
                            <Ionicons name="copy-outline" size={20} color="#4a9eff" />
                        </Pressable>

                    </View>
                </View>

                <Text style={styles.shareInstruction}>
                    Scannez le QR code ou copiez le lien et envoyez-le au destinataire.
                </Text>

            </ScrollView>

            {/* Toast "Copié ✓" — placé en dehors du ScrollView */}
            {/* pour que position absolute fonctionne correctement */}
            {copied && (
                <View style={styles.toast}>
                    <Ionicons name="checkmark-circle" size={16} color="#4a9eff" />
                    <Text style={styles.toastText}>Copié ✓</Text>
                </View>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0B0C10', // Deep Midnight
        padding: 32,
        position: 'relative',
        overflow: 'hidden',
    },

    // Nouveau wrapper qui force le contenu en haut
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

    // Bouton retour en haut à gauche
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
        zIndex: 1,
    },

    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 40,
        zIndex: 1,
    },

    // Grille des catégories — deux colonnes
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        maxWidth: 900,
        width: '100%',
        zIndex: 10, // FIX: s'assure que la grille est au-dessus du glow
    },

    // On ne garde que la largeur pour forcer les cartes à s'aligner sur 2 colonnes
    categoryCard: {
        width: 260,
    },
    // 🧹 MÉNAGE : Les styles internes (pressé, label, etc.) sont maintenant gérés par ActionCard !

    // Centrage du contenu pour l'étape upload
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        zIndex: 10, // FIX
    },

    uploadingTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F8FAFC',
        marginTop: 16,
    },

    uploadingFile: {
        fontSize: 15,
        color: '#94A3B8',
        marginBottom: 24,
    },

    // Barre de progression de l'upload
    progressBar: {
        width: '100%',
        maxWidth: 400,
        height: 8,
        backgroundColor: '#13151A',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1F232D',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },

    progressText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
    },

    // Contenu de l'étape résultat
    resultContent: {
        alignItems: 'center',
        gap: 24,
        paddingBottom: 40,
        paddingTop: 80, // Laisse la place au bouton retour absolu
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        zIndex: 10, // FIX
    },

    successIcon: {
        marginTop: 8,
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        padding: 20,
        borderRadius: 60,
    },

    successTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F8FAFC',
        letterSpacing: -0.5,
    },

    successFile: {
        fontSize: 15,
        color: '#94A3B8',
        marginTop: -12,
    },

    // Conteneur du QR code
    qrContainer: {
        backgroundColor: '#13151A',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        gap: 20,
        borderWidth: 1,
        borderColor: '#1F232D',
        width: '100%',
    },

    qrLabel: {
        color: '#94A3B8',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: '600',
    },

    // Conteneur du lien avec bouton copier
    linkContainer: {
        width: '100%',
        backgroundColor: '#0B0C10',
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#1F232D',
    },

    linkLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: '600',
    },

    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    linkTextContainer: {
        flex: 1,
    },

    linkText: {
        color: '#3B82F6',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },

    copyButton: {
        padding: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },

    shareInstruction: {
        fontSize: 13,
        color: '#888888',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Toast "Copié ✓" — apparaît en bas de l'écran pendant 3 secondes
    toast: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#4a9eff',
    },

    toastText: {
        color: '#4a9eff',
        fontSize: 14,
        fontWeight: '600',
    },

});





















