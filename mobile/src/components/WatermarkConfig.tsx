import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

interface WatermarkConfigProps {
    onChange: (config: { text: string; position: string }) => void;
}

export default function WatermarkConfig({ onChange }: WatermarkConfigProps) {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [position, setPosition] = useState('diagonal'); // 'diagonal', 'bottom-right', 'top-center'
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        onChange({ text, position });
    }, [text, position]);

    const setConfidential = () => {
        setText('CONFIDENTIEL');
        setPosition('diagonal');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ajouter un filigrane</Text>
            <Text style={styles.subtitle}>Protégez votre document en y apposant votre marque.</Text>
            
            <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
                <Ionicons name="text-outline" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Brouillon, Copie, etc."
                    placeholderTextColor="#666"
                    value={text}
                    onChangeText={setText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
            </View>

            <Pressable style={styles.quickBadge} onPress={setConfidential}>
                <Ionicons name="flash-outline" size={14} color="#f39c12" />
                <Text style={styles.quickBadgeText}>Tampon rapide : CONFIDENTIEL</Text>
            </Pressable>

            <Text style={styles.label}>Position du texte</Text>
            <View style={styles.positionGrid}>
                <Pressable 
                    style={[styles.positionBtn, position === 'top-center' && styles.positionBtnActive]}
                    onPress={() => setPosition('top-center')}
                >
                    <Ionicons name="arrow-up-outline" size={20} color={position === 'top-center' ? '#fff' : '#888'} />
                    <Text style={[styles.positionText, position === 'top-center' && styles.positionTextActive]}>En Haut</Text>
                </Pressable>

                <Pressable 
                    style={[styles.positionBtn, position === 'diagonal' && styles.positionBtnActive]}
                    onPress={() => setPosition('diagonal')}
                >
                    <Ionicons name="contract-outline" size={20} color={position === 'diagonal' ? '#fff' : '#888'} style={{ transform: [{ rotate: '45deg' }] }} />
                    <Text style={[styles.positionText, position === 'diagonal' && styles.positionTextActive]}>Diagonale</Text>
                </Pressable>

                <Pressable 
                    style={[styles.positionBtn, position === 'bottom-right' && styles.positionBtnActive]}
                    onPress={() => setPosition('bottom-right')}
                >
                    <Ionicons name="arrow-down-circle-outline" size={20} color={position === 'bottom-right' ? '#fff' : '#888'} />
                    <Text style={[styles.positionText, position === 'bottom-right' && styles.positionTextActive]}>En Bas</Text>
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 12,
    },
    inputFocused: {
        borderColor: '#3498db',
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: Platform.OS === 'web' ? 16 : 12,
        outlineStyle: 'none' as any,
    },
    quickBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(243, 156, 18, 0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(243, 156, 18, 0.3)',
    },
    quickBadgeText: {
        color: '#f39c12',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#eee',
        marginBottom: 12,
    },
    positionGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    positionBtn: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    positionBtnActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: '#3498db',
    },
    positionText: {
        color: '#888',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '500',
    },
    positionTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
