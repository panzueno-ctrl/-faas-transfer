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

// Adresse du serveur
const SERVER_URL = 'http://localhost:3000';

// Groupe 1 — Conversions de fichiers
const CONVERSIONS = [
    {
        id: 'word-to-pdf',
        label: 'Word → PDF',
        icon: 'document-text-outline',
        endpoint: '/convert/word-to-pdf',
        mimeTypes: ['application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
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

// Groupe 2 — Traitement PDF
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

    // Pour naviguer vers d'autres écrans
    const router = useRouter();

    // Étape actuelle du flux
    const [step, setStep] = useState<'menu' | 'processing' | 'done'>('menu');

    // Service sélectionné par l'utilisateur
    const [selectedService, setSelectedService] = useState<any>(null);

    // Nom du fichier traité
    const [fileName, setFileName] = useState('');

    // URL du fichier résultat à télécharger
    const [resultUrl, setResultUrl] = useState('');

    // Sélectionne un fichier et lance le traitement
    const handleServicePress = async (service: any) => {
        setSelectedService(service);

        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: service.mimeTypes,
                copyToCacheDirectory: true,
                // Pour fusionner on permet la sélection multiple
                multiple: service.multiple || false,
            });

            // Si l'utilisateur a annulé
            if (res.canceled) return;

            const file = res.assets[0];
            setFileName(file.name);

            // On lance le traitement
            await processFile(service, file);

        } catch (error) {
            Alert.alert('Erreur', 'Impossible de sélectionner le fichier.');
        }
    };

    // Envoie le fichier au serveur pour traitement
    const processFile = async (service: any, file: any) => {
        setStep('processing');

        try {
            // On crée le FormData avec le fichier
            const formData = new FormData();

            // Conversion du fichier en Blob pour le web
            const response_file = await fetch(file.uri);
            const blob = await response_file.blob();
            formData.append('file', blob, file.name);

            // Certains services nécessitent des paramètres supplémentaires
            if (service.id === 'rotate-pdf') {
                // Rotation par défaut à 90 degrés
                formData.append('rotation', '90');
            }
            if (service.id === 'watermark-pdf') {
                // Filigrane par défaut
                formData.append('text', 'CONFIDENTIEL');
            }
            if (service.id === 'protect-pdf') {
                // Mot de passe par défaut — à personnaliser plus tard
                formData.append('password', 'faas2024');
            }

            // Envoi vers le serveur
            const response = await fetch(`${SERVER_URL}${service.endpoint}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Erreur serveur');
            }

            // On récupère le fichier traité sous forme de blob
            const resultBlob = await response.blob();

            // On crée une URL temporaire pour télécharger le fichier
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

    // Télécharge le fichier résultat
    const downloadResult = () => {
        // On crée un lien temporaire et on clique dessus pour télécharger
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `faas-${selectedService.id}.${selectedService.outputExt}`;
        a.click();
    };

    // Réinitialise pour un nouveau traitement
    const reset = () => {
        setStep('menu');
        setSelectedService(null);
        setFileName('');
        setResultUrl('');
    };


    // ── ÉTAPE 1 — Menu des services ──
    if (step === 'menu') {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Bouton retour vers l'accueil */}
                    <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                        <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                        <Text style={styles.backButtonText}>Accueil</Text>
                    </Pressable>

                    <Text style={styles.title}>Convertir</Text>

                    {/* Groupe 1 — Conversions */}
                    <Text style={styles.groupTitle}>Convertissez votre fichier</Text>
                    <View style={styles.grid}>
                        {CONVERSIONS.map((service) => (
                            <Pressable
                                key={service.id}
                                style={({ pressed }) => [
                                    styles.serviceCard,
                                    pressed && styles.serviceCardPressed,
                                ]}
                                onPress={() => handleServicePress(service)}>
                                <Ionicons name={service.icon as any} size={28} color="#4a9eff" />
                                <Text style={styles.serviceLabel}>{service.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Groupe 2 — Traitement PDF */}
                    <Text style={styles.groupTitle}>Traitez votre fichier</Text>
                    <View style={styles.grid}>
                        {PDF_TOOLS.map((service) => (
                            <Pressable
                                key={service.id}
                                style={({ pressed }) => [
                                    styles.serviceCard,
                                    pressed && styles.serviceCardPressed,
                                ]}
                                onPress={() => handleServicePress(service)}>
                                <Ionicons name={service.icon as any} size={28} color="#4a9eff" />
                                <Text style={styles.serviceLabel}>{service.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── ÉTAPE 2 — Traitement en cours ──
    if (step === 'processing') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4a9eff" />
                    <Text style={styles.processingTitle}>Traitement en cours...</Text>
                    <Text style={styles.processingFile}>{fileName}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── ÉTAPE 3 — Traitement terminé ──
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.centerContent}>

                {/* Icône succès */}
                <Ionicons name="checkmark-circle" size={80} color="#4caf50" />

                <Text style={styles.successTitle}>Traitement terminé ✅</Text>
                <Text style={styles.successFile}>{fileName}</Text>

                {/* Bouton télécharger le résultat */}
                <Pressable style={styles.downloadButton} onPress={downloadResult}>
                    <Ionicons name="download-outline" size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>Télécharger le fichier</Text>
                </Pressable>

                {/* Bouton nouveau traitement */}
                <Pressable style={styles.resetButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                    <Text style={styles.resetButtonText}>Nouveau traitement</Text>
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
        marginBottom: 20,
    },

    groupTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888888',
        marginBottom: 12,
        marginTop: 8,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },

    serviceCard: {
        width: '30%',
        backgroundColor: '#1a1a1a',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#222222',
    },

    serviceCardPressed: {
        backgroundColor: '#222222',
        borderColor: '#4a9eff',
    },

    serviceLabel: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },

    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
    },

    processingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    processingFile: {
        fontSize: 13,
        color: '#666666',
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

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4a9eff',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
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
    },

    resetButtonText: {
        color: '#aaaaaa',
        fontSize: 14,
    },

});
