import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type RotationAngle = 90 | 180 | 270;

interface RotationSelectorProps {
    onChange: (angle: RotationAngle) => void;
}

export default function RotationSelector({ onChange }: RotationSelectorProps) {
    const { t } = useTranslation();
    const [angle, setAngle] = useState<RotationAngle>(90);

    useEffect(() => {
        onChange(angle);
    }, [angle]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sens de rotation</Text>
            <Text style={styles.subtitle}>Sélectionnez l'angle de rotation à appliquer à toutes les pages.</Text>

            <View style={styles.grid}>
                <Pressable
                    style={[styles.card, angle === 270 && styles.cardActive]}
                    onPress={() => setAngle(270)}
                >
                    <View style={[styles.iconBox, angle === 270 && styles.iconBoxActive]}>
                        <Ionicons name="arrow-undo-outline" size={28} color={angle === 270 ? '#fff' : '#888'} />
                    </View>
                    <Text style={[styles.cardTitle, angle === 270 && styles.cardTitleActive]}>Gauche</Text>
                    <Text style={styles.cardDesc}>-90°</Text>
                </Pressable>

                <Pressable
                    style={[styles.card, angle === 180 && styles.cardActive]}
                    onPress={() => setAngle(180)}
                >
                    <View style={[styles.iconBox, angle === 180 && styles.iconBoxActive]}>
                        <Ionicons name="refresh-outline" size={28} color={angle === 180 ? '#fff' : '#888'} style={{ transform: [{ rotate: '180deg' }] }} />
                    </View>
                    <Text style={[styles.cardTitle, angle === 180 && styles.cardTitleActive]}>À l'envers</Text>
                    <Text style={styles.cardDesc}>180°</Text>
                </Pressable>

                <Pressable
                    style={[styles.card, angle === 90 && styles.cardActive]}
                    onPress={() => setAngle(90)}
                >
                    <View style={[styles.iconBox, angle === 90 && styles.iconBoxActive]}>
                        <Ionicons name="arrow-redo-outline" size={28} color={angle === 90 ? '#fff' : '#888'} />
                    </View>
                    <Text style={[styles.cardTitle, angle === 90 && styles.cardTitleActive]}>Droite</Text>
                    <Text style={styles.cardDesc}>+90°</Text>
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
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    cardActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderColor: '#3498db',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconBoxActive: {
        backgroundColor: '#3498db',
    },
    cardTitle: {
        color: '#eee',
        fontSize: 14,
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
