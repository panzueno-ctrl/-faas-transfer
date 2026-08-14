import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

export type OcrLanguage = 'eng' | 'fra' | 'spa' | 'deu';

interface OcrLanguageSelectorProps {
    onChange: (lang: OcrLanguage) => void;
}

export default function OcrLanguageSelector({ onChange }: OcrLanguageSelectorProps) {
    const { t } = useTranslation();
    const [lang, setLang] = useState<OcrLanguage>('fra');

    useEffect(() => {
        onChange(lang);
    }, [lang]);

    const languages = [
        { id: 'fra', title: 'Français', flag: '🇫🇷' },
        { id: 'eng', title: 'Anglais', flag: '🇬🇧' },
        { id: 'spa', title: 'Espagnol', flag: '🇪🇸' },
        { id: 'deu', title: 'Allemand', flag: '🇩🇪' },
    ] as const;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Langue du document</Text>
            <Text style={styles.subtitle}>Sélectionnez la langue principale du texte pour optimiser l'extraction (OCR).</Text>

            <View style={styles.grid}>
                {languages.map(l => (
                    <Pressable
                        key={l.id}
                        style={[styles.card, lang === l.id && styles.cardActive]}
                        onPress={() => setLang(l.id as OcrLanguage)}
                    >
                        <Text style={styles.flag}>{l.flag}</Text>
                        <Text style={[styles.cardTitle, lang === l.id && styles.cardTitleActive]}>{l.title}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card: {
        width: '48%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cardActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderColor: '#3498db',
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    cardTitle: {
        color: '#eee',
        fontSize: 14,
        fontWeight: '600',
    },
    cardTitleActive: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
