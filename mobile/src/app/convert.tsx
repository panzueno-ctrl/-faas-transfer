/**
 * app/convert.tsx
 *
 * Écran de conversion et traitement de fichiers avec interface "SmallPDF" : Intro -> Staging -> Processing -> Done.
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
    Platform,
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

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

const FILE_TOOLS = [
    { id: 'merge-pdf', category: 'Outils PDF Essentiels', label: 'Fusionner PDF', description: 'Combinez plusieurs fichiers PDF dans l\'ordre de votre choix.', icon: 'git-merge-outline', endpoint: '/convert/merge-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'split-pdf', category: 'Outils PDF Essentiels', label: 'Diviser PDF', description: 'Séparez une ou plusieurs pages d\'un PDF.', icon: 'cut-outline', endpoint: '/convert/split-pdf', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'compress-pdf', category: 'Outils PDF Essentiels', label: 'Compresser PDF', description: 'Réduisez le poids de votre PDF sans perte de qualité.', icon: 'contract-outline', endpoint: '/convert/compress-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'edit-pdf', category: 'Outils PDF Essentiels', label: 'Modifier PDF', description: 'Ajoutez du texte, des formes ou des images à votre PDF.', icon: 'create-outline', endpoint: '/convert/edit-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'sign-pdf', category: 'Outils PDF Essentiels', label: 'Signer PDF', description: 'Ajoutez une signature électronique à vos documents.', icon: 'pencil-outline', endpoint: '/convert/sign-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'watermark-pdf', category: 'Outils PDF Essentiels', label: 'Filigrane', description: 'Ajoutez un filigrane de sécurité à votre document.', icon: 'water-outline', endpoint: '/convert/watermark-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'rotate-pdf', category: 'Outils PDF Essentiels', label: 'Faire pivoter', description: 'Faites pivoter vos pages PDF selon vos besoins.', icon: 'refresh-outline', endpoint: '/convert/rotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'organize-pdf', category: 'Outils PDF Essentiels', label: 'Organiser PDF', description: 'Triez, ajoutez et supprimez des pages.', icon: 'layers-outline', endpoint: '/convert/organize-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'protect-pdf', category: 'Outils PDF Essentiels', label: 'Protéger PDF', description: 'Ajoutez un mot de passe pour sécuriser votre PDF.', icon: 'lock-closed-outline', endpoint: '/convert/protect-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'unlock-pdf', category: 'Outils PDF Essentiels', label: 'Déverrouiller', description: 'Retirez le mot de passe d\'un fichier PDF.', icon: 'lock-open-outline', endpoint: '/convert/unlock-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'number-pdf', category: 'Outils PDF Essentiels', label: 'Numéros pages', description: 'Insérez des numéros de page dans votre document.', icon: 'list-outline', endpoint: '/convert/number-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'crop-pdf', category: 'Outils PDF Essentiels', label: 'Rogner PDF', description: 'Ajustez les marges ou coupez des zones.', icon: 'crop-outline', endpoint: '/convert/crop-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'flatten-pdf', category: 'Outils PDF Essentiels', label: 'Aplatir PDF', description: 'Rendez vos formulaires et annotations non modifiables.', icon: 'copy-outline', endpoint: '/convert/flatten-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'repair-pdf', category: 'Outils PDF Essentiels', label: 'Réparer PDF', description: 'Restaurez les données d\'un fichier PDF corrompu.', icon: 'build-outline', endpoint: '/convert/repair-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'censor-pdf', category: 'Outils PDF Essentiels', label: 'Censure PDF', description: 'Masquez des informations confidentielles.', icon: 'eye-off-outline', endpoint: '/convert/censor-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'annotate-pdf', category: 'Outils PDF Essentiels', label: 'Annoter PDF', description: 'Surlignez et annotez le contenu de vos PDF.', icon: 'brush-outline', endpoint: '/convert/annotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'pdfa-pdf', category: 'Outils PDF Essentiels', label: 'PDF en PDF/A', description: 'Convertissez en PDF/A pour l\'archivage à long terme.', icon: 'archive-outline', endpoint: '/convert/pdf-to-pdfa', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'ocr-pdf', category: 'Outils PDF Essentiels', label: 'OCR PDF', description: 'Rendez le texte de vos PDF scannés sélectionnable.', icon: 'scan-outline', endpoint: '/convert/ocr-pdf', mimeTypes: ['application/pdf'], outputExt: 'txt' },
    { id: 'compare-pdf', category: 'Outils PDF Essentiels', label: 'Comparer PDF', description: 'Analysez les différences entre deux documents.', icon: 'git-compare-outline', endpoint: '/convert/compare-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },

    { id: 'word-to-pdf', category: 'Convertir vers PDF', label: 'Word → PDF', description: 'Convertissez vos documents DOCX en PDF parfait.', icon: 'document-text-outline', endpoint: '/convert/word-to-pdf', mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], outputExt: 'pdf' },
    { id: 'pptx-to-pdf', category: 'Convertir vers PDF', label: 'PPTX → PDF', description: 'Transformez vos présentations en PDF.', icon: 'easel-outline', endpoint: '/convert/pptx-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], outputExt: 'pdf' },
    { id: 'excel-to-pdf', category: 'Convertir vers PDF', label: 'Excel → PDF', description: 'Convertissez vos feuilles de calcul en PDF.', icon: 'grid-outline', endpoint: '/convert/excel-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], outputExt: 'pdf' },
    { id: 'image-to-pdf', category: 'Convertir vers PDF', label: 'JPG → PDF', description: 'Transformez vos photos et images en document PDF.', icon: 'images-outline', endpoint: '/convert/image-to-pdf', mimeTypes: ['image/*'], outputExt: 'pdf', multiple: true },
    { id: 'html-to-pdf', category: 'Convertir vers PDF', label: 'HTML → PDF', description: 'Convertissez des pages web en fichiers PDF.', icon: 'globe-outline', endpoint: '/convert/html-to-pdf', mimeTypes: ['text/html'], outputExt: 'pdf' },
    { id: 'pages-to-pdf', category: 'Convertir vers PDF', label: 'Pages → PDF', description: 'Convertissez les documents Apple Pages.', icon: 'document-text-outline', endpoint: '/convert/pages-to-pdf', mimeTypes: ['application/vnd.apple.pages'], outputExt: 'pdf' },
    { id: 'keynote-to-pdf', category: 'Convertir vers PDF', label: 'Keynote → PDF', description: 'Convertissez les présentations Apple Keynote.', icon: 'easel-outline', endpoint: '/convert/keynote-to-pdf', mimeTypes: ['application/vnd.apple.keynote'], outputExt: 'pdf' },
    { id: 'numbers-to-pdf', category: 'Convertir vers PDF', label: 'Numbers → PDF', description: 'Convertissez les tableaux Apple Numbers.', icon: 'grid-outline', endpoint: '/convert/numbers-to-pdf', mimeTypes: ['application/vnd.apple.numbers'], outputExt: 'pdf' },
    { id: 'txt-to-pdf', category: 'Convertir vers PDF', label: 'TXT → PDF', description: 'Convertissez de simples fichiers texte.', icon: 'document-text-outline', endpoint: '/convert/txt-to-pdf', mimeTypes: ['text/plain'], outputExt: 'pdf' },

    { id: 'pdf-to-word', category: 'Convertir depuis PDF', label: 'PDF → Word', description: 'Rendez vos PDF éditables sur Microsoft Word.', icon: 'document-outline', endpoint: '/convert/pdf-to-word', mimeTypes: ['application/pdf'], outputExt: 'docx' },
    { id: 'pdf-to-pptx', category: 'Convertir depuis PDF', label: 'PDF → PPTX', description: 'Générez des diapositives à partir de vos PDF.', icon: 'easel-outline', endpoint: '/convert/pdf-to-pptx', mimeTypes: ['application/pdf'], outputExt: 'pptx' },
    { id: 'pdf-to-excel', category: 'Convertir depuis PDF', label: 'PDF → Excel', description: 'Extrayez les données de vos PDF vers Excel.', icon: 'grid-outline', endpoint: '/convert/pdf-to-excel', mimeTypes: ['application/pdf'], outputExt: 'xlsx' },
    { id: 'pdf-to-image', category: 'Convertir depuis PDF', label: 'PDF → JPG', description: 'Convertissez chaque page en image de haute qualité.', icon: 'image-outline', endpoint: '/convert/pdf-to-image', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'pdf-to-txt', category: 'Convertir depuis PDF', label: 'PDF → TXT', description: 'Extrayez tout le texte brut d\'un PDF.', icon: 'document-text-outline', endpoint: '/convert/pdf-to-txt', mimeTypes: ['application/pdf'], outputExt: 'txt' },

    { id: 'heic-to-jpg', category: 'Outils d\'Images', label: 'HEIC → JPG', description: 'Convertissez les photos d\'iPhone au format JPG.', icon: 'logo-apple', endpoint: '/convert/heic-to-jpg', mimeTypes: ['image/heic', 'image/heif'], outputExt: 'jpg' },
    { id: 'jpg-to-png', category: 'Outils d\'Images', label: 'JPG → PNG', description: 'Passez d\'une image compressée à un format PNG.', icon: 'image-outline', endpoint: '/convert/jpg-to-png', mimeTypes: ['image/jpeg'], outputExt: 'png' },
    { id: 'png-to-jpg', category: 'Outils d\'Images', label: 'PNG → JPG', description: 'Réduisez le poids de vos PNG avec le JPG.', icon: 'image-outline', endpoint: '/convert/png-to-jpg', mimeTypes: ['image/png'], outputExt: 'jpg' },
    { id: 'compress-image', category: 'Outils d\'Images', label: 'Compresser Image', description: 'Optimisez vos images pour réduire leur poids.', icon: 'contract-outline', endpoint: '/convert/compress-image', mimeTypes: ['image/*'], outputExt: 'jpg' },
];

const MEDIA_TOOLS = [
    { id: 'mp4-to-mp3', category: 'Outils Vidéo', label: 'Vidéo → Audio', description: 'Extrayez le son (MP3) de n\'importe quelle vidéo.', icon: 'musical-notes-outline', endpoint: '/convert/mp4-to-mp3', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'mp3' },
    { id: 'mp4-to-gif', category: 'Outils Vidéo', label: 'Vidéo → GIF', description: 'Créez une image animée GIF à partir d\'une vidéo.', icon: 'images-outline', endpoint: '/convert/mp4-to-gif', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'gif' },
    { id: 'compress-video', category: 'Outils Vidéo', label: 'Compresser Vidéo', description: 'Réduisez la taille de vos vidéos très lourdes.', icon: 'contract-outline', endpoint: '/convert/compress-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'trim-video', category: 'Outils Vidéo', label: 'Couper Vidéo', description: 'Conservez uniquement le meilleur passage.', icon: 'cut-outline', endpoint: '/convert/trim-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    
    { id: 'compress-audio', category: 'Outils Audio', label: 'Compresser Audio', description: 'Diminuez la taille d\'un fichier son.', icon: 'contract-outline', endpoint: '/convert/compress-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'trim-audio', category: 'Outils Audio', label: 'Couper Audio', description: 'Découpez vos musiques et mémos vocaux.', icon: 'cut-outline', endpoint: '/convert/trim-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'merge-audio', category: 'Outils Audio', label: 'Fusionner Audios', description: 'Rassemblez plusieurs pistes audio en une seule.', icon: 'git-merge-outline', endpoint: '/convert/merge-audio', mimeTypes: ['audio/*'], outputExt: 'mp3', multiple: true },
    { id: 'wav-to-mp3', category: 'Outils Audio', label: 'WAV → MP3', description: 'Passez du format sans perte au format léger MP3.', icon: 'musical-notes-outline', endpoint: '/convert/wav-to-mp3', mimeTypes: ['audio/wav', 'audio/x-wav'], outputExt: 'mp3' },
    { id: 'mp3-to-wav', category: 'Outils Audio', label: 'MP3 → WAV', description: 'Convertissez vos musiques vers un format WAV.', icon: 'musical-note-outline', endpoint: '/convert/mp3-to-wav', mimeTypes: ['audio/mpeg'], outputExt: 'wav' },
];

export default function ConvertScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    // Ajout de l'état "tool_intro"
    const [step, setStep] = useState<'menu' | 'tool_intro' | 'staging' | 'processing' | 'done'>('menu');
    const [activeTab, setActiveTab] = useState<'files' | 'media'>('files');
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const onDragStart = (e: any, index: number) => {
        setDraggedIndex(index);
        const dataTransfer = e.dataTransfer || (e.nativeEvent && e.nativeEvent.dataTransfer);
        if (dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', index.toString());
        }
    };

    const onDragOver = (e: any) => {
        e.preventDefault();
        const dataTransfer = e.dataTransfer || (e.nativeEvent && e.nativeEvent.dataTransfer);
        if (dataTransfer) {
            dataTransfer.dropEffect = 'move';
        }
    };

    const onDrop = (e: any, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            const draggedFile = newFiles[draggedIndex];
            newFiles.splice(draggedIndex, 1);
            newFiles.splice(index, 0, draggedFile);
            return newFiles;
        });
        setDraggedIndex(null);
    };

    const onDragEnd = () => {
        setDraggedIndex(null);
    };
    
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

    // 1. L'utilisateur clique sur une carte d'outil
    const handleServicePress = (service: any) => {
        setSelectedService(service);
        setStep('tool_intro');
    };

    // 2. L'utilisateur clique sur "Choisir les fichiers" depuis l'intro ou "Ajouter" depuis le staging
    const handleSelectFiles = async (append: boolean = false) => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: selectedService.mimeTypes,
                copyToCacheDirectory: true,
                multiple: selectedService.multiple || false,
            });

            if (res.canceled) return;
            
            if (append) {
                setSelectedFiles(prev => [...prev, ...res.assets]);
            } else {
                setSelectedFiles(res.assets);
                setStep('staging');
            }
        } catch (error) {
            Alert.alert(t('common.error'), "Impossible d'ajouter les fichiers.");
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };



    // 3. L'utilisateur lance le traitement depuis le staging
    const processFiles = async () => {
        if (selectedFiles.length === 0) return;
        
        setStep('processing');
        
        // Nom sympa pour le fichier de sortie
        let baseName = selectedFiles[0].name.split('.').slice(0, -1).join('.');
        if (selectedFiles.length > 1 && selectedService.id === 'merge-pdf') {
            baseName = 'document_fusionne';
        } else {
            baseName += '_converti';
        }
        setFileName(baseName);

        try {
            const formData = new FormData();
            
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                let blob;
                if (Platform.OS === 'web' && file.file) {
                    blob = file.file;
                } else {
                    const response_file = await fetch(file.uri);
                    blob = await response_file.blob();
                }
                
                // Si le service supporte le multi-fichier, la route attend 'files'
                // Sinon on envoie 'file' (et on se limite au premier fichier dans ce cas)
                const fieldName = selectedService.multiple ? 'files' : 'file';
                formData.append(fieldName, blob, file.name);
                
                if (!selectedService.multiple) break; 
            }

            if (selectedService.id === 'rotate-pdf') {
                formData.append('rotation', '90');
            }
            if (selectedService.id === 'watermark-pdf') {
                formData.append('text', 'CONFIDENTIEL');
            }
            if (selectedService.id === 'protect-pdf') {
                formData.append('password', 'faas2024');
            }

            const response = await fetch(`${SERVER_URL}${selectedService.endpoint}`, {
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
                'Le traitement a échoué. Vérifiez vos fichiers et réessayez.'
            );
            setStep('staging'); // On retourne sur l'écran de staging en cas d'erreur
        }
    };

    const downloadResult = () => {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `${fileName}.${selectedService.outputExt}`;
        a.click();
    };

    const reset = () => {
        setStep('menu');
        setSelectedService(null);
        setSelectedFiles([]);
        setFileName('');
        setResultUrl('');
    };


    // -------------------------------------------------------------------------
    // RENDER MENU
    // -------------------------------------------------------------------------
    if (step === 'menu') {
        const toolsToDisplay = activeTab === 'files' ? FILE_TOOLS : MEDIA_TOOLS;
        const filteredTools = toolsToDisplay.filter(c => 
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Group tools by category
        const groupedTools = filteredTools.reduce((acc, tool) => {
            const cat = tool.category || 'Autres';
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(tool);
            return acc;
        }, {} as Record<string, typeof FILE_TOOLS>);

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
                            <Text style={styles.title}>Outils de Conversion</Text>
                            <Text style={styles.subtitle}>Sélectionnez l'outil dont vous avez besoin</Text>
                            
                            <View style={styles.searchContainer}>
                                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Chercher un outil (ex: pdf, mp3, fusion...)"
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

                            <View style={styles.tabsContainer}>
                                <Pressable 
                                    style={[styles.tabButton, activeTab === 'files' && styles.activeTabButton]}
                                    onPress={() => setActiveTab('files')}>
                                    <Ionicons name="document-text-outline" size={16} color={activeTab === 'files' ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                                    <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>Manipulation Fichiers</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.tabButton, activeTab === 'media' && styles.activeTabButton]}
                                    onPress={() => setActiveTab('media')}>
                                    <Ionicons name="musical-notes-outline" size={16} color={activeTab === 'media' ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                                    <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Vidéo & Audio</Text>
                                </Pressable>
                            </View>
                        </View>

                        {Object.entries(groupedTools).length > 0 && (
                            <View style={{ width: '100%', maxWidth: 1000, alignItems: 'center' }}>
                                {Object.entries(groupedTools).map(([category, tools]) => (
                                    <View key={category} style={{ width: '100%', marginBottom: 40 }}>
                                        <Text style={styles.groupTitle}>{category}</Text>
                                        <View style={styles.grid}>
                                            {tools.map((service) => (
                                                <ActionCard
                                                    key={service.id}
                                                    title={service.label}
                                                    description={service.description}
                                                    icon={service.icon as any}
                                                    onPress={() => handleServicePress(service)}
                                                    style={styles.serviceCard}
                                                    compact={false}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                        
                        {Object.entries(groupedTools).length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                                <Text style={[styles.subtitle, { marginTop: 16 }]}>Aucun outil trouvé</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------------
    // RENDER TOOL INTRO
    // -------------------------------------------------------------------------
    if (step === 'tool_intro') {
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
                            onPress={reset}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>Retour aux outils</Text>
                        </Pressable>
                    </View>

                    <View style={styles.centerContent}>
                        <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name={selectedService.icon as any} size={50} color={colors.primary} />
                        </View>
                        
                        <Text style={styles.title}>{selectedService.label}</Text>
                        <Text style={[styles.subtitle, { maxWidth: 500, marginBottom: 40, fontSize: 18, lineHeight: 28 }]}>
                            {selectedService.description}
                        </Text>

                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.hugePrimaryButton,
                                (pressed || hovered) && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                            ]} 
                            onPress={() => handleSelectFiles(false)}>
                            <Ionicons name="add-circle-outline" size={28} color="#ffffff" />
                            <Text style={styles.hugePrimaryButtonText}>Choisir les fichiers</Text>
                        </Pressable>
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 16 }}>
                            Tous vos fichiers sont supprimés de nos serveurs après 1 heure.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
    
    // -------------------------------------------------------------------------
    // RENDER STAGING (L'ESPACE AJOUTER/TERMINER DE LA VIDÉO)
    // -------------------------------------------------------------------------
    if (step === 'staging') {
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
                            onPress={reset}>
                            <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.backButtonText}>Annuler</Text>
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingTop: 100 }]}>
                        <View style={{ alignItems: 'center', marginBottom: 40 }}>
                            <Text style={styles.title}>{selectedService.label}</Text>
                        </View>

                        <View style={{ width: '100%', maxWidth: 900, flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 40 }}>
                            {selectedFiles.map((file, index) => (
                                <View 
                                    key={`${file.name}-${index}`}
                                    {...(Platform.OS === 'web' ? {
                                        draggable: true,
                                        onDragStart: (e: any) => onDragStart(e, index),
                                        onDragOver: onDragOver,
                                        onDrop: (e: any) => onDrop(e, index),
                                        onDragEnd: onDragEnd
                                    } : {})}
                                    style={[{ 
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: colors.card, 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: draggedIndex === index ? colors.primary : colors.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        position: 'relative',
                                        opacity: draggedIndex === index ? 0.5 : 1,
                                        cursor: 'grab' as any
                                    }]}
                                >
                                    <Pressable 
                                        onPress={() => handleRemoveFile(index)} 
                                        style={({ hovered }) => [{ position: 'absolute', top: 8, right: 8, padding: 8, borderRadius: 20, zIndex: 10 }, hovered && { backgroundColor: 'rgba(255,68,68,0.1)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    </Pressable>

                                    <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="document-text-outline" size={32} color={colors.text} />
                                    </View>
                                    
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 }} numberOfLines={2}>
                                        {file.name}
                                    </Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Inconnu'}
                                    </Text>
                                </View>
                            ))}
                            
                            {selectedService.multiple && (
                                <Pressable 
                                    style={({ hovered }) => [{ 
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: hovered ? colors.cardHovered : 'transparent', 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: colors.border,
                                        borderStyle: 'dashed' as any,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        cursor: 'pointer' as any
                                    }]}
                                    onPress={() => handleSelectFiles(true)}
                                >
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="add-outline" size={32} color={colors.text} />
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>Ajouter un fichier</Text>
                                </Pressable>
                            )}

                            {selectedFiles.length === 0 && !selectedService.multiple && (
                                <Text style={[styles.subtitle, { padding: 20 }]}>Aucun fichier sélectionné.</Text>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16, width: '100%', maxWidth: 400 }}>
                            <Pressable 
                                style={[styles.primaryButton, selectedFiles.length === 0 && { opacity: 0.5 }]} 
                                onPress={processFiles}
                                disabled={selectedFiles.length === 0}
                            >
                                <Ionicons name="checkmark-outline" size={22} color="#ffffff" />
                                <Text style={styles.primaryButtonText}>Terminer</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------------
    // RENDER PROCESSING
    // -------------------------------------------------------------------------
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
                    <Text style={styles.processingFile}>{selectedFiles.length > 1 ? `${selectedFiles.length} fichiers en cours...` : fileName}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------------
    // RENDER DONE
    // -------------------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />
            <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                <Text style={styles.successTitle}>{t('convert.done')}</Text>
                <Text style={styles.successFile}>{fileName}.{selectedService.outputExt}</Text>

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
        maxWidth: 1000,
    },

    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        width: '100%',
        maxWidth: 400,
        marginTop: 24,
    },

    searchInput: {
        flex: 1,
        height: '100%',
        color: colors.text,
        fontSize: 15,
        fontFamily: 'Outfit_400Regular',
        marginLeft: 12,
        outlineStyle: 'none',
    },

    tabsContainer: {
        flexDirection: 'row',
        marginTop: 16,
        backgroundColor: colors.glow,
        borderRadius: 12,
        padding: 4,
        width: '100%',
        maxWidth: 400,
    },

    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },

    activeTabButton: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },

    tabText: {
        color: colors.textMuted,
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
    },

    activeTabText: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },

    title: {
        fontSize: 36,
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
        lineHeight: 24,
    },

    groupTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 20,
        alignSelf: 'flex-start',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 10,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        width: '100%',
        justifyContent: 'center',
    },

    serviceCard: {
        width: '100%',
        maxWidth: 380,
    },

    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
        width: '100%',
        maxWidth: 600,
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

    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.cardHovered,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },

    secondaryButtonText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 16,
    },

    primaryButton: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
    },

    primaryButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },

    hugePrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: colors.primary,
        paddingVertical: 24,
        paddingHorizontal: 48,
        borderRadius: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        transitionDuration: '0.2s',
    },

    hugePrimaryButtonText: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 22,
    },
});
