/**
 * app/convert.tsx
 *
 * Écran de conversion et traitement de fichiers avec interface "SmallPDF" : Intro -> Staging -> Processing -> Done.
 */

import { useConvertActions, WatermarkSettings } from '../features/convert/hooks/useConvertActions';
import { shareAsync } from 'expo-sharing';
import ToolSelectionScreen from '../features/convert/ui/ToolSelectionScreen';
import ToolIntroScreen from '../features/convert/ui/ToolIntroScreen';
import { useState, useEffect, useRef } from 'react';
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
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import ActionCard from '../components/ActionCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import PdfThumbnail from '../features/convert/ui/PdfThumbnail';
import CompressionSelector, { CompressionLevel } from '../features/convert/ui/CompressionSelector';
import PasswordProtector from '../features/convert/ui/PasswordProtector';
import WatermarkEditor, { WatermarkSettings } from '../features/convert/ui/WatermarkEditor';
import ProtectEditor from '../features/convert/ui/ProtectEditor';
import SplitEditor from '../features/convert/ui/SplitEditor';
import OrganizeEditor, { OrganizePageItem, OrganizeFileItem } from '../features/convert/ui/OrganizeEditor';
import MergeEditor from '../features/convert/ui/MergeEditor';
import ConversionOptions, { ConversionQuality } from '../features/convert/ui/ConversionOptions';
import NumberingSelector, { NumberingConfig } from '../features/convert/ui/NumberingSelector';
import OcrLanguageSelector, { OcrLanguage } from '../features/convert/ui/OcrLanguageSelector';
import PdfEditor, { PdfEditItem } from '../features/convert/ui/PdfEditor';
import CompressEditor from '../features/convert/ui/CompressEditor';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib/dist/pdf-lib.esm.js';
import JSZip from 'jszip';
import { usePdfEngine, loadPdfJs } from '../features/convert/hooks/usePdfEngine';
import { useConvertApi } from '../features/convert/hooks/useConvertApi';
import ResultScreen from '../features/convert/ui/ResultScreen';
import ProcessingScreen from '../features/convert/ui/ProcessingScreen';

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

import { FILE_TOOLS, MEDIA_TOOLS, ToolConfig } from '../features/convert/constants';

export default function ConvertScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    // Ajout de l'état "tool_intro"
    const [step, setStep] = useState<'menu' | 'tool_intro' | 'staging' | 'split_editor' | 'sign_choice' | 'request_signature' | 'signature_request_done' | 'pdf_editor' | 'watermark_editor' | 'rotation_editor' | 'organize_editor' | 'merge_editor' | 'preparing_editor' | 'processing' | 'done'>('menu');
    const [localError, setLocalError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'files' | 'media'>('files');
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [resultFiles, setResultFiles] = useState<{name: string, url: string}[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const [pageCount, setPageCount] = useState<number>(0);
    const [splitPoints, setSplitPoints] = useState<number[]>([]);
    const [splitInterval, setSplitInterval] = useState<number>(1);
    const [splitTab, setSplitTab] = useState<'split' | 'extract'>('split');
    const [extractedPages, setExtractedPages] = useState<number[]>([]);
    
    // Compression state
    const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('recommended');
    
    // Premium UI states
    const [pdfPassword, setPdfPassword] = useState('');
    const [watermarkConfig, setWatermarkConfig] = useState<WatermarkSettings | null>(null);
    const [conversionQuality, setConversionQuality] = useState<ConversionQuality>('standard');
    const [numberingConfig, setNumberingConfig] = useState<NumberingConfig>({ position: 'bottom-center', format: 'total' });
    const [ocrLang, setOcrLang] = useState<OcrLanguage>('fra');

    // E-signature states
    const [signers, setSigners] = useState<{name: string, email: string}[]>([{ name: '', email: '' }]);
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    
    const [isSplitting, setIsSplitting] = useState(false);
    

    const {
        pdfOriginalBuffer, setPdfOriginalBuffer,
        pdfEditorPages, setPdfEditorPages,
        organizePages, setOrganizePages,
        organizeFiles, setOrganizeFiles,
        pdfDocRef, setPdfDocRef,
        currentRenderSession,
        initPdfEditor, handlePdfEditorComplete, resetEngine
    } = usePdfEngine({ setStep, setResultUrl });
    const {
        initOrganizeEditor,
        handleWatermarkComplete,
        handleRotationComplete,
        handleOrganizeComplete,
        handleMergeComplete,
        handleSplitPDF
    } = useConvertActions({
        setStep: setStep as any,
        setResultUrl,
        pdfOriginalBuffer,
        organizeFiles,
        setOrganizeFiles,
        organizePages,
        setOrganizePages,
        pdfDocRef,
        setPdfDocRef,
        selectedFiles,
        setSelectedFiles,
        setFileName,
        splitTab,
        splitPoints,
        splitInterval
    });


    const { apiProcessingTime: apiProcessingTime, processFiles } = useConvertApi({
        setStep, setResultUrl, setLocalError, t, selectedService, selectedFiles, options: { pdfPassword, compressionLevel, numberingConfig, ocrLang, conversionQuality }
    });

    const cancelTool = (targetStep: string = 'tool_intro') => {
        setStep(targetStep as any);
        setPdfDocRef(null);
        setOrganizePages([]);
        setOrganizeFiles([]);
        setSelectedFiles([]);
        setExtractedPages([]);
        setSplitPoints([]);
        setSplitTab('split');
        setSplitInterval(1);
        setResultFiles([]);
        setLocalError(null);
        currentRenderSession.current += 1;
    };

    // initSplitPDF removed in favor of initOrganizeEditor

    const handleAddFilesToOrganize = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: false,
                multiple: true
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                setSelectedFiles(prev => [...prev, ...res.assets]);
                await initOrganizeEditor(res.assets, true);
            }
        } catch (e) {
            console.error("Error picking additional files", e);
        }
    };

    const onDragStart = (e: any, index: number) => {
        setDraggedIndex(index);
        const dataTransfer = e.dataTransfer || (e.nativeEvent && e.nativeEvent.dataTransfer);
        if (dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('text/plain', index.toString());
        }
    };

    const onDragOver = (e: any, index: number) => {
        e.preventDefault();
        const dataTransfer = e.dataTransfer || (e.nativeEvent && e.nativeEvent.dataTransfer);
        if (dataTransfer) {
            dataTransfer.dropEffect = 'move';
        }
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const onDragLeave = (e: any, index: number) => {
        if (dragOverIndex === index) {
            setDragOverIndex(null);
        }
    };

    const onDrop = (e: any, index: number) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (draggedIndex === null || draggedIndex === index) return;
        
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            const draggedFile = newFiles[draggedIndex];
            const targetFile = newFiles[index];
            newFiles[index] = draggedFile;
            newFiles[draggedIndex] = targetFile;
            return newFiles;
        });
        setDraggedIndex(null);
    };

    const onDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleServicePress = (service: any) => {
        setSelectedService(service);
        setSigners([{ name: '', email: '' }]);
        setStep('tool_intro');
    };

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
                if (selectedService.id === 'split-pdf') {
                    initOrganizeEditor(res.assets, false, 'split_editor');
                    setSplitPoints([]);
                } else if (selectedService.id === 'sign-pdf') {
                    setStep('sign_choice');
                } else if (selectedService.id === 'edit-pdf') {
                    initPdfEditor(res.assets[0]);
                } else if (selectedService.id === 'watermark-pdf') {
                    initPdfEditor(res.assets[0], 'watermark_editor');
                } else if (selectedService.id === 'rotate-pdf') {
                    initPdfEditor(res.assets[0], 'rotation_editor');
                } else if (selectedService.id === 'protect-pdf') {
                    initPdfEditor(res.assets[0], 'protect_editor');
                } else if (selectedService.id === 'compress-pdf') {
                    initPdfEditor(res.assets[0], 'compress_editor');
                } else if (selectedService.id === 'organize-pdf') {
                    initOrganizeEditor(res.assets, false, 'organize_editor');
                } else if (selectedService.id === 'merge-pdf') {
                    initOrganizeEditor(res.assets, false, 'merge_editor');
                } else {
                    setStep('staging');
                }
            }
        } catch (error) {
            Alert.alert(t('common.error'), "Impossible d'ajouter les fichiers.");
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const downloadResult = async () => {
        if (Platform.OS === 'web') {
            const a = document.createElement('a');
            a.href = resultUrl;
            const ext = (selectedService?.id === 'split-pdf' && splitTab === 'extract') ? 'pdf' : (selectedService?.outputExt || 'zip');
            a.download = `${fileName}.${ext}`;
            a.click();
            URL.revokeObjectURL(resultUrl);
        } else {
            if (await shareAsync) {
                await shareAsync(resultUrl);
            }
        }
    };

    const goBackToMenu = () => {
        cancelTool('tool_intro');
    };

    const reset = () => {
        setStep('menu');
        setSelectedService(null);
        setSelectedFiles([]);
        setFileName('');
        setResultUrl('');
        setResultFiles([]);
        setSigners([{ name: '', email: '' }]);
        cancelTool('menu');
    };

    const handleSendSignatureRequest = async () => {
        // Validate signers
        const validSigners = signers.filter(s => s.name.trim() !== '' && s.email.trim() !== '');
        if (validSigners.length === 0) {
            if (Platform.OS === 'web') window.alert("Veuillez ajouter au moins un signataire valide.");
            else Alert.alert("Erreur", "Veuillez ajouter au moins un signataire valide.");
            return;
        }

        setIsSendingRequest(true);
        setLocalError('');

        try {
            const formData = new FormData();
            
            let blob;
            if (Platform.OS === 'web' && selectedFiles[0].file) {
                blob = selectedFiles[0].file;
            } else {
                const response = await fetch(selectedFiles[0].uri);
                blob = await response.blob();
            }

            formData.append('file', blob, selectedFiles[0].name || 'document.pdf');
            formData.append('signers', JSON.stringify(validSigners));

            const res = await fetch(`${SERVER_URL}/signature/send-requests`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erreur lors de l'envoi");
            }

            // Success
            setStep('signature_request_done');

        } catch (error: any) {
            console.error(error);
            setLocalError(error.message || "Une erreur s'est produite.");
        } finally {
            setIsSendingRequest(false);
        }
    };

    if (step === 'menu') {
        const toolsToDisplay = activeTab === 'files' ? FILE_TOOLS : MEDIA_TOOLS;
        const filteredTools = toolsToDisplay.filter(c => 
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const groupedTools = filteredTools.reduce((acc, tool) => {
            const cat = tool.category || 'Autres';
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(tool);
            return acc;
        }, {} as Record<string, typeof FILE_TOOLS>);

        return (
            <ToolSelectionScreen
                styles={styles}
                colors={colors}
                t={t}
                router={router}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                groupedTools={groupedTools}
                handleServicePress={handleServicePress}
            />
        );
    }

    if (step === 'tool_intro') {
        return (
            <ToolIntroScreen
                styles={styles}
                colors={colors}
                t={t}
                selectedService={selectedService}
                handleSelectFiles={() => handleSelectFiles(false)}
                cancelTool={cancelTool}
            />
        );
    }

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
                            {selectedFiles.length > 1 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                                    <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                                        Maintenez et glissez un fichier pour modifier l'ordre
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ width: '100%', maxWidth: 900, flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 40 }}>
                            {selectedFiles.map((file, index) => {
                                const isDragged = draggedIndex === index;
                                const isDragOver = dragOverIndex === index;
                                
                                return Platform.OS === 'web' ? (
                                <div 
                                    key={`${file.name}-${index}`}
                                    draggable={true}
                                    onDragStart={(e: any) => onDragStart(e, index)}
                                    onDragOver={(e: any) => onDragOver(e, index)}
                                    onDragLeave={(e: any) => onDragLeave(e, index)}
                                    onDrop={(e: any) => onDrop(e, index)}
                                    onDragEnd={onDragEnd}
                                    style={{
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: isDragOver ? 'rgba(255,255,255,0.1)' : colors.card, 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: isDragOver ? colors.success : (isDragged ? colors.primary : colors.border),
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        position: 'relative',
                                        opacity: isDragged ? 0.5 : 1,
                                        cursor: 'grab',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <View style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                                    </View>

                                    <Pressable 
                                        onPress={() => handleRemoveFile(index)} 
                                        style={({ hovered }) => [{ position: 'absolute', top: 8, right: 8, padding: 8, borderRadius: 20, zIndex: 10 }, hovered && { backgroundColor: 'rgba(255,68,68,0.1)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    </Pressable>

                                    <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="document-text-outline" size={32} color={colors.text} />
                                    </View>
                                    
                                    <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4, width: '100%' }}>
                                        {file.name}
                                    </Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Inconnu'}
                                    </Text>
                                </div>
                                ) : (
                                <View 
                                    key={`${file.name}-${index}`}
                                    style={[{ 
                                        width: 160, 
                                        height: 200, 
                                        backgroundColor: colors.card, 
                                        borderRadius: 16, 
                                        borderWidth: 2, 
                                        borderColor: colors.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        position: 'relative'
                                    }]}
                                >
                                    <View style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{index + 1}</Text>
                                    </View>

                                    <Pressable 
                                        onPress={() => handleRemoveFile(index)} 
                                        style={({ hovered }) => [{ position: 'absolute', top: 8, right: 8, padding: 8, borderRadius: 20, zIndex: 10 }, hovered && { backgroundColor: 'rgba(255,68,68,0.1)' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    </Pressable>

                                    <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name="document-text-outline" size={32} color={colors.text} />
                                    </View>
                                    
                                    <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4, width: '100%' }}>
                                        {file.name}
                                    </Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Inconnu'}
                                    </Text>
                                </View>
                                );
                            })}
                        </View>

                        {/* protect-pdf configurator has been moved to ProtectEditor */}
                        {/* compress-pdf configurator has been moved to CompressEditor */}
                        {/* watermark-pdf configurator has been moved to WatermarkEditor */}
                        {/* split-pdf configurator has been moved to SplitEditor */}

                        {selectedService.id === 'number-pdf' && (
                            <NumberingSelector onChange={setNumberingConfig} />
                        )}

                        {selectedService.id === 'ocr-pdf' && (
                            <OcrLanguageSelector onChange={setOcrLang} />
                        )}

                        {(selectedService.id === 'pdf-to-image' || selectedService.id === 'image-to-pdf') && (
                            <ConversionOptions 
                                type={selectedService.id} 
                                onChange={setConversionQuality} 
                            />
                        )}

                        <View style={{ flexDirection: 'row', gap: 16, width: '100%', maxWidth: 400 }}>
                            <Pressable 
                                style={[styles.primaryButton, selectedFiles.length === 0 && { opacity: 0.5 }]} 
                                onPress={() => processFiles()}
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

    if (step === 'preparing_editor') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.processingTitle}>Préparation de l'éditeur...</Text>
                    <Text style={styles.processingFile}>Veuillez patienter pendant la génération des aperçus.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (step === 'request_signature') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={styles.header}>
                    <Pressable 
                        style={styles.backButton}
                        onPress={() => setStep('sign_choice')}
                    >
                        <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Demande de signatures</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
                    <View style={{ backgroundColor: colors.card, padding: 30, borderRadius: 24, borderWidth: 1, borderColor: colors.border, width: '100%', maxWidth: 600 }}>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, padding: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 12 }}>
                            <Ionicons name="document-text-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{fileName}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{selectedFiles.length > 0 ? (selectedFiles[0].size / 1024 / 1024).toFixed(2) : 0} Mo</Text>
                            </View>
                        </View>

                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Destinataires</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 24 }}>Ajoutez les personnes qui doivent signer ce document. Elles recevront un e-mail avec un lien unique.</Text>

                        {localError ? (
                            <View style={{ backgroundColor: colors.danger + '20', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                                <Text style={{ color: colors.danger }}>{localError}</Text>
                            </View>
                        ) : null}

                        {signers.map((signer, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                                <TextInput
                                    style={{ flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text }}
                                    placeholder="Nom complet"
                                    placeholderTextColor={colors.textMuted}
                                    value={signer.name}
                                    onChangeText={(val) => {
                                        const newSigners = [...signers];
                                        newSigners[index].name = val;
                                        setSigners(newSigners);
                                    }}
                                />
                                <TextInput
                                    style={{ flex: 1.5, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text }}
                                    placeholder="Adresse e-mail"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={signer.email}
                                    onChangeText={(val) => {
                                        const newSigners = [...signers];
                                        newSigners[index].email = val;
                                        setSigners(newSigners);
                                    }}
                                />
                                {signers.length > 1 && (
                                    <Pressable 
                                        onPress={() => setSigners(signers.filter((_, i) => i !== index))}
                                        style={{ padding: 8 }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    </Pressable>
                                )}
                            </View>
                        ))}

                        <Pressable 
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 32 }}
                            onPress={() => setSigners([...signers, { name: '', email: '' }])}
                        >
                            <Ionicons name="add-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Ajouter un signataire</Text>
                        </Pressable>

                        <Pressable 
                            style={({ pressed }) => [
                                { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
                                pressed && { opacity: 0.8 },
                                isSendingRequest && { opacity: 0.5 }
                            ]}
                            disabled={isSendingRequest}
                            onPress={handleSendSignatureRequest}
                        >
                            {isSendingRequest ? (
                                <ActivityIndicator color="#fff" style={{ marginRight: 12 }} />
                            ) : (
                                <Ionicons name="send-outline" size={20} color="#fff" style={{ marginRight: 12 }} />
                            )}
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                                {isSendingRequest ? "Envoi en cours..." : "Envoyer la demande"}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (step === 'pdf_editor') {
        return (
            <PdfEditor 
                pages={pdfEditorPages} 
                colors={colors}
                onComplete={handlePdfEditorComplete}
                onCancel={() => cancelTool()}
                autoOpenSignTool={selectedService?.id === 'sign-pdf'}
            />
        );
    }

    if (step === 'watermark_editor') {
        return (
            <WatermarkEditor
                pages={pdfEditorPages}
                fileName={selectedFiles[0]?.name || ''}
                onComplete={handleWatermarkComplete}
                onCancel={cancelTool}
                colors={colors}
            />
        );
    }

    if (step === 'compress_editor') {
        return (
            <CompressEditor
                pages={pdfEditorPages}
                fileName={selectedFiles[0]?.name || ''}
                fileSize={selectedFiles[0]?.size || 0}
                initialLevel={compressionLevel}
                onComplete={(level) => {
                    setCompressionLevel(level);
                    processFiles(undefined, undefined, level);
                }}
                onCancel={cancelTool}
                colors={colors}
            />
        );
    }

    if (step === 'protect_editor') {
        return (
            <ProtectEditor 
                pages={pdfEditorPages} 
                fileName={selectedFiles[0]?.name || ''}
                fileSize={selectedFiles[0]?.size || 0}
                colors={colors}
                onComplete={(password) => {
                    setPdfPassword(password);
                    processFiles(password);
                }}
                onCancel={() => cancelTool()}
            />
        );
    }

    if (step === 'rotation_editor') {
        return (
            <RotationEditor 
                pages={pdfEditorPages} 
                colors={colors}
                onComplete={handleRotationComplete}
                onCancel={() => cancelTool()}
            />
        );
    }

    if (step === 'merge_editor') {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {localError && (
                    <View style={{ backgroundColor: '#ef4444', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', flex: 1 }}>{localError}</Text>
                        <Pressable onPress={() => setLocalError(null)} style={{ padding: 8 }}>
                            <Ionicons name="close" size={24} color="white" />
                        </Pressable>
                    </View>
                )}
                <MergeEditor 
                    pages={organizePages}
                    files={organizeFiles.map((f, i) => ({
                        name: f.name,
                        color: f.color,
                        originalIndex: f.originalIndex,
                        pageCount: f.pageCount
                    }))}
                    onComplete={(type, data) => {
                        setLocalError(null);
                        handleMergeComplete(type, data);
                    }}
                    onCancel={() => cancelTool()}
                    onAddFiles={handleAddFilesToOrganize}
                    colors={colors}
                />
            </View>
        );
    }

    if (step === 'organize_editor') {
        return (
            <OrganizeEditor 
                pages={organizePages}
                files={organizeFiles}
                colors={colors}
                onComplete={handleOrganizeComplete}
                onCancel={() => cancelTool()}
                onAddFiles={handleAddFilesToOrganize}
            />
        );
    }

    if (step === 'processing') {
        return (
            <ProcessingScreen
                processingTime={apiProcessingTime}
                selectedFilesCount={selectedFiles.length}
                fileName={fileName}
                colors={colors}
                t={t}
                styles={styles}
            />
        );
    }

    return (
        <ResultScreen
            resultUrl={resultUrl}
            selectedService={selectedService}
            splitTab={splitTab}
            fileName={fileName}
            resultFiles={resultFiles}
            colors={colors}
            t={t}
            styles={styles}
            onDownload={downloadResult}
            onReset={reset}
        />
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
