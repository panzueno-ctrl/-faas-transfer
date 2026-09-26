import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type ConversionQuality = 'standard' | 'hd';

interface ConversionOptionsProps {
    onChange: (quality: ConversionQuality) => void;
    type: 'pdf-to-image' | 'image-to-pdf' | 'general';
}

export default function ConversionOptions({ onChange, type }: ConversionOptionsProps) {
    const { t } = useTranslation();
    const [quality, setQuality] = useState<ConversionQuality>('standard');

    useEffect(() => {
        onChange(quality);
    }, [quality]);

    const title = type === 'pdf-to-image' ? "Qualité d'extraction" : 'Qualité de conversion';
    const subtitle = type === 'pdf-to-image' 
        ? 'Choisissez la résolution des images extraites du PDF.'
        : 'Sélectionnez la qualité du document final.';

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.grid}>
                <Pressable
                    style={[styles.card, quality === 'standard' && styles.cardActive]}
                    onPress={() => setQuality('standard')}
                >
                    <View style={[styles.iconBox, quality === 'standard' && styles.iconBoxActive]}>
                        <Ionicons name="flash-outline" size={24} color={quality === 'standard' ? '#fff' : '#888'} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.cardTitle, quality === 'standard' && styles.cardTitleActive]}>Standard</Text>
                        <Text style={styles.cardDesc}>Rapide, taille réduite. Idéal pour le web et les emails.</Text>
                    </View>
                </Pressable>

                <Pressable
                    style={[styles.card, quality === 'hd' && styles.cardActive]}
                    onPress={() => setQuality('hd')}
                >
                    <View style={[styles.iconBox, quality === 'hd' && styles.iconBoxActive]}>
                        <Ionicons name="diamond-outline" size={24} color={quality === 'hd' ? '#fff' : '#888'} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.cardTitle, quality === 'hd' && styles.cardTitleActive]}>Haute Qualité (HD)</Text>
                        <Text style={styles.cardDesc}>Résolution maximale. Parfait pour l'impression.</Text>
                    </View>
                </Pressable>
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
    textContainer: {
        flex: 1,
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
    }
});
