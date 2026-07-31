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

// Adresse du serveur — remplace par l'URL railway pour tester sur téléphone
const SERVER_URL = 'https://faas-transfer-production.up.railway.app';

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
                <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                    <Text style={styles.backButtonText}>Accueil</Text>
                </Pressable>
                <Text style={styles.title}>Envoyer un fichier</Text>
                <Text style={styles.subtitle}>Choisissez une catégorie</Text>
                <View style={styles.categoriesGrid}>
                    {CATEGORIES.map((cat) => (
                        <ActionCard
                            key={cat.id}
                            title={cat.label}
                            description="" // Pas de description pour les catégories
                            icon={cat.icon as any}
                            onPress={() => pickFile(cat.mimeTypes)}
                            style={styles.categoryCard} // On garde votre largeur de 260px
                            compact={true} // On utilise le mode réduit !
                        />
                    ))}
                </View>
            </View>
        );
    }

    // ── ÉTAPE 2 — Upload en cours ──
    if (step === 'uploading') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>

                    {/* Indicateur de chargement animé */}
                    <ActivityIndicator size="large" color="#4a9eff" />

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

            <ScrollView contentContainerStyle={styles.resultContent}>

                {/* Bouton pour recommencer un nouveau transfert */}
                <Pressable style={styles.backButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
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
        backgroundColor: '#0a0a0a',
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Bouton retour en haut à gauche
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        alignSelf: 'flex-start',
        position: 'absolute',       // ← positionné en absolu
        top: 20,
        left: 20,
    },

    backButtonText: {
        color: '#ffffff',
        fontSize: 20,
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

    // Grille des catégories — deux colonnes
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        maxWidth: 900,
        width: '100%',
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
    },

    uploadingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    uploadingFile: {
        fontSize: 13,
        color: '#666666',
    },

    // Barre de progression de l'upload
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: '#222222',
        borderRadius: 3,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#4a9eff',
        borderRadius: 3,
    },

    progressText: {
        color: '#4a9eff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Contenu de l'étape résultat
    resultContent: {
        alignItems: 'center',
        gap: 20,
        paddingBottom: 40,
    },

    successIcon: {
        marginTop: 8,
    },

    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    successFile: {
        fontSize: 13,
        color: '#666666',
    },

    // Conteneur du QR code
    qrContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: '#333333',
        width: '100%',
    },

    qrLabel: {
        color: '#666666',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Conteneur du lien avec bouton copier
    linkContainer: {
        width: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#333333',
    },

    linkLabel: {
        fontSize: 12,
        color: '#666666',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    linkTextContainer: {
        flex: 1,
    },

    linkText: {
        color: '#4a9eff',
        fontSize: 13,
        lineHeight: 20,
    },

    copyButton: {
        padding: 8,
        backgroundColor: '#111111',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333333',
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





















