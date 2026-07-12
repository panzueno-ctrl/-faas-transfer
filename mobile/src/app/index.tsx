/**
 * app/index.tsx
 *
 * Écran d'accueil de l'application FaaS Transfer.
 * Design sobre et élégant — menu gauche, titre centré,
 * actions rapides en cards et section bienvenue avec CTA.
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// On détecte la largeur de l'écran pour adapter la navigation
// isTablet = true si l'écran est >= 768px (tablette ou desktop)
const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Items du menu de navigation latéral
const MENU_ITEMS = [
  { icon: 'send-outline', label: 'Envoyer', route: '/send' },
  { icon: 'download-outline', label: 'Recevoir', route: '/receive' },
  { icon: 'repeat-outline', label: 'Convertir', route: '/convert' },
  { icon: 'time-outline', label: 'Récents', route: '/history' },
  { icon: 'settings-outline', label: 'Paramètres', route: '/settings' },
];

// Cards d'actions rapides affichées sur l'accueil
const QUICK_ACTIONS = [
  {
    icon: 'send-outline',
    title: 'Nouveau Transfert',
    description: 'Sélectionnez vos fichiers et envoyez-les',
    route: '/send',
    color: '#4a9eff',
  },
  {
    icon: 'download-outline',
    title: 'Boîte de Réception',
    description: 'Accédez à vos fichiers reçus',
    route: '/receive',
    color: '#4a9eff',
  },
  {
    icon: 'repeat-outline',
    title: 'Conversion rapide',
    description: 'Changez le format de vos documents',
    route: '/convert',
    color: '#4a9eff',
  },
];


export default function HomeScreen() {

  // Pour naviguer vers d'autres écrans
  const router = useRouter();

  // Contrôle l'ouverture du menu hamburger sur mobile
  const [menuOpen, setMenuOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>

        {/* ── Sidebar gauche — visible sur tablette/desktop ── */}
        {isTablet && (
          <View style={[styles.sidebar, !sidebarOpen && styles.sidebarClosed]}>

            {sidebarOpen && (
              <>
                {/* Bouton fermer en haut à droite */}
                <Pressable
                  style={styles.closeSidebar}
                  onPress={() => setSidebarOpen(false)}>
                  <Ionicons name="close-outline" size={24} color="#ffffff" />
                </Pressable>

                {/* Logo F */}
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>F</Text>
                </View>

                {/* MENU  */}
                <Text style={styles.sidebarTitle}>MENU</Text>

                {/* Items navigation */}
                {MENU_ITEMS.map((item) => (
                  <Pressable
                    key={item.route}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemHovered,
                    ]}
                    onPress={() => router.push(item.route as any)}>
                    <Ionicons name={item.icon as any} size={22} color="#4a9eff" />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </>
            )}

          </View>
        )}

        {/* ── Contenu principal ── */}
        <ScrollView
          style={styles.main}
          contentContainerStyle={styles.mainContent}
          showsVerticalScrollIndicator={false}>

          {isTablet && !sidebarOpen && (
            <Pressable
              style={styles.openSidebar}
              onPress={() => setSidebarOpen(true)}>
              <Ionicons name="menu-outline" size={24} color="#ffffff" />
            </Pressable>
          )}

          {/* Bouton hamburger — mobile uniquement */}
          {!isTablet && (
            <Pressable
              style={styles.hamburgerButton}
              onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu-outline" size={35} color="#4a9eff" />
            </Pressable>
          )}

          {/* ── Titre de l'app ── */}
          <View style={styles.hero}>
            <Text style={styles.appName}>FaaS</Text>
            <Text style={styles.appNameAccent}>Transfer</Text>
            <Text style={styles.appTagline}>
              Transférez et convertissez{'\n'}vos fichiers sans limites
            </Text>
          </View>

          {/* ── Actions rapides ── */}
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.route}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => router.push(action.route as any)}>

                {/* Icône de l'action */}
                <Ionicons name={action.icon as any} size={26} color={action.color} />

                {/* Titre et description */}
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </View>

              </Pressable>
            ))}
          </View>

          {/* ── Section bienvenue / fichiers récents ── */}
          <View style={styles.welcomeContainer}>

            {/* Icône dossier */}
            <View style={styles.welcomeIcon}>
              <Ionicons name="folder-open-outline" size={40} color="#4a9eff" />
            </View>

            <Text style={styles.welcomeTitle}>Bienvenue sur FaaS Transfer !</Text>
            <Text style={styles.welcomeSubtitle}>
              Vous n'avez pas encore de fichiers récents.
            </Text>

            {/* Bouton CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
              ]}
              onPress={() => router.push('/send' as any)}>
              <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
              <Text style={styles.ctaButtonText}>Commencer votre premier transfert</Text>
            </Pressable>

          </View>

        </ScrollView>

      </View>

      {/* ── Menu overlay hamburger — mobile uniquement ── */}
      {!isTablet && menuOpen && (
        <Pressable
          style={styles.overlay}
          onPress={() => setMenuOpen(false)}>
          <View style={styles.mobileMenu}>

            <Text style={styles.sidebarTitle}>MENU</Text>

            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.route}
                style={({ pressed, hovered }) => [
                  styles.menuItem,
                  (pressed || hovered) && styles.menuItemHovered,
                ]}
                onPress={() => router.push(item.route as any)}>
                <Ionicons
                  name={item.icon as any}
                  size={26}
                  color="#4a9eff"
                />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            ))}

          </View>
        </Pressable>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  // Conteneur principal
  container: {
    flex: 1,
    backgroundColor: '#0a0a0aff',
  },

  // Layout principal — sidebar + contenu
  layout: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Sidebar gauche ──
  sidebar: {
    width: 140,
    backgroundColor: '#111111',
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
    justifyContent: 'flex-start',
    gap: 0,
  },

  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a3a6a',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',   // ← centré
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4a9eff44',
  },

  logoText: {
    color: '#4a9eff',
    fontSize: 28,
    fontWeight: '900',
  },

  // Label MENU en haut de la sidebar
  sidebarTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 20,      // ← espace sous MENU avant les icônes
    paddingHorizontal: 4,
    textAlign: 'center',   // ← centré
  },

  menuLines: {
    gap: 4,
    width: 32,          // ← largeur fixe au lieu de paddingHorizontal
    marginBottom: 28,
  },

  menuLine: {
    height: 2,
    backgroundColor: '#333333',
    borderRadius: 2,
  },

  // Item de navigation
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 4,       // ← petit espace entre chaque item
  },

  menuItemHovered: {
    backgroundColor: '#1a2a3a',
  },

  // Item pressé — feedback visuel
  menuItemPressed: {
    backgroundColor: '#1a1a1a',
  },

  menuLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Contenu principal ──
  main: {
    flex: 1,
  },

  mainContent: {
    padding: 32,
    gap: 28,
    paddingBottom: 0,
    alignItems: 'center',
    flexGrow: 1,            // ← ajoute ça pour remplir l'espace
    justifyContent: 'center'
  },

  // Bouton hamburger sur mobile
  hamburgerButton: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    marginBottom: 4,
  },

  // ── Hero section ──
  hero: {
    alignItems: 'center',
    gap: 2,
  },

  appName: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,   // ← halo blanc autour de FaaS
  },

  // "Transfer" en bleu
  appNameAccent: {
    fontSize: 56,
    fontWeight: '900',
    color: '#4a9eff',
    letterSpacing: -2,
    marginTop: -8,
    textShadowColor: 'rgba(74,158,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,   // ← halo bleu autour de Transfer
  },

  appTagline: {
    fontSize: 15,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },

  // ── Grille des actions rapides ──
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },

  // Card d'action rapide
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    width: '30%',
    minWidth: 160,
    maxWidth: 300,
  },

  // Card pressée — légère mise en surbrillance
  actionCardPressed: {
    backgroundColor: '#1a2a3a',
    borderColor: '#4a9eff',
    transform: [{ scale: 1.02 }],
  },

  actionTextContainer: {
    flex: 1,
    gap: 3,
  },

  actionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },

  actionDescription: {
    color: '#555555',
    fontSize: 14,
    lineHeight: 18,
  },

  // ── Section bienvenue ──
  welcomeContainer: {
    width: '85%',
    maxWidth: 1900,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },

  welcomeIcon: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: '#0a1a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4a9eff22',
    marginBottom: 4,
  },

  welcomeTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#ffffff',
  },

  welcomeSubtitle: {
    fontSize: 15,
    color: '#444444',
    textAlign: 'center',
  },

  // Bouton CTA principal
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a2a3a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4a9eff44',
  },

  // CTA pressé
  ctaButtonPressed: {
    backgroundColor: '#1e3a5a',
    borderColor: '#4a9eff',
  },

  ctaButtonText: {
    color: '#4a9eff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Menu overlay mobile ──
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
    flexDirection: 'row',
  },

  mobileMenu: {
    width: 200,
    backgroundColor: '#111111',
    padding: 24,
    paddingTop: 48,
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
  },

  closeSidebar: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: 8,
  },

  openSidebar: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    margin: 16,
  },

  sidebarClosed: {
    width: 44,
    paddingHorizontal: 8,
  },

  toggleButton: {
    alignSelf: 'flex-end',
    padding: 6,
    marginBottom: 8,
  },

});






































