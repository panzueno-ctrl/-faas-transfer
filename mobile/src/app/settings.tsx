/**
 * app/settings.tsx
 *
 * Écran des paramètres de l'application.
 * Permet à l'utilisateur de configurer :
 * - La langue de l'app
 * - La durée d'expiration des liens
 * - La qualité du transfert
 * - La suppression de l'historique
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'faas_settings';

const LANGUAGES = [
    { id: 'fr', label: 'Français' },
    { id: 'en', label: 'English' },
];

const EXPIRATION_OPTIONS = [
    { id: '1h', label: '1 heure', value: 1 },
    { id: '24h', label: '24 heures', value: 24 },
    { id: '72h', label: '72 heures', value: 72 },
];

const QUALITY_OPTIONS = [
    { id: 'original', label: 'Original', description: 'Qualité maximale sans compression' },
    { id: 'compressed', label: 'Compressé', description: 'Idéal pour économiser de la bande passante' },
];

export default function SettingsScreen() {
    const router = useRouter();

    const [language, setLanguage] = useState('fr');
    const [expiration, setExpiration] = useState('24h');
    const [quality, setQuality] = useState('original');

    const saveSettings = async (key: string, value: string) => {
        try {
            const existing = await AsyncStorage.getItem(SETTINGS_KEY);
            const settings = existing ? JSON.parse(existing) : {};
            settings[key] = value;
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.log('Erreur sauvegarde paramètres:', error);
        }
    };

    const clearHistory = async () => {
        Alert.alert(
            'Supprimer l\'historique',
            'Êtes-vous sûr de vouloir supprimer tout l\'historique de transfert ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('faas_history');
                        Alert.alert('Succès', 'Historique supprimé avec succès.');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundGlow} pointerEvents="none" />

            <View style={styles.contentWrapper}>
                <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                    <Ionicons name="arrow-back-outline" size={18} color="#94A3B8" />
                    <Text style={styles.backButtonText}>Accueil</Text>
                </Pressable>

                <View style={styles.scrollContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Paramètres</Text>
                            <Text style={styles.subtitle}>Personnalisez votre expérience</Text>
                        </View>

                        {/* ── Langue ── */}
                        <Text style={styles.sectionTitle}>Langue</Text>
                        <View style={styles.optionsContainer}>
                            {LANGUAGES.map((lang) => (
                                <Pressable
                                    key={lang.id}
                                    style={[
                                        styles.optionCard,
                                        language === lang.id && styles.optionCardActive,
                                    ]}
                                    onPress={() => {
                                        setLanguage(lang.id);
                                        saveSettings('language', lang.id);
                                    }}>
                                    <Text style={[
                                        styles.optionLabel,
                                        language === lang.id && styles.optionLabelActive,
                                    ]}>
                                        {lang.label}
                                    </Text>
                                    {language === lang.id ? (
                                        <Ionicons name="radio-button-on" size={20} color="#3B82F6" />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color="#475569" />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Durée d'expiration ── */}
                        <Text style={styles.sectionTitle}>Durée d'expiration des liens</Text>
                        <View style={styles.optionsContainer}>
                            {EXPIRATION_OPTIONS.map((option) => (
                                <Pressable
                                    key={option.id}
                                    style={[
                                        styles.optionCard,
                                        expiration === option.id && styles.optionCardActive,
                                    ]}
                                    onPress={() => {
                                        setExpiration(option.id);
                                        saveSettings('expiration', option.id);
                                    }}>
                                    <Text style={[
                                        styles.optionLabel,
                                        expiration === option.id && styles.optionLabelActive,
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {expiration === option.id ? (
                                        <Ionicons name="radio-button-on" size={20} color="#3B82F6" />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color="#475569" />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Qualité transfert ── */}
                        <Text style={styles.sectionTitle}>Qualité du transfert</Text>
                        <View style={styles.optionsContainer}>
                            {QUALITY_OPTIONS.map((option) => (
                                <Pressable
                                    key={option.id}
                                    style={[
                                        styles.optionCard,
                                        quality === option.id && styles.optionCardActive,
                                    ]}
                                    onPress={() => {
                                        setQuality(option.id);
                                        saveSettings('quality', option.id);
                                    }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[
                                            styles.optionLabel,
                                            quality === option.id && styles.optionLabelActive,
                                        ]}>
                                            {option.label}
                                        </Text>
                                        <Text style={styles.optionDescription}>{option.description}</Text>
                                    </View>
                                    {quality === option.id ? (
                                        <Ionicons name="radio-button-on" size={20} color="#3B82F6" />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color="#475569" />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Danger zone ── */}
                        <View style={styles.dangerZone}>
                            <Text style={styles.sectionTitleDanger}>Zone de danger</Text>
                            <Pressable style={styles.dangerButton} onPress={clearHistory}>
                                <View style={styles.dangerIconContainer}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </View>
                                <View>
                                    <Text style={styles.dangerButtonText}>Effacer l'historique</Text>
                                    <Text style={styles.dangerDescription}>Supprime toutes les traces de transferts locaux</Text>
                                </View>
                            </Pressable>
                        </View>

                    </ScrollView>
                </View>
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
    },

    backButtonText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
    },

    scrollContainer: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
    },

    scrollContent: {
        paddingTop: 100, // Espace pour le bouton absolu
        paddingBottom: 60,
    },

    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
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

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 12,
        marginTop: 32,
    },

    optionsContainer: {
        gap: 12,
    },

    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#13151A',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#1F232D',
    },

    optionCardActive: {
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
    },

    optionLabel: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
    },

    optionLabelActive: {
        color: '#F8FAFC',
        fontWeight: '600',
    },

    optionDescription: {
        color: '#475569',
        fontSize: 13,
        marginTop: 4,
    },

    dangerZone: {
        marginTop: 48,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#1F232D',
    },

    sectionTitleDanger: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
        marginBottom: 16,
    },

    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    
    dangerIconContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 10,
        borderRadius: 10,
    },

    dangerButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
    
    dangerDescription: {
        color: '#475569',
        fontSize: 13,
        marginTop: 2,
    }
});