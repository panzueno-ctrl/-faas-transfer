import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import LogoFaaS from '../components/LogoFaaS';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [isLogin, setIsLogin] = useState(true);

    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    async function handleAuth() {
        if (!email || !password) return showAlert(t('common.error'), t('auth.empty_fields'));
        setLoading(true);

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) showAlert(t('common.error'), error.message);
        } else {
            const {
                data: { session },
                error,
            } = await supabase.auth.signUp({
                email: email,
                password: password,
            });
            if (error) showAlert(t('common.error'), error.message);
            else if (!session) showAlert(t('common.success'), t('auth.check_email'));
        }
        
        setLoading(false);
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) showAlert(t('common.error'), error.message);
    }

    if (session && session.user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
                    <Text style={styles.title}>{t('auth.account')}</Text>
                    <Text style={styles.subtitle}>{t('auth.logged_in_as')}</Text>
                    <Text style={styles.emailText}>{session.user.email}</Text>

                    <Pressable style={styles.logoutButton} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                        <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <LogoFaaS size={60} showBackground />
                <Text style={styles.title}>{isLogin ? t('auth.login') : t('auth.signup')}</Text>
                <Text style={styles.subtitle}>{t('auth.login_subtitle')}</Text>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('auth.email')}
                            placeholderTextColor={colors.textSubtle}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('auth.password')}
                            placeholderTextColor={colors.textSubtle}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.buttonsContainer}>
                        <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{isLogin ? t('auth.login') : t('auth.signup')}</Text>}
                        </Pressable>

                        <Pressable style={styles.switchModeButton} onPress={() => setIsLogin(!isLogin)} disabled={loading}>
                            <Text style={styles.switchModeText}>
                                {isLogin ? t('auth.no_account') : t('auth.has_account')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        color: colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginBottom: 40,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
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
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
    },
    buttonsContainer: {
        marginTop: 16,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: colors.primary,
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
    switchModeButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    switchModeText: {
        color: colors.primary,
        fontSize: 14,
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
        color: colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
});
