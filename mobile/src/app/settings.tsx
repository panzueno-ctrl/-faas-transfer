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

// Clé de stockage pour les paramètres
const SETTINGS_KEY = 'faas_settings';

// Options de langue disponibles
const LANGUAGES = [
    { id: 'fr', label: 'Français' },
    { id: 'en', label: 'English' },
];

// Options de durée d'expiration
const EXPIRATION_OPTIONS = [
    { id: '1h', label: '1 heure', value: 1 },
    { id: '24h', label: '24 heures', value: 24 },
    { id: '72h', label: '72 heures', value: 72 },
];

// Options de qualité de transfert
const QUALITY_OPTIONS = [
    { id: 'original', label: 'Original', description: 'Qualité maximale' },
    { id: 'compressed', label: 'Compressé', description: 'Taille réduite' },
];

export default function SettingsScreen() {

    // Pour naviguer vers d'autres écrans
    const router = useRouter();

    // Paramètres actuels
    const [language, setLanguage] = useState('fr');
    const [expiration, setExpiration] = useState('24h');
    const [quality, setQuality] = useState('original');

    // Sauvegarde les paramètres dans AsyncStorage
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

    // Supprime tout l'historique des transferts
    const clearHistory = async () => {
        Alert.alert(
            'Supprimer l\'historique',
            'Êtes-vous sûr de vouloir supprimer tout l\'historique ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('faas_history');
                        Alert.alert('✅', 'Historique supprimé avec succès.');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Bouton retour vers l'accueil */}
                <Pressable style={styles.backButton} onPress={() => router.push('/')}>
                    <Ionicons name="arrow-back-outline" size={20} color="#aaaaaa" />
                    <Text style={styles.backButtonText}>Accueil</Text>
                </Pressable>

                <Text style={styles.title}>Paramètres</Text>

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
                            {language === lang.id && (
                                <Ionicons name="checkmark-circle" size={18} color="#4a9eff" />
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
                            {expiration === option.id && (
                                <Ionicons name="checkmark-circle" size={18} color="#4a9eff" />
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
                            <View>
                                <Text style={[
                                    styles.optionLabel,
                                    quality === option.id && styles.optionLabelActive,
                                ]}>
                                    {option.label}
                                </Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </View>
                            {quality === option.id && (
                                <Ionicons name="checkmark-circle" size={18} color="#4a9eff" />
                            )}
                        </Pressable>
                    ))}
                </View>

                {/* ── Danger zone ── */}
                <Text style={styles.sectionTitle}>Données</Text>
                <Pressable style={styles.dangerButton} onPress={clearHistory}>
                    <Ionicons name="trash-outline" size={20} color="#ff5252" />
                    <Text style={styles.dangerButtonText}>Supprimer l'historique</Text>
                </Pressable>

            </ScrollView>
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
        marginBottom: 24,
    },

    // Titre de section
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 20,
    },

    // Conteneur des options
    optionsContainer: {
        gap: 8,
    },

    // Carte d'option
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#222222',
    },

    // Carte d'option active
    optionCardActive: {
        borderColor: '#4a9eff',
        backgroundColor: '#0a1a2a',
    },

    // Label de l'option
    optionLabel: {
        color: '#aaaaaa',
        fontSize: 15,
        fontWeight: '500',
    },

    // Label de l'option active
    optionLabelActive: {
        color: '#ffffff',
    },

    // Description de l'option
    optionDescription: {
        color: '#555555',
        fontSize: 12,
        marginTop: 2,
    },

    // Bouton danger — suppression
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1a0a0a',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ff5252',
        marginBottom: 40,
    },

    dangerButtonText: {
        color: '#ff5252',
        fontSize: 15,
        fontWeight: '500',
    },

}); 