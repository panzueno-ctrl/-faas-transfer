import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export interface NumberingConfig {
    position: string; // 'bottom-center', 'bottom-right', 'top-center', 'top-right'
    format: string; // 'simple' (1), 'total' (1/10), 'page' (Page 1)
}

interface NumberingSelectorProps {
    onChange: (config: NumberingConfig) => void;
}

export default function NumberingSelector({ onChange }: NumberingSelectorProps) {
    const { t } = useTranslation();
    const [position, setPosition] = useState('bottom-center');
    const [format, setFormat] = useState('total');

    useEffect(() => {
        onChange({ position, format });
    }, [position, format]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Numérotation des pages</Text>
            <Text style={styles.subtitle}>Personnalisez l'affichage des numéros de page.</Text>

            <Text style={styles.label}>Format de numérotation</Text>
            <View style={styles.rowGrid}>
                <Pressable 
                    style={[styles.btn, format === 'simple' && styles.btnActive]}
                    onPress={() => setFormat('simple')}
                >
                    <Text style={[styles.btnText, format === 'simple' && styles.btnTextActive]}>1, 2, 3</Text>
                </Pressable>
                <Pressable 
                    style={[styles.btn, format === 'total' && styles.btnActive]}
                    onPress={() => setFormat('total')}
                >
                    <Text style={[styles.btnText, format === 'total' && styles.btnTextActive]}>1/10, 2/10</Text>
                </Pressable>
                <Pressable 
                    style={[styles.btn, format === 'page' && styles.btnActive]}
                    onPress={() => setFormat('page')}
                >
                    <Text style={[styles.btnText, format === 'page' && styles.btnTextActive]}>Page 1, Page 2</Text>
                </Pressable>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Position sur la page</Text>
            <View style={styles.grid2x2}>
                <Pressable 
                    style={[styles.posCard, position === 'top-center' && styles.posCardActive]}
                    onPress={() => setPosition('top-center')}
                >
                    <Ionicons name="arrow-up-circle-outline" size={24} color={position === 'top-center' ? '#fff' : '#888'} />
                    <Text style={[styles.posText, position === 'top-center' && styles.posTextActive]}>Haut Centre</Text>
                </Pressable>
                <Pressable 
                    style={[styles.posCard, position === 'top-right' && styles.posCardActive]}
                    onPress={() => setPosition('top-right')}
                >
                    <Ionicons name="arrow-up-circle-outline" size={24} color={position === 'top-right' ? '#fff' : '#888'} style={{ transform: [{ rotate: '45deg' }] }} />
                    <Text style={[styles.posText, position === 'top-right' && styles.posTextActive]}>Haut Droite</Text>
                </Pressable>
                <Pressable 
                    style={[styles.posCard, position === 'bottom-center' && styles.posCardActive]}
                    onPress={() => setPosition('bottom-center')}
                >
                    <Ionicons name="arrow-down-circle-outline" size={24} color={position === 'bottom-center' ? '#fff' : '#888'} />
                    <Text style={[styles.posText, position === 'bottom-center' && styles.posTextActive]}>Bas Centre</Text>
                </Pressable>
                <Pressable 
                    style={[styles.posCard, position === 'bottom-right' && styles.posCardActive]}
                    onPress={() => setPosition('bottom-right')}
                >
                    <Ionicons name="arrow-down-circle-outline" size={24} color={position === 'bottom-right' ? '#fff' : '#888'} style={{ transform: [{ rotate: '-45deg' }] }} />
                    <Text style={[styles.posText, position === 'bottom-right' && styles.posTextActive]}>Bas Droite</Text>
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#eee',
        marginBottom: 12,
    },
    rowGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    btn: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    btnActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: '#3498db',
    },
    btnText: {
        color: '#888',
        fontSize: 13,
        fontWeight: '500',
    },
    btnTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    grid2x2: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    posCard: {
        width: '48%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    posCardActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderColor: '#3498db',
    },
    posText: {
        color: '#888',
        fontSize: 13,
        marginTop: 8,
        fontWeight: '500',
    },
    posTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
