/**
 * app/history.tsx
 *
 * Écran historique des fichiers envoyés et reçus.
 * Les transferts sont stockés localement via AsyncStorage.
 * Chaque fichier envoyé a un statut : en attente, téléchargé ou expiré.
 */

import { useFocusEffect } from 'expo-router';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'faas_history';

type Transfer = {
    id: string;
    fileName: string;
    downloadUrl: string;
    sentAt: string;
    status: 'pending' | 'downloaded' | 'expired';
};

export default function HistoryScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
    const [sentFiles, setSentFiles] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const loadHistory = async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                setSentFiles(JSON.parse(data));
            }
        } catch (error) {
            console.log('Erreur chargement historique:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteTransfer = async (id: string) => {
        try {
            const updated = sentFiles.filter(f => f.id !== id);
            setSentFiles(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.log('Erreur suppression:', error);
        }
    };

    const getStatusStyle = (status: Transfer['status']) => {
        switch (status) {
            case 'downloaded':
                return { color: '#10B981', icon: 'checkmark-circle-outline' };
            case 'expired':
                return { color: '#EF4444', icon: 'time-outline' };
            default:
                return { color: '#3B82F6', icon: 'hourglass-outline' };
        }
    };

    const getStatusLabel = (status: Transfer['status']) => {
        switch (status) {
            case 'downloaded': return 'Téléchargé';
            case 'expired': return 'Expiré';
            default: return 'En attente';
        }
    };

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
                    <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                    <Text style={styles.backButtonText}>Accueil</Text>
                </Pressable>

                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Historique</Text>
                    <Text style={styles.subtitle}>Vos transferts récents</Text>
                </View>

                <View style={styles.tabs}>
                    <Pressable
                        style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
                        onPress={() => setActiveTab('sent')}>
                        <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
                            Envoyés
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === 'received' && styles.tabActive]}
                        onPress={() => setActiveTab('received')}>
                        <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
                            Reçus
                        </Text>
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.emptyContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                ) : activeTab === 'sent' ? (
                    <View style={styles.listContainer}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {sentFiles.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="time-outline" size={64} color="#1F232D" />
                                    <Text style={styles.emptyText}>Aucun fichier envoyé</Text>
                                </View>
                            ) : (
                                sentFiles.map((transfer) => {
                                    const statusStyle = getStatusStyle(transfer.status);
                                    return (
                                        <View key={transfer.id} style={styles.transferCard}>
                                            <View style={styles.fileIcon}>
                                                <Ionicons name="document-outline" size={24} color="#3B82F6" />
                                            </View>
                                            <View style={styles.fileInfo}>
                                                <Text style={styles.fileName} numberOfLines={1}>
                                                    {transfer.fileName}
                                                </Text>
                                                <Text style={styles.fileDate}>{transfer.sentAt}</Text>
                                                <View style={styles.statusRow}>
                                                    <Ionicons
                                                        name={statusStyle.icon as any}
                                                        size={14}
                                                        color={statusStyle.color}
                                                    />
                                                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                                                        {getStatusLabel(transfer.status)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Pressable
                                                onPress={() => deleteTransfer(transfer.id)}
                                                style={styles.deleteButton}>
                                                <Ionicons name="trash-outline" size={20} color="#475569" />
                                            </Pressable>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        <View style={styles.emptyContainer}>
                            <Ionicons name="download-outline" size={64} color="#1F232D" />
                            <Text style={styles.emptyText}>Aucun fichier reçu</Text>
                        </View>
                    </View>
                )}
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

    headerContainer: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 32,
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
    },

    tabs: {
        flexDirection: 'row',
        backgroundColor: '#13151A',
        borderRadius: 12,
        padding: 6,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#1F232D',
        width: '100%',
        maxWidth: 500,
    },

    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },

    tabActive: {
        backgroundColor: '#3B82F6',
    },

    tabText: {
        color: '#94A3B8',
        fontWeight: '600',
        fontSize: 14,
    },

    tabTextActive: {
        color: '#ffffff',
    },

    listContainer: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
    },

    scrollContent: {
        paddingBottom: 40,
    },

    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 100,
    },

    emptyText: {
        color: '#475569',
        fontSize: 16,
        fontWeight: '500',
    },

    transferCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#13151A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 16,
        borderWidth: 1,
        borderColor: '#1F232D',
    },

    fileIcon: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    fileInfo: {
        flex: 1,
        gap: 4,
    },

    fileName: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
    },

    fileDate: {
        color: '#94A3B8',
        fontSize: 13,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },

    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },

    deleteButton: {
        padding: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 10,
    },
});