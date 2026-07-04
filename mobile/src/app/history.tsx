/**
 * app/history.tsx
 *
 * Écran historique des fichiers envoyés et reçus.
 * Les transferts sont stockés localement via AsyncStorage.
 * Chaque fichier envoyé a un statut : en attente, téléchargé ou expiré.
 */

// useFocusEffect recharge l'écran chaque fois qu'on y entre
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
import { useState, useEffect, useCallback } from 'react';

// Clé de stockage AsyncStorage pour l'historique des envois
const STORAGE_KEY = 'faas_history';

// Type d'un transfert dans l'historique
type Transfer = {
    id: string;           // id unique retourné par le serveur
    fileName: string;     // nom original du fichier
    downloadUrl: string;  // lien de téléchargement
    sentAt: string;       // date d'envoi
    status: 'pending' | 'downloaded' | 'expired'; // statut du transfert
};

export default function HistoryScreen() {

    // Pour naviguer vers d'autres écrans
    const router = useRouter();

    // Onglet actif — envoyés ou reçus
    const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

    // Liste des transferts envoyés
    const [sentFiles, setSentFiles] = useState<Transfer[]>([]);

    // Indicateur de chargement
    const [loading, setLoading] = useState(true);

    // On recharge l'historique chaque fois que l'écran devient actif
    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    // Charge l'historique depuis AsyncStorage
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

    // Supprime un transfert de l'historique
    const deleteTransfer = async (id: string) => {
        try {
            const updated = sentFiles.filter(f => f.id !== id);
            setSentFiles(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.log('Erreur suppression:', error);
        }
    };

    // Retourne la couleur et l'icône selon le statut
    const getStatusStyle = (status: Transfer['status']) => {
        switch (status) {
            case 'downloaded':
                return { color: '#4caf50', icon: 'checkmark-circle-outline' };
            case 'expired':
                return { color: '#ff5252', icon: 'time-outline' };
            default:
                return { color: '#4a9eff', icon: 'hourglass-outline' };
        }
    };

    // Retourne le label du statut en français
    const getStatusLabel = (status: Transfer['status']) => {
        switch (status) {
            case 'downloaded': return 'Téléchargé';
            case 'expired': return 'Expiré';
            default: return 'En attente';
        }
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* Bouton retour vers l'accueil */}
            <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                <Text style={styles.backButtonText}>Accueil</Text>
            </Pressable>

            <Text style={styles.title}>Récents</Text>

            {/* Onglets Envoyés / Reçus */}
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

            {/* Contenu selon l'onglet actif */}
            {loading ? (
                <ActivityIndicator size="large" color="#4a9eff" style={styles.loader} />
            ) : activeTab === 'sent' ? (

                <View style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {sentFiles.length === 0 ? (

                            <View style={styles.emptyContainer}>
                                <Ionicons name="time-outline" size={48} color="#333333" />
                                <Text style={styles.emptyText}>Aucun fichier envoyé</Text>
                            </View>

                        ) : (
                            sentFiles.map((transfer) => {
                                const statusStyle = getStatusStyle(transfer.status);
                                return (
                                    <View key={transfer.id} style={styles.transferCard}>

                                        {/* Icône fichier */}
                                        <View style={styles.fileIcon}>
                                            <Ionicons name="document-outline" size={24} color="#4a9eff" />
                                        </View>

                                        {/* Infos du transfert */}
                                        <View style={styles.fileInfo}>
                                            <Text style={styles.fileName} numberOfLines={1}>
                                                {transfer.fileName}
                                            </Text>
                                            <Text style={styles.fileDate}>{transfer.sentAt}</Text>
                                            <View style={styles.statusRow}>
                                                <Ionicons
                                                    name={statusStyle.icon as any}
                                                    size={12}
                                                    color={statusStyle.color}
                                                />
                                                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                                                    {getStatusLabel(transfer.status)}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Bouton supprimer */}
                                        <Pressable
                                            onPress={() => deleteTransfer(transfer.id)}
                                            style={styles.deleteButton}>
                                            <Ionicons name="trash-outline" size={18} color="#555555" />
                                        </Pressable>

                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </View>

            ) : (

                <View style={styles.emptyContainer}>
                    <Ionicons name="download-outline" size={48} color="#333333" />
                    <Text style={styles.emptyText}>Aucun fichier reçu</Text>
                </View>

            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

    // Conteneur principal
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        padding: 20,
    },

    // Bouton retour
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

    // Titre principal
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 20,
    },

    // Onglets Envoyés / Reçus
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },

    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },

    // Onglet actif
    tabActive: {
        backgroundColor: '#4a9eff',
    },

    tabText: {
        color: '#666666',
        fontWeight: '500',
        fontSize: 14,
    },

    // Texte de l'onglet actif
    tabTextActive: {
        color: '#ffffff',
    },

    // Indicateur de chargement
    loader: {
        marginTop: 40,
    },

    // Message quand la liste est vide
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 60,
    },

    emptyText: {
        color: '#444444',
        fontSize: 14,
    },

    // Carte d'un transfert
    transferCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        gap: 12,
        borderWidth: 1,
        borderColor: '#222222',
    },

    // Icône du fichier
    fileIcon: {
        width: 44,
        height: 44,
        backgroundColor: '#0a1a2a',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Infos du fichier
    fileInfo: {
        flex: 1,
        gap: 4,
    },

    fileName: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },

    fileDate: {
        color: '#555555',
        fontSize: 12,
    },

    // Ligne de statut
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Bouton supprimer
    deleteButton: {
        padding: 8,
    },

});