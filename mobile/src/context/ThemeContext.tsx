import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemeType = 'light' | 'dark' | 'system';

interface Colors {
    background: string;
    card: string;
    cardHovered: string;
    border: string;
    primary: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    danger: string;
    success: string;
    glow: string;
}

const darkColors: Colors = {
    background: '#0B0C10',
    card: '#13151A',
    cardHovered: '#1E2433',
    border: '#1F232D',
    primary: '#3B82F6',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textSubtle: '#475569',
    danger: '#EF4444',
    success: '#4caf50',
    glow: 'rgba(59, 130, 246, 0.03)',
};

const lightColors: Colors = {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardHovered: '#F1F5F9',
    border: '#E2E8F0',
    primary: '#3B82F6',
    text: '#0F172A',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    danger: '#EF4444',
    success: '#10B981',
    glow: 'rgba(59, 130, 246, 0.05)',
};

interface ThemeContextType {
    theme: ThemeType;
    isDark: boolean;
    colors: Colors;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    isDark: true,
    colors: darkColors,
    setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('dark');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('faas_theme');
                if (savedTheme) {
                    setThemeState(savedTheme as ThemeType);
                } else {
                    setThemeState('system');
                }
            } catch (e) {
                console.log('Erreur de chargement du thème', e);
            }
            setIsMounted(true);
        };
        loadTheme();
    }, []);

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('faas_theme', newTheme);
        } catch (e) {
            console.log('Erreur de sauvegarde du thème', e);
        }
    };

    const isDark = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
    const colors = isDark ? darkColors : lightColors;

    // Évite le "flash" de couleur incorrecte avant le chargement d'AsyncStorage
    if (!isMounted) return null;

    return (
        <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
