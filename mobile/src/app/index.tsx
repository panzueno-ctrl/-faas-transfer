/**
 * app/index.tsx
 *
 * Écran d'accueil de l'application FaaS Transfer.
 * Layout : menu vertical à gauche + contenu principal à droite
 * Tab bar en bas pour les actions essentielles.
 */

import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

// On détecte la taille de l'écran
const { width } = Dimensions.get('window');
const isTablet = width >= 768;


// Items du menu gauche
const MENU_ITEMS = [
  { icon: 'send-outline', label: 'Envoyer', route: '/send' },
  { icon: 'download-outline', label: 'Recevoir', route: '/receive' },
  { icon: 'repeat-outline', label: 'Convertir', route: '/convert' },
  { icon: 'time-outline', label: 'Historique', route: '/history' },
  { icon: 'settings-outline', label: 'Paramètres', route: '/settings' },
];


export default function HomeScreen() {

  const router = useRouter();

  // Contrôle l'ouverture du menu hamburger sur mobile
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>

        {/* Bouton hamburger — visible uniquement sur mobile */}
        {!isTablet && (
          <Pressable
            style={styles.hamburgerButton}
            onPress={() => setMenuOpen(true)}>
            <Ionicons name="menu-outline" size={28} color="#ffffff" />
          </Pressable>
        )}

        {/* ── Menu gauche — visible seulement sur web/tablette ── */}
        {isTablet && (
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Menu</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => router.push(item.route as any)}>
                  <Ionicons name={item.icon as any} size={22} color="#aaaaaa" />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Contenu principal ── */}
        <View style={styles.main}>

          {/* Nom de l'app */}
          <View style={styles.hero}>
            <Text style={styles.appName}>FaaS</Text>
            <Text style={styles.appNameAccent}>Transfer</Text>
            <Text style={styles.appTagline}>
              Transférez et convertissez{'\n'}vos fichiers sans limites
            </Text>
          </View>

          {/* Stats rapides */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Envoyés</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Reçus</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Convertis</Text>
            </View>
          </View>

          {/* Message fichiers récents */}
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Fichiers récents</Text>
            <Text style={styles.emptyText}>Aucun fichier récent</Text>
          </View>

        </View>

        {/* Menu overlay — visible sur mobile quand hamburger est cliqué */}
        {!isTablet && menuOpen && (
          <Pressable
            style={styles.overlay}
            onPress={() => setMenuOpen(false)}>
            <View style={styles.mobileMenu}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.route}
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(item.route as any);
                  }}>
                  <Ionicons name={item.icon as any} size={22} color="#aaaaaa" />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Layout principal — sidebar gauche + contenu droite
  layout: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Sidebar gauche ──
  sidebar: {
    width: 110,
    backgroundColor: '#111111',
    paddingTop: 24,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#222222',
  },

  sidebarTitle: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  menuItem: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
    gap: 6,
  },

  menuItemPressed: {
    backgroundColor: '#222222',
  },

  menuIcon: {
    fontSize: 22,
  },

  menuLabel: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  hamburgerButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },

  // ── Contenu principal ──
  main: {
    flex: 1,
    padding: 24,
    gap: 24,
  },

  // Hero section
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
  },

  appNameAccent: {
    fontSize: 48,
    fontWeight: '900',
    color: '#4a9eff',
    letterSpacing: -2,
    marginTop: -16,
  },

  appTagline: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a9eff',
  },

  statLabel: {
    fontSize: 11,
    color: '#666666',
  },

  // Fichiers récents
  recentContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },

  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  emptyText: {
    color: '#444444',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },

  // Overlay sombre derrière le menu mobile
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 100,
    flexDirection: 'row',
  },

  // Menu mobile qui s'ouvre depuis la gauche
  mobileMenu: {
    width: 200,
    backgroundColor: '#111111',
    padding: 24,
    paddingTop: 48,
    gap: 8,
  },

});
