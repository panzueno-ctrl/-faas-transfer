import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

interface PasswordProtectorProps {
    onChange: (password: string) => void;
}

export default function PasswordProtector({ onChange }: PasswordProtectorProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isFocused, setIsFocused] = useState(false);
    const [isConfirmFocused, setIsConfirmFocused] = useState(false);

    useEffect(() => {
        if (password && password === confirmPassword) {
            onChange(password);
        } else {
            onChange('');
        }
    }, [password, confirmPassword]);

    const isMatch = password && confirmPassword && password === confirmPassword;
    const isError = confirmPassword.length > 0 && password !== confirmPassword;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={24} color="#ff4d4f" />
                </View>
                <Text style={styles.title}>Ajouter un mot de passe</Text>
            </View>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Tape ton mot de passe</Text>
                <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Définis ton mot de passe"
                        placeholderTextColor="#666"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                    </Pressable>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Redonne le mot de passe</Text>
                <View style={[
                    styles.inputContainer, 
                    isConfirmFocused && styles.inputFocused,
                    isError && styles.inputError,
                    isMatch && styles.inputSuccess
                ]}>
                    <Ionicons name="lock-closed-outline" size={20} color={isMatch ? "#2ecc71" : isError ? "#e74c3c" : "#888"} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirme ton mot de passe"
                        placeholderTextColor="#666"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setIsConfirmFocused(true)}
                        onBlur={() => setIsConfirmFocused(false)}
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                    </Pressable>
                </View>
                {isError && <Text style={styles.errorText}>Les mots de passe ne correspondent pas.</Text>}
            </View>

            <View style={styles.footer}>
                <Ionicons name="help-circle-outline" size={16} color="#aaa" />
                <Text style={styles.footerText}>Protection par cryptage AES 128 bits</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        
        
        
        
        
        
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 77, 79, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ccc',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        
        
    },
    inputFocused: {
        borderColor: '#3498db',
    },
    inputError: {
        borderColor: '#e74c3c',
    },
    inputSuccess: {
        borderColor: '#2ecc71',
    },
    icon: {
        marginRight: 10,
    },
    eyeIcon: {
        padding: 4,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: Platform.OS === 'web' ? 16 : 12,
        outlineStyle: 'none' as any,
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 6,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    footerText: {
        color: '#aaa',
        fontSize: 13,
        marginLeft: 6,
    }
});
