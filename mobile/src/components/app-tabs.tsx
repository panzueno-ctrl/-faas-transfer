/**
 * components/app-tabs.tsx
 *
 * Définit la navigation tab bar de l'application.
 * 6 onglets : Accueil, Envoyer, Recevoir, Convertir, Historique, Paramètres
 * S'adapte automatiquement au mode clair/sombre du téléphone.
 */

import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AppTabs() {
  // On détecte si l'utilisateur est en mode clair ou sombre
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        // Couleur de l'onglet actif
        tabBarActiveTintColor: colors.text,
        // On cache complètement la tab bar — navigation via le menu gauche
        tabBarStyle: { display: 'none' },
        // On cache le header en haut — chaque écran gère son propre titre
        headerShown: false,
      }}>

      {/* Onglet Accueil → src/app/index.tsx */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Envoyer → src/app/send.jsx */}
      <Tabs.Screen
        name="send"
        options={{
          title: 'Envoyer',
          tabBarLabel: 'Envoyer',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="send-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Recevoir → src/app/receive.jsx */}
      <Tabs.Screen
        name="receive"
        options={{
          title: 'Recevoir',
          tabBarLabel: 'Recevoir',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Convertir → src/app/convert.jsx */}
      <Tabs.Screen
        name="convert"
        options={{
          title: 'Convertir',
          tabBarLabel: 'Convertir',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="repeat-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Historique → src/app/history.jsx */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Paramètres → src/app/settings.jsx */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarLabel: 'Paramètres',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* Onglet Compte → src/app/auth.jsx */}
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Mon Compte',
          tabBarLabel: 'Mon Compte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}








