/**
 * app/history.tsx
 *
 * Écran historique des fichiers envoyés et reçus.
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
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'faas_history';
const RECEIVED_STORAGE_KEY = 'faas_received_history';

type Transfer = {
    id: string;
    fileName: string;
    downloadUrl: string;
    sentAt: string;
    status: 'pending' | 'downloaded' | 'expired';
};

export default function HistoryScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
    const [sentFiles, setSentFiles] = useState<Transfer[]>([]);
    const [receivedFiles, setReceivedFiles] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const loadHistory = async () => {
        try {
            const [sentData, receivedData] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEY),
                AsyncStorage.getItem(RECEIVED_STORAGE_KEY)
            ]);
            
            if (sentData) {
                setSentFiles(JSON.parse(sentData));
            }
            if (receivedData) {
                setReceivedFiles(JSON.parse(receivedData));
            }
        } catch (error) {
            console.log('Erreur chargement historique:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteTransfer = async (id: string, type: 'sent' | 'received' = 'sent') => {
        try {
            if (type === 'sent') {
                const updated = sentFiles.filter(f => f.id !== id);
                setSentFiles(updated);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } else {
                const updated = receivedFiles.filter(f => f.id !== id);
                setReceivedFiles(updated);
                await AsyncStorage.setItem(RECEIVED_STORAGE_KEY, JSON.stringify(updated));
            }
        } catch (error) {
            console.log('Erreur suppression:', error);
        }
    };

    const getStatusStyle = (status: Transfer['status']) => {
        switch (status) {
            case 'downloaded':
                return { color: colors.success, icon: 'checkmark-circle-outline' };
            case 'expired':
                return { color: colors.danger, icon: 'time-outline' };
            default:
                return { color: colors.primary, icon: 'hourglass-outline' };
        }
    };

    const getStatusLabel = (status: Transfer['status']) => {
        switch (status) {
            case 'downloaded': return t('history.status_downloaded');
            case 'expired': return t('history.status_expired');
            default: return t('history.status_pending');
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
                    <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </Pressable>

                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{t('history.title')}</Text>
                    <Text style={styles.subtitle}>{t('history.subtitle')}</Text>
                </View>

                <View style={styles.tabs}>
                    <Pressable
                        style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
                        onPress={() => setActiveTab('sent')}>
                        <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
                            {t('history.sent')}
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === 'received' && styles.tabActive]}
                        onPress={() => setActiveTab('received')}>
                        <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
                            {t('history.received')}
                        </Text>
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.emptyContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : activeTab === 'sent' ? (
                    <View style={styles.listContainer}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {sentFiles.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="time-outline" size={64} color={colors.border} />
                                    <Text style={styles.emptyText}>{t('history.no_sent')}</Text>
                                </View>
                            ) : (
                                sentFiles.map((transfer) => {
                                    const statusStyle = getStatusStyle(transfer.status);
                                    return (
                                        <View key={transfer.id} style={styles.transferCard}>
                                            <View style={styles.fileIcon}>
                                                <Ionicons name="document-outline" size={24} color={colors.primary} />
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
                                                onPress={() => deleteTransfer(transfer.id, 'sent')}
                                                style={styles.deleteButton}>
                                                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                                            </Pressable>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {receivedFiles.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="download-outline" size={64} color={colors.border} />
                                    <Text style={styles.emptyText}>{t('history.no_received')}</Text>
                                </View>
                            ) : (
                                receivedFiles.map((transfer) => {
                                    const statusStyle = getStatusStyle(transfer.status);
                                    return (
                                        <View key={transfer.id} style={styles.transferCard}>
                                            <View style={styles.fileIcon}>
                                                <Ionicons name="document-outline" size={24} color={colors.success} />
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
                                                onPress={() => deleteTransfer(transfer.id, 'received')}
                                                style={styles.deleteButton}>
                                                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                                            </Pressable>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                )}
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

    headerContainer: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 32,
    },

    title: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },

    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
    },

    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 6,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.primary,
    },

    tabText: {
        color: colors.textMuted,
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
        color: colors.textSubtle,
        fontSize: 16,
        fontWeight: '500',
    },

    transferCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },

    fileDate: {
        color: colors.textMuted,
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