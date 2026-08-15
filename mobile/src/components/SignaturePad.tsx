import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
    Platform,
    TextInput,
    PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SignatureData = 
    | { type: 'image', data: string }
    | { type: 'path', data: string, width: number, height: number }
    | { type: 'text', data: string };

interface SignaturePadProps {
    visible: boolean;
    onClose: () => void;
    onSave: (signature: SignatureData) => void;
    colors: any;
}

const STORAGE_KEY = 'faas_saved_signatures';

export default function SignaturePad({ visible, onClose, onSave, colors }: SignaturePadProps) {
    const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
    
    // Draw state
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    
    // Type state
    const [typedText, setTypedText] = useState('');

    // Saved signatures
    const [savedSignatures, setSavedSignatures] = useState<SignatureData[]>([]);

    useEffect(() => {
        loadSavedSignatures();
    }, []);

    const loadSavedSignatures = async () => {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                setSavedSignatures(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Error loading signatures", e);
        }
    };

    const saveSignatureToStorage = async (sig: SignatureData) => {
        try {
            const newSaved = [sig, ...savedSignatures].slice(0, 5); // Keep last 5
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSaved));
            setSavedSignatures(newSaved);
        } catch (e) {
            console.error("Error saving signature", e);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                const { locationX, locationY } = e.nativeEvent;
                const x = locationX ?? (e.nativeEvent as any).offsetX ?? 0;
                const y = locationY ?? (e.nativeEvent as any).offsetY ?? 0;
                setCurrentPath(`M${x},${y}`);
            },
            onPanResponderMove: (e) => {
                const { locationX, locationY } = e.nativeEvent;
                const x = locationX ?? (e.nativeEvent as any).offsetX ?? 0;
                const y = locationY ?? (e.nativeEvent as any).offsetY ?? 0;
                setCurrentPath(prev => `${prev} L${x},${y}`);
            },
            onPanResponderRelease: () => {
                setPaths(prev => [...prev, currentPath]);
                setCurrentPath('');
            }
        })
    ).current;

    const clearDraw = () => {
        setPaths([]);
        setCurrentPath('');
    };

    const handleUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const base64 = result.assets[0].base64;
                const uri = result.assets[0].uri;
                const imageStr = base64 ? `data:image/jpeg;base64,${base64}` : uri;
                
                const sig: SignatureData = { type: 'image', data: imageStr };
                await saveSignatureToStorage(sig);
                onSave(sig);
                onClose();
            }
        } catch (e) {
            console.error("Image pick error", e);
        }
    };

    const handleSaveDraw = () => {
        if (paths.length === 0 && !currentPath) return;
        const allPaths = [...paths, currentPath].filter(p => p.length > 0).join(' ');
        const sig: SignatureData = { type: 'path', data: allPaths, width: canvasSize.width, height: canvasSize.height };
        saveSignatureToStorage(sig);
        onSave(sig);
        onClose();
        clearDraw();
    };

    const handleSaveType = () => {
        if (!typedText.trim()) return;
        const sig: SignatureData = { type: 'text', data: typedText.trim() };
        saveSignatureToStorage(sig);
        onSave(sig);
        onClose();
        setTypedText('');
    };

    const renderSavedSignatures = () => {
        if (savedSignatures.length === 0) return null;
        return (
            <View style={{ marginTop: 20 }}>
                <Text style={{ color: colors.textMuted, marginBottom: 8, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Signatures Sauvegardées
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {savedSignatures.map((sig, i) => (
                        <Pressable 
                            key={i} 
                            style={[styles.savedSigBox, { borderColor: colors.border, backgroundColor: colors.card }]}
                            onPress={() => {
                                onSave(sig);
                                onClose();
                            }}
                        >
                            {sig.type === 'text' && (
                                <Text style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 18, color: colors.text }}>
                                    {sig.data}
                                </Text>
                            )}
                            {sig.type === 'path' && (
                                <Svg width={80} height={40} viewBox={`0 0 ${sig.width} ${sig.height}`}>
                                    <Path d={sig.data} stroke={colors.text} strokeWidth={4} fill="none" />
                                </Svg>
                            )}
                            {sig.type === 'image' && (
                                <View style={{ width: 80, height: 40, borderRadius: 4, backgroundColor: '#eee', overflow: 'hidden' }}>
                                    <Ionicons name="image" size={24} color={colors.textMuted} style={{ alignSelf: 'center', marginTop: 8 }} />
                                </View>
                            )}
                        </Pressable>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Créer une signature</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </Pressable>
                    </View>

                    <View style={styles.tabs}>
                        <Pressable style={[styles.tab, activeTab === 'draw' && styles.tabActive]} onPress={() => setActiveTab('draw')}>
                            <Text style={[styles.tabText, { color: activeTab === 'draw' ? '#3498db' : colors.textMuted }]}>Dessiner</Text>
                        </Pressable>
                        <Pressable style={[styles.tab, activeTab === 'type' && styles.tabActive]} onPress={() => setActiveTab('type')}>
                            <Text style={[styles.tabText, { color: activeTab === 'type' ? '#3498db' : colors.textMuted }]}>Taper</Text>
                        </Pressable>
                        <Pressable style={[styles.tab, activeTab === 'upload' && styles.tabActive]} onPress={() => setActiveTab('upload')}>
                            <Text style={[styles.tabText, { color: activeTab === 'upload' ? '#3498db' : colors.textMuted }]}>Importer</Text>
                        </Pressable>
                    </View>

                    <View style={styles.contentArea}>
                        {activeTab === 'draw' && (
                            <View style={styles.drawContainer}>
                                <View 
                                    style={[styles.canvasArea, { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                    onLayout={(e) => setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
                                    {...panResponder.panHandlers}
                                >
                                    <Svg width="100%" height="100%">
                                        {paths.map((p, i) => (
                                            <Path key={i} d={p} stroke={colors.text} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        ))}
                                        {currentPath ? (
                                            <Path d={currentPath} stroke={colors.text} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        ) : null}
                                    </Svg>
                                </View>
                                <View style={styles.drawActions}>
                                    <Pressable onPress={clearDraw}>
                                        <Text style={{ color: colors.textMuted }}>Effacer</Text>
                                    </Pressable>
                                    <Pressable style={styles.primaryBtn} onPress={handleSaveDraw}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Créer</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {activeTab === 'type' && (
                            <View style={styles.typeContainer}>
                                <TextInput
                                    style={[styles.typeInput, { color: colors.text, borderBottomColor: '#3498db' }]}
                                    placeholder="Votre Nom"
                                    placeholderTextColor={colors.textMuted}
                                    value={typedText}
                                    onChangeText={setTypedText}
                                    autoFocus
                                />
                                <Pressable style={[styles.primaryBtn, { alignSelf: 'flex-end', marginTop: 16 }]} onPress={handleSaveType}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Créer</Text>
                                </Pressable>
                            </View>
                        )}

                        {activeTab === 'upload' && (
                            <View style={styles.uploadContainer}>
                                <Ionicons name="cloud-upload-outline" size={48} color={colors.textMuted} />
                                <Text style={{ color: colors.text, marginVertical: 16, textAlign: 'center' }}>
                                    Importez une image de votre signature depuis votre appareil.
                                </Text>
                                <Pressable style={styles.primaryBtn} onPress={handleUpload}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sélectionner une image</Text>
                                </Pressable>
                            </View>
                        )}

                        {renderSavedSignatures()}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: 500, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    title: { fontSize: 18, fontWeight: 'bold' },
    closeBtn: { padding: 4 },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#3498db' },
    tabText: { fontWeight: '600' },
    contentArea: { padding: 20 },
    drawContainer: { gap: 16 },
    canvasArea: { width: '100%', height: 200, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
    drawActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    primaryBtn: { backgroundColor: '#3498db', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    typeContainer: { paddingVertical: 20 },
    typeInput: { fontSize: 32, fontFamily: 'serif', fontStyle: 'italic', borderBottomWidth: 2, paddingBottom: 8, textAlign: 'center', outlineStyle: 'none' as any },
    uploadContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' },
    savedSigBox: { borderWidth: 1, borderRadius: 8, padding: 8, minWidth: 80, alignItems: 'center', justifyContent: 'center' }
});
