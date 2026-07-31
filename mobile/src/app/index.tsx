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
import * as DocumentPicker from 'expo-document-picker';
import ActionCard from '../components/ActionCard';
import LogoFaaS from '../components/LogoFaaS';

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

                {/* Logo FaaS */}
                <View style={styles.logoContainer}>
                  <LogoFaaS size={44} showBackground={true} />
                  <Text style={styles.logoText}>
                    FaaS <Text style={styles.logoTextHighlight}>Transfer</Text>
                  </Text>
                </View>

                {/* MENU  */}
                <Text style={styles.sidebarTitle}>MENU</Text>

                {/* Items navigation */}
                {MENU_ITEMS.map((item) => (
                  <Pressable
                    key={item.route}
                    style={({ pressed, hovered }: any) => [
                      styles.menuItem,
                      hovered && styles.menuItemHovered,
                      pressed && styles.menuItemPressed,
                    ]}
                    onPress={() => router.push(item.route as any)}>
                    {({ hovered }: any) => (
                      <>
                        <Ionicons name={item.icon as any} size={24} color={hovered ? "#3B82F6" : "#64748B"} />
                        <Text style={[styles.menuLabel, hovered && { color: "#F8FAFC" }]}>{item.label}</Text>
                      </>
                    )}
                  </Pressable>
                ))}
              </>
            )}

          </View>
        )}

        {/* ── Contenu principal ── */}
        <View style={styles.mainWrapper}>
          
          {/* Effet d'orbe / arc lumineux (Le fameux cercle !) */}
          <View style={styles.backgroundGlow} pointerEvents="none" />

          <ScrollView
            style={styles.main}
            contentContainerStyle={styles.mainContent}
            showsVerticalScrollIndicator={false}>

          {isTablet && !sidebarOpen && (
            <Pressable
              style={styles.openSidebar}
              onPress={() => setSidebarOpen(true)}>
              <Ionicons name="menu-outline" size={32} color="#4a9eff" />
            </Pressable>
          )}

          {/* Bouton hamburger — mobile uniquement */}
          {!isTablet && (
            <Pressable
              style={styles.hamburgerButton}
              onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu-outline" size={32} color="#4a9eff" />
            </Pressable>
          )}

          {/* ── Titre de l'app ── */}
          <View style={styles.hero}>
            <View style={styles.titleRow}>
              <Text style={styles.appName}>FaaS</Text>
              <Text style={styles.appNameAccent}>Transfer</Text>
            </View>
            <Text style={styles.appTagline}>
              La manière la plus simple et sécurisée de transférer vos fichiers.
            </Text>
          </View>

          {/* ── Actions rapides ── */}
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <ActionCard
                key={action.route}
                icon={action.icon as any}
                title={action.title}
                description={action.description}
                onPress={() => router.push(action.route as any)}
                style={styles.actionCard} // Garde la largeur de 30% pour la grille
                compact={true} // Active le mode réduit (Option A) !
              />
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
    backgroundColor: '#0B0C10', // Deep Midnight
  },

  // Layout principal — sidebar + contenu
  layout: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Sidebar gauche ──
  sidebar: {
    width: 280, // Plus large pour une vraie barre de navigation desktop
    backgroundColor: '#060709', // Pitch black pour la profondeur
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderRightWidth: 1,
    borderRightColor: '#1A1D24', // Bordure subtile
    justifyContent: 'flex-start',
    gap: 0,
  },

  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
    paddingHorizontal: 12,
  },

  logoIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#4a9eff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4a9eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  logoText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },

  logoTextHighlight: {
    color: '#3B82F6',
  },

  sidebarTitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 20,
    paddingHorizontal: 16,
    textAlign: 'left',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent', // Invisible by default
  },

  menuItemHovered: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)', // Fond léger bleu électrique
    borderLeftColor: '#3B82F6', // Marqueur bleu électrique à gauche
  },

  menuItemPressed: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },

  menuLabel: {
    color: '#94A3B8', // Slate 400 (plus doux que le blanc)
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Contenu principal ──
  mainWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  backgroundGlow: {
    position: 'absolute',
    top: -150,
    left: '50%',
    transform: [
      { translateX: -400 }
    ],
    width: 800,
    height: 800,
    borderRadius: 400,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 120,
    zIndex: 0,
  },

  main: {
    flex: 1,
    zIndex: 1,
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
    position: 'absolute',
    top: 24,
    left: 24,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#4a9eff44',
    zIndex: 10,
  },

  // ── Hero section ──
  hero: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
    marginTop: 20,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  appName: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
  },

  appNameAccent: {
    fontSize: 64,
    fontWeight: '900',
    color: '#3B82F6', // Electric Blue
    letterSpacing: -2,
  },

  appTagline: {
    fontSize: 18,
    color: '#94A3B8', // Slate 400
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── Grille des actions rapides ──
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },

  // Card d'action rapide (on ne garde QUE la largeur pour la grille)
  actionCard: {
    width: '30%',
    minWidth: 160,
    maxWidth: 300,
  },
  // 🧹 MÉNAGE: L'intérieur de la carte est géré par ActionCard.tsx !

  // ── Section bienvenue ──
  welcomeContainer: {
    width: '100%',
    maxWidth: 900,
    backgroundColor: '#13151A', // Premium Gunmetal
    borderRadius: 24,
    paddingVertical: 50,
    paddingHorizontal: 40,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    gap: 16,
    borderWidth: 1,
    borderColor: '#1F232D', // Subtle border
    borderTopColor: 'rgba(59, 130, 246, 0.4)', // Electric blue glow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },

  welcomeIcon: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 4,
  },

  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },

  welcomeSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Bouton CTA principal
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2433', // Fond interactif
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },

  // CTA pressé
  ctaButtonPressed: {
    backgroundColor: '#3B82F6', // Couleur primaire
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
    position: 'absolute',
    top: 32,
    left: 32,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.05)', // Fond transparent bleuté
    borderWidth: 1,
    borderColor: '#4a9eff44',
    zIndex: 10,
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






































