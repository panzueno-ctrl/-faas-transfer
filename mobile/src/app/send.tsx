/**
 * app/send.tsx
 *
 * Écran d'envoi de fichiers.
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
    Clipboard,
    Platform,
    Share,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ActionCard from '../components/ActionCard';

import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

const withRetry = async (fn: () => Promise<any>, retries = 3) => {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= retries) throw error;
            console.log(`Retry ${attempt}/${retries} failed, retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
};

export default function SendScreen() {
    useKeepAwake();

    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, isDark);

    const [step, setStep] = useState<'category' | 'review' | 'uploading' | 'done'>('category');
    const [lastCategory, setLastCategory] = useState<string>('all');
    const [lastMimeTypes, setLastMimeTypes] = useState<string[]>(['*/*']);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [pendingFiles, setPendingFiles] = useState<any[]>([]);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ id: string; downloadUrl: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [batchStats, setBatchStats] = useState<{ count: number, totalSize: number } | null>(null);
    const [isPicking, setIsPicking] = useState(false);

    useEffect(() => {
        const onBackPress = () => {
            if (step !== 'category') {
                setStep('category');
                setPendingFiles([]);
                setSelectedFile(null);
                setProgress(0);
                setResult(null);
                setCopied(false);
                setIsPreparing(false);
                return true; // prevent default behavior (exit tab)
            }
            return false;
        };

        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [step]);

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return 'Taille inconnue';
        const k = 1024;
        const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

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

    const pickFile = async (categoryId: string, mimeTypes: string[]) => {
        setIsPicking(true);
        setLastCategory(categoryId);
        setLastMimeTypes(mimeTypes);
        try {
            let files: any[] = [];

            if (Platform.OS !== 'web' && (categoryId === 'images' || categoryId === 'video' || categoryId === 'audio')) {
                let mediaTypes: ImagePicker.MediaType = 'images';
                if (categoryId === 'video') mediaTypes = 'videos';
                
                if (categoryId === 'audio') {
                    const res = await DocumentPicker.getDocumentAsync({
                        type: mimeTypes,
                        copyToCacheDirectory: false,
                        multiple: true,
                    });
                    if (res.canceled) {
                        setIsPicking(false);
                        return;
                    }
                    files = res.assets;
                } else {
                    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (permissionResult.granted === false) {
                        Alert.alert("Permission requise", "Vous devez autoriser l'accès à vos photos.");
                        setIsPicking(false);
                        return;
                    }

                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: mediaTypes,
                        allowsMultipleSelection: true,
                        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
                    });

                    if (result.canceled) {
                        setIsPicking(false);
                        return;
                    }
                    
                    files = result.assets.map(asset => ({
                        uri: asset.uri,
                        name: asset.fileName || asset.uri.split('/').pop() || 'media.jpg',
                        mimeType: asset.mimeType || (categoryId === 'video' ? 'video/mp4' : 'image/jpeg'),
                        size: asset.fileSize || 0,
                        file: (asset as any).file
                    }));
                }
            } else {
                const res = await DocumentPicker.getDocumentAsync({
                    type: mimeTypes,
                    copyToCacheDirectory: false,
                    multiple: true,
                });
                if (res.canceled) {
                    setIsPicking(false);
                    return;
                }
                files = res.assets.map(asset => {
                    let finalName = asset.name || (asset.file && (asset.file as any).name) || 'fichier';
                    const mime = asset.mimeType || (asset.file && (asset.file as any).type) || '';
                    if (mime.includes('video/') && !finalName.includes('.')) finalName += '.mp4';
                    else if (mime.includes('image/') && !finalName.includes('.')) finalName += '.jpg';
                    else if (mime.includes('audio/') && !finalName.includes('.')) finalName += '.mp3';
                    
                    return {
                        ...asset,
                        name: finalName,
                        file: (asset as any).file
                    };
                });
            }

            if (!files || files.length === 0) {
                setIsPicking(false);
                return;
            }

            setPendingFiles(prev => [...prev, ...files]);
            setStep('review');
            setIsPicking(false);

        } catch (error) {
            setIsPicking(false);
            if (Platform.OS === 'web') window.alert(t('common.error') + '\nImpossible de sélectionner le(s) fichier(s).');
            else Alert.alert(t('common.error'), 'Impossible de sélectionner le(s) fichier(s).');
        }
    };

    const uploadFileLegacy = async (file: any) => {
        setProgress(0);
        setIsPreparing(false);
        setStep('uploading');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const reqUrlResponse = await fetch(`${SERVER_URL}/upload/request-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.mimeType || 'application/octet-stream',
                    userId: session?.user?.id || null
                })
            });

            if (!reqUrlResponse.ok) {
                throw new Error('Erreur lors de la demande de ticket au serveur');
            }

            const { fileId, storageName, signedUrl } = await reqUrlResponse.json();
            let reqUrlResponseObj = { fileId, storageName };

            await withRetry(() => new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.open('PUT', signedUrl);
                xhr.setRequestHeader('Content-Type', file.mimeType || 'application/octet-stream');
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        setProgress(Math.round((event.loaded / event.total) * 100));
                    }
                };
                
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve(true);
                    else reject(new Error('Erreur upload R2: ' + xhr.status));
                };
                xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'upload (Vérifiez votre connexion)'));
                
                if (Platform.OS === 'web') {
                    // On envoie le fichier brut (File object) via XHR.
                    // XHR gère nativement le streaming depuis le disque sur Android Chrome,
                    // évitant les crash OOM (Uffa!) depuis qu'on utilise DocumentPicker.
                    xhr.send(file.file || file);
                } else {
                    xhr.send({ uri: file.uri, type: file.mimeType, name: file.name } as any);
                }
            }));

            setProgress(100);

            const confirmResponse = await fetch(`${SERVER_URL}/upload/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: reqUrlResponseObj.fileId,
                    originalName: file.name,
                    storageName: reqUrlResponseObj.storageName,
                    userId: session?.user?.id || null
                })
            });

            if (!confirmResponse.ok) {
                throw new Error('Erreur lors de la confirmation serveur');
            }

            const data = await confirmResponse.json();
            setResult(data);

            const transfer = {
                id: data.id,
                fileName: file.name,
                downloadUrl: data.downloadUrl,
                sentAt: new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                status: 'pending',
            };

            const existing = await AsyncStorage.getItem('faas_history');
            const history = existing ? JSON.parse(existing) : [];
            history.unshift(transfer);
            await AsyncStorage.setItem('faas_history', JSON.stringify(history));

            setStep('done');

        } catch (error: any) {
            setIsPreparing(false);
            console.error('Upload Error:', error);
            if (Platform.OS === 'web') window.alert(t('common.error') + '\nLe transfert a échoué: ' + error.message);
            else Alert.alert(t('common.error'), 'Le transfert a échoué: ' + error.message);
            setStep('category');
        }
    };

    const uploadFileV2 = async (file: any) => {
        // La R&D a prouvé de manière définitive que la lecture d'un fichier > 1 Go
        // via File.slice(), File.stream() ou FileReader provoque un "network error"
        // (IPC bridge crash) sur Android Chrome.
        // La seule méthode stable est le streaming natif C++ via xhr.send(File).
        // Nous repassons donc sur l'architecture V1 (Legacy) qui est l'état de l'art mobile.
        return uploadFileLegacy(file);
    };

    const uploadMultipleFiles = async (files: any[]) => {
        setProgress(0);
        setIsPreparing(false);
        setStep('uploading');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const filePayload = files.map(f => ({
                fileName: f.name,
                contentType: f.mimeType || 'application/octet-stream'
            }));

            const reqUrlResponse = await fetch(`${SERVER_URL}/upload/request-urls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filePayload })
            });

            if (!reqUrlResponse.ok) {
                throw new Error('Erreur lors de la demande de tickets au serveur');
            }

            const { batchId, uploadTickets } = await reqUrlResponse.json();

            const progressMap = new Array(files.length).fill(0);
            const totalFiles = files.length;

            const updateGlobalProgress = () => {
                const total = progressMap.reduce((acc, curr) => acc + curr, 0);
                setProgress(Math.round(total / totalFiles));
            };

            const CONCURRENCY_LIMIT = 3;
            let currentIndex = 0;

            const uploadTaskWorker = async () => {
                while (currentIndex < files.length) {
                    const i = currentIndex++;
                    const file = files[i];
                    const ticket = uploadTickets[i];

                    await withRetry(() => new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('PUT', ticket.signedUrl);
                        xhr.setRequestHeader('Content-Type', file.mimeType || 'application/octet-stream');
                        
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                progressMap[i] = (event.loaded / event.total) * 100;
                                updateGlobalProgress();
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                progressMap[i] = 100;
                                updateGlobalProgress();
                                resolve(true);
                            } else reject(new Error('Erreur upload R2: ' + xhr.status));
                        };
                        xhr.onerror = () => reject(new Error('Erreur réseau'));

                        if (Platform.OS === 'web') {
                            if (file.file && file.file.size > 100 * 1024 * 1024) { // > 100 MB
                                let fakeP = 0;
                                const interval = setInterval(() => {
                                    if (fakeP < 90) { fakeP += 2; progressMap[i] = fakeP; updateGlobalProgress(); }
                                }, 1000);
                                let fetchBody = file.file;
                                let fetchOptions: any = {
                                    method: 'PUT', 
                                    body: fetchBody, 
                                    headers: { 'Content-Type': file.mimeType || 'application/octet-stream' }
                                };
                                fetch(ticket.signedUrl, fetchOptions).then(res => {
                                    clearInterval(interval);
                                    if (res.ok) { progressMap[i] = 100; updateGlobalProgress(); resolve(true); }
                                    else reject(new Error('Erreur upload R2'));
                                }).catch(e => { clearInterval(interval); reject(e); });
                                return;
                            }
                            xhr.send(file.file || file);
                        } else {
                            // React Native gère nativement l'envoi depuis une URI content://
                            xhr.send({ uri: file.uri, type: file.mimeType, name: file.name } as any);
                        }
                    }));
                }
            };

            const workers = Array(Math.min(CONCURRENCY_LIMIT, files.length)).fill(null).map(() => uploadTaskWorker());
            await Promise.all(workers);

            setProgress(100);

            // 4. Confirmation finale
            const confirmResponse = await fetch(`${SERVER_URL}/upload/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: batchId,
                    files: uploadTickets.map((t: any) => ({
                        originalName: t.originalName,
                        storageName: t.storageName
                    })),
                    userId: session?.user?.id || null
                })
            });

            if (!confirmResponse.ok) {
                throw new Error('Erreur lors de la confirmation serveur');
            }

            const data = await confirmResponse.json();
            
            // Simulation d'un fichier fictif pour afficher le nom du lot sur l'écran "done"
            setSelectedFile({ name: `Lot de ${files.length} fichiers` });
            setResult(data);

            const transfer = {
                id: data.id,
                fileName: `Lot de ${files.length} fichiers`,
                downloadUrl: data.downloadUrl,
                sentAt: new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                status: 'pending',
            };

            const existing = await AsyncStorage.getItem('faas_history');
            const history = existing ? JSON.parse(existing) : [];
            history.unshift(transfer);
            await AsyncStorage.setItem('faas_history', JSON.stringify(history));

            setStep('done');

        } catch (error: any) {
            setIsPreparing(false);
            console.error('Upload Error:', error);
            if (Platform.OS === 'web') window.alert(t('common.error') + '\nLe transfert a échoué: ' + error.message);
            else Alert.alert(t('common.error'), 'Le transfert a échoué: ' + error.message);
            setStep('category');
        }
    };

    const shareLink = async () => {
        try {
            if (Platform.OS === 'web' && navigator.share) {
                await navigator.share({
                    title: 'FaaS Transfer',
                    text: "Je t'ai envoyé des fichiers via FaaS Transfer. Télécharge-les ici :",
                    url: result?.downloadUrl
                });
            } else {
                await Share.share({
                    message: `Je t'ai envoyé des fichiers via FaaS Transfer. Télécharge-les ici : ${result?.downloadUrl}`,
                });
            }
        } catch (error) {
            console.error('Erreur de partage', error);
        }
    };

    const copyLink = () => {
        Clipboard.setString(result?.downloadUrl || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const reset = () => {
        setStep('category');
        setPendingFiles([]);
        setSelectedFile(null);
        setProgress(0);
        setResult(null);
        setCopied(false);
        setIsPreparing(false);
    };

    if (step === 'category') {
        return (
            <View style={styles.container}>
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
                    
                    <Text style={styles.title}>{t('send.title')}</Text>
                    <Text style={styles.subtitle}>{t('send.subtitle')}</Text>
                    
                    <View style={styles.categoriesGrid}>
                        {CATEGORIES.map((cat) => (
                            <ActionCard
                                key={cat.id}
                                title={cat.label}
                                description="" 
                                icon={cat.icon as any}
                                onPress={() => pickFile(cat.id, cat.mimeTypes)}
                                style={styles.categoryCard} 
                                compact={true} 
                            />
                        ))}
                    </View>
                    
                    {(isPreparing || isPicking) && (
                        <View style={styles.preparingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.preparingText}>
                                {isPicking 
                                    ? 'Traitement en cours...' 
                                    : (batchStats ? `Préparation de ${batchStats.count} fichiers...` : 'Préparation des fichiers...')
                                }
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    if (step === 'review') {
        const totalSize = pendingFiles.reduce((acc, f) => acc + (f.size || f.fileSize || f.file?.size || 0), 0);
        
        const startUploadFlow = async () => {
            if (pendingFiles.length === 0) return;
            setIsPreparing(true);
            
            if (pendingFiles.length === 1) {
                setSelectedFile(pendingFiles[0]);
                setBatchStats(null);
                await uploadFileV2(pendingFiles[0]);
            } else {
                setBatchStats({ count: pendingFiles.length, totalSize });
                setSelectedFile({ name: `Lot de ${pendingFiles.length} fichiers` });
                await uploadMultipleFiles(pendingFiles);
            }
        };

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
                <View style={{ width: '100%', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 40 : 20, zIndex: 20 }}>
                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.backButton,
                            (pressed || hovered) && styles.backButtonHovered
                        ]}
                        onPress={reset}>
                        <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.backButtonText}>Annuler et retour</Text>
                    </Pressable>
                </View>

                <View style={[styles.centerContent, { flex: 1 }]}>
                    <Ionicons name="folder-open-outline" size={64} color={colors.primary} style={{ marginBottom: 20 }} />
                    <Text style={styles.uploadingTitle}>Panier de transfert</Text>
                    <Text style={styles.uploadingFile}>
                        {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''} prêt{pendingFiles.length > 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.subtitle, { marginBottom: 40 }]}>
                        Taille totale : {formatSize(totalSize)}
                    </Text>

                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.primaryButton,
                            (pressed || hovered) && styles.primaryButtonHovered,
                            { width: '100%', marginBottom: 15 },
                            isPicking && { opacity: 0.5 }
                        ]} 
                        disabled={isPicking}
                        onPress={startUploadFlow}>
                        <Text style={styles.primaryButtonText}>Envoyer ({pendingFiles.length})</Text>
                    </Pressable>

                    <Pressable 
                        style={({ pressed, hovered }: any) => [
                            styles.secondaryButton,
                            (pressed || hovered) && styles.secondaryButtonHovered,
                            { width: '100%' },
                            isPicking && { opacity: 0.5 }
                        ]} 
                        disabled={isPicking}
                        onPress={() => pickFile(lastCategory, lastMimeTypes)}>
                        <Text style={styles.secondaryButtonText}>
                            {isPicking ? (
                                <>
                                    <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
                                    Traitement...
                                </>
                            ) : (
                                <>
                                    <Ionicons name="add-circle-outline" size={18} /> Ajouter d'autres fichiers
                                </>
                            )}
                        </Text>
                    </Pressable>
                    
                    <Pressable 
                        style={{ marginTop: 20, padding: 10 }}
                        onPress={reset}>
                        <Text style={[styles.secondaryButtonText, { color: colors.error }]}>Vider le panier</Text>
                    </Pressable>
                </View>
                
                {isPicking && (
                    <View style={styles.fullscreenOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.overlayText}>Traitement en cours...</Text>
                        <Text style={styles.overlaySubText}>Veuillez patienter, cela peut prendre quelques secondes.</Text>
                    </View>
                )}
            </SafeAreaView>
        );
    }

    if (step === 'uploading') {
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (progress / 100) * circumference;

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                <View style={styles.centerContent}>

                    <Text style={styles.uploadingTitle}>{t('send.uploading')}</Text>
                    <Text style={styles.uploadingFile}>
                        {batchStats ? `Lot de ${batchStats.count} fichiers (${formatSize(batchStats.totalSize)})` : selectedFile?.name}
                    </Text>

                    <View style={{ position: 'relative', width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginVertical: 30 }}>
                        <Svg width="140" height="140" viewBox="0 0 140 140">
                            <Circle 
                                cx="70" cy="70" r={radius} 
                                stroke={colors.border} 
                                strokeWidth="8" fill="transparent" 
                            />
                            <Circle 
                                cx="70" cy="70" r={radius} 
                                stroke={colors.primary} 
                                strokeWidth="8" fill="transparent" 
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                rotation="-90"
                                origin="70, 70"
                            />
                        </Svg>
                        <Text style={[styles.progressText, { position: 'absolute' }]}>{progress}%</Text>
                    </View>

                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />

            <ScrollView style={{ flex: 1, zIndex: 10, width: '100%' }} contentContainerStyle={styles.resultContent}>

                <Pressable style={styles.backButton} onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.backButtonText}>{t('send.new_transfer')}</Text>
                </Pressable>

                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                </View>

                <Text style={styles.successTitle}>{t('send.done')}</Text>
                <Text style={styles.successFile}>{selectedFile?.name}</Text>

                <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>{t('send.scan')}</Text>
                    <QRCode
                        value={result?.downloadUrl || ''}
                        size={180}
                        color={isDark ? '#ffffff' : '#0F172A'}
                        backgroundColor={isDark ? '#1a1a1a' : '#ffffff'}
                    />
                </View>

                <View style={styles.linkContainer}>
                    <Text style={styles.linkLabel}>{t('send.link')}</Text>
                    <View style={styles.linkRow}>

                        <View style={styles.linkTextContainer}>
                            <Text style={styles.linkText} numberOfLines={2}>
                                {result?.downloadUrl}
                            </Text>
                        </View>

                        <Pressable style={styles.copyButton} onPress={shareLink}>
                            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                        </Pressable>

                        <Pressable style={styles.copyButton} onPress={copyLink}>
                            <Ionicons name="copy-outline" size={20} color={colors.primary} />
                        </Pressable>

                    </View>
                </View>

                <Text style={styles.shareInstruction}>
                    {t('send.instruction')}
                </Text>

            </ScrollView>

            {copied && (
                <View style={styles.toast}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.toastText}>{t('send.copy')}</Text>
                </View>
            )}

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
        zIndex: 1,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginBottom: 40,
        zIndex: 1,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        maxWidth: 900,
        width: '100%',
        zIndex: 10, 
    },
    categoryCard: {
        width: 260,
    },
    preparingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        borderRadius: 16,
    },
    preparingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        zIndex: 10,
    },
    uploadingTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginTop: 16,
    },
    uploadingFile: {
        fontSize: 15,
        color: colors.textMuted,
        marginBottom: 24,
    },
    progressBar: {
        width: '100%',
        maxWidth: 400,
        height: 8,
        backgroundColor: colors.card,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    progressText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
    },
    resultContent: {
        alignItems: 'center',
        gap: 24,
        paddingBottom: 40,
        paddingTop: 80, 
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        zIndex: 10,
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
        color: colors.text,
        letterSpacing: -0.5,
    },
    successFile: {
        fontSize: 15,
        color: colors.textMuted,
        marginTop: -12,
    },
    qrContainer: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        gap: 20,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
    },
    qrLabel: {
        color: colors.textMuted,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: '600',
    },
    linkContainer: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    linkLabel: {
        fontSize: 11,
        color: colors.textMuted,
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
        color: colors.primary,
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
        color: colors.textSubtle,
        textAlign: 'center',
        lineHeight: 20,
    },
    toast: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    toastText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    primaryButtonHovered: {
        opacity: 0.9,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    secondaryButtonHovered: {
        backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    fullscreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 20,
    },
    overlayText: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    overlaySubText: {
        color: colors.textSubtle,
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
    },
});
