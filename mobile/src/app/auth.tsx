import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import LogoFaaS from '../components/LogoFaaS';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    async function signInWithEmail() {
        if (!email || !password) return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) Alert.alert('Erreur de connexion', error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        if (!email || !password) return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        setLoading(true);
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) Alert.alert('Erreur d\'inscription', error.message);
        else if (!session) Alert.alert('Succès', 'Veuillez vérifier votre boîte mail pour confirmer votre inscription !');
        setLoading(false);
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Erreur', error.message);
    }

    if (session && session.user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Ionicons name="person-circle-outline" size={80} color="#3B82F6" />
                    <Text style={styles.title}>Mon Compte</Text>
                    <Text style={styles.subtitle}>Connecté en tant que</Text>
                    <Text style={styles.emailText}>{session.user.email}</Text>

                    <Pressable style={styles.logoutButton} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <LogoFaaS size={60} showBackground />
                <Text style={styles.title}>Bienvenue</Text>
                <Text style={styles.subtitle}>Connectez-vous pour gérer vos envois</Text>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Adresse email"
                            placeholderTextColor="#64748B"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mot de passe"
                            placeholderTextColor="#64748B"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.buttonsContainer}>
                        <Pressable style={styles.primaryButton} onPress={signInWithEmail} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Se connecter</Text>}
                        </Pressable>

                        <Pressable style={styles.secondaryButton} onPress={signUpWithEmail} disabled={loading}>
                            <Text style={styles.secondaryButtonText}>Créer un compte</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0C10',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F8FAFC',
        marginTop: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 40,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3B82F6',
        marginTop: 8,
        marginBottom: 40,
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        gap: 16,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#13151A',
        borderWidth: 1,
        borderColor: '#1F232D',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#F8FAFC',
        fontSize: 16,
    },
    buttonsContainer: {
        marginTop: 16,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#3B82F6',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F232D',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    logoutButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
});
