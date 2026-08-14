import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

interface PasswordProtectorProps {
    onChange: (password: string) => void;
}

export default function PasswordProtector({ onChange }: PasswordProtectorProps) {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    
    // Strength: 0 to 3
    const [strength, setStrength] = useState(0);

    useEffect(() => {
        onChange(password);
        
        let score = 0;
        if (password.length > 5) score++;
        if (password.length > 8) score++;
        if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        setStrength(Math.min(3, score));
    }, [password]);

    const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#27ae60'];
    const labels = ['Faible', 'Moyen', 'Fort', 'Inviolable'];

    const strengthColor = password.length === 0 ? '#333' : colors[strength];
    const strengthLabel = password.length === 0 ? 'Entrez un mot de passe' : labels[strength];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verrouiller le document</Text>
            <Text style={styles.subtitle}>Ajoutez un mot de passe pour empêcher l'ouverture du PDF.</Text>
            
            <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Mot de passe secret..."
                    placeholderTextColor="#666"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
            </View>

            <View style={styles.strengthContainer}>
                <View style={styles.bars}>
                    {[0, 1, 2].map((index) => (
                        <View 
                            key={index} 
                            style={[
                                styles.bar, 
                                { backgroundColor: password.length > 0 && strength >= index ? strengthColor : '#333' }
                            ]} 
                        />
                    ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                    {strengthLabel}
                </Text>
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
        marginBottom: 16,
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
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bars: {
        flexDirection: 'row',
        gap: 6,
        flex: 1,
        marginRight: 16,
    },
    bar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
    },
    strengthLabel: {
        fontSize: 13,
        fontWeight: '600',
        minWidth: 70,
        textAlign: 'right',
    }
});
