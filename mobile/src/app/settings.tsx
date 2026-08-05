/**
 * app/settings.tsx
 *
 * Écran des paramètres de l'application.
 * Permet à l'utilisateur de configurer :
 * - Le thème de l'application (Clair/Sombre/Système)
 * - La langue de l'app (Français/Anglais/Italien)
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
import { useTheme, ThemeType } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const SETTINGS_KEY = 'faas_settings';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const styles = getStyles(colors);

    const [language, setLanguage] = useState(i18n.language || 'fr');
    const [expiration, setExpiration] = useState('24h');
    const [quality, setQuality] = useState('original');

    const LANGUAGES = [
        { id: 'fr', label: 'Français' },
        { id: 'en', label: 'English' },
        { id: 'it', label: 'Italiano' },
    ];

    const THEMES = [
        { id: 'light', label: t('settings.light') },
        { id: 'dark', label: t('settings.dark') },
        { id: 'system', label: t('settings.system') },
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

    const handleLanguageChange = (langId: string) => {
        setLanguage(langId);
        i18n.changeLanguage(langId);
        saveSettings('language', langId);
    };

    const handleThemeChange = (themeId: string) => {
        setTheme(themeId as ThemeType);
    };

    const clearHistory = async () => {
        Alert.alert(
            t('settings.clear_history'),
            t('settings.clear_history_desc'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('faas_history');
                        Alert.alert(t('common.success'), t('settings.clear_history_desc'));
                    },
                },
            ]
        );
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

                <View style={styles.scrollContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>{t('settings.title')}</Text>
                            <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
                        </View>

                        {/* ── Thème ── */}
                        <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
                        <View style={styles.optionsContainer}>
                            {THEMES.map((tItem) => (
                                <Pressable
                                    key={tItem.id}
                                    style={({ pressed, hovered }: any) => [
                                        styles.optionCard,
                                        theme === tItem.id && styles.optionCardActive,
                                        (pressed || hovered) && styles.optionCardHovered,
                                    ]}
                                    onPress={() => handleThemeChange(tItem.id)}>
                                    <Text style={[
                                        styles.optionLabel,
                                        theme === tItem.id && styles.optionLabelActive,
                                    ]}>
                                        {tItem.label}
                                    </Text>
                                    {theme === tItem.id ? (
                                        <Ionicons name="radio-button-on" size={20} color={colors.primary} />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color={colors.textSubtle} />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Langue ── */}
                        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
                        <View style={styles.optionsContainer}>
                            {LANGUAGES.map((lang) => (
                                <Pressable
                                    key={lang.id}
                                    style={({ pressed, hovered }: any) => [
                                        styles.optionCard,
                                        language === lang.id && styles.optionCardActive,
                                        (pressed || hovered) && styles.optionCardHovered,
                                    ]}
                                    onPress={() => handleLanguageChange(lang.id)}>
                                    <Text style={[
                                        styles.optionLabel,
                                        language === lang.id && styles.optionLabelActive,
                                    ]}>
                                        {lang.label}
                                    </Text>
                                    {language === lang.id ? (
                                        <Ionicons name="radio-button-on" size={20} color={colors.primary} />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color={colors.textSubtle} />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Durée d'expiration ── */}
                        <Text style={styles.sectionTitle}>{t('settings.expiration')}</Text>
                        <View style={styles.optionsContainer}>
                            {EXPIRATION_OPTIONS.map((option) => (
                                <Pressable
                                    key={option.id}
                                    style={({ pressed, hovered }: any) => [
                                        styles.optionCard,
                                        expiration === option.id && styles.optionCardActive,
                                        (pressed || hovered) && styles.optionCardHovered,
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
                                        <Ionicons name="radio-button-on" size={20} color={colors.primary} />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color={colors.textSubtle} />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Qualité transfert ── */}
                        <Text style={styles.sectionTitle}>{t('settings.quality')}</Text>
                        <View style={styles.optionsContainer}>
                            {QUALITY_OPTIONS.map((option) => (
                                <Pressable
                                    key={option.id}
                                    style={({ pressed, hovered }: any) => [
                                        styles.optionCard,
                                        quality === option.id && styles.optionCardActive,
                                        (pressed || hovered) && styles.optionCardHovered,
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
                                        <Ionicons name="radio-button-on" size={20} color={colors.primary} />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color={colors.textSubtle} />
                                    )}
                                </Pressable>
                            ))}
                        </View>

                        {/* ── Danger zone ── */}
                        <View style={styles.dangerZone}>
                            <Text style={styles.sectionTitleDanger}>{t('settings.danger_zone')}</Text>
                            <Pressable 
                                style={({ pressed, hovered }: any) => [
                                    styles.dangerButton,
                                    (pressed || hovered) && styles.dangerButtonHovered
                                ]}
                                onPress={clearHistory}>
                                <View style={styles.dangerIconContainer}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                </View>
                                <View>
                                    <Text style={styles.dangerButtonText}>{t('settings.clear_history')}</Text>
                                    <Text style={styles.dangerDescription}>{t('settings.clear_history_desc')}</Text>
                                </View>
                            </Pressable>
                        </View>

                    </ScrollView>
                </View>
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
    scrollContainer: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
    },
    scrollContent: {
        paddingTop: 100, 
        paddingBottom: 60,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
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
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
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
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        transitionDuration: '0.2s',
    },
    optionCardHovered: {
        backgroundColor: colors.cardHovered,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        transform: [{ translateY: -1 }],
    },
    optionCardActive: {
        borderColor: colors.primary,
        backgroundColor: colors.glow,
    },
    optionLabel: {
        color: colors.textMuted,
        fontSize: 16,
        fontWeight: '500',
    },
    optionLabelActive: {
        color: colors.text,
        fontWeight: '600',
    },
    optionDescription: {
        color: colors.textSubtle,
        fontSize: 13,
        marginTop: 4,
    },
    dangerZone: {
        marginTop: 48,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    sectionTitleDanger: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
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
        transitionDuration: '0.2s',
    },
    dangerButtonHovered: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: colors.danger,
        shadowColor: colors.danger,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        transform: [{ translateY: -1 }],
    },
    dangerIconContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 10,
        borderRadius: 10,
    },
    dangerButtonText: {
        color: colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
    dangerDescription: {
        color: colors.textSubtle,
        fontSize: 13,
        marginTop: 2,
    }
});