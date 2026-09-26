import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type SplitMode = 'all' | 'even' | 'odd';

interface SplitSelectorProps {
    onChange: (mode: SplitMode) => void;
}

export default function SplitSelector({ onChange }: SplitSelectorProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<SplitMode>('all');

    useEffect(() => {
        onChange(mode);
    }, [mode]);

    const options = [
        { id: 'all', title: 'Toutes les pages', desc: 'Sépare chaque page dans un fichier unique.', icon: 'albums-outline' },
        { id: 'even', title: 'Pages Paires', desc: 'Extrait uniquement les pages 2, 4, 6...', icon: 'book-outline' },
        { id: 'odd', title: 'Pages Impaires', desc: 'Extrait uniquement les pages 1, 3, 5...', icon: 'document-text-outline' },
    ] as const;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mode de division</Text>
            <Text style={styles.subtitle}>Choisissez quelles pages vous souhaitez extraire du document.</Text>

            <View style={styles.grid}>
                {options.map(opt => (
                    <Pressable
                        key={opt.id}
                        style={[styles.card, mode === opt.id && styles.cardActive]}
                        onPress={() => setMode(opt.id as SplitMode)}
                    >
                        <View style={[styles.iconBox, mode === opt.id && styles.iconBoxActive]}>
                            <Ionicons name={opt.icon as any} size={24} color={mode === opt.id ? '#fff' : '#888'} />
                        </View>
                        <Text style={[styles.cardTitle, mode === opt.id && styles.cardTitleActive]}>{opt.title}</Text>
                        <Text style={styles.cardDesc}>{opt.desc}</Text>
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
        gap: 12,
    },
    card: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderColor: '#3498db',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconBoxActive: {
        backgroundColor: '#3498db',
    },
    cardTitle: {
        color: '#eee',
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardTitleActive: {
        color: '#fff',
    },
    cardDesc: {
        color: '#888',
        fontSize: 12,
        flexShrink: 1,
        maxWidth: 220,
    }
});
