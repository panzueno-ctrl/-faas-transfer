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
import ActionCard from '../components/ActionCard';
import LogoFaaS from '../components/LogoFaaS';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

// On détecte la largeur de l'écran pour adapter la navigation
// isTablet = true si l'écran est >= 768px (tablette ou desktop)
const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function HomeScreen() {

  // Pour naviguer vers d'autres écrans
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors, isDark);

  // Contrôle l'ouverture du menu hamburger sur mobile
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Items du menu de navigation latéral
  const MENU_ITEMS = [
    { icon: 'send-outline', label: t('home.send'), route: '/send' },
    { icon: 'download-outline', label: t('home.receive'), route: '/receive' },
    { icon: 'repeat-outline', label: t('home.convert'), route: '/convert' },
    { icon: 'time-outline', label: t('home.history'), route: '/history' },
    { icon: 'person-outline', label: t('auth.account'), route: '/auth' },
    { icon: 'settings-outline', label: t('home.settings'), route: '/settings' },
  ];

  // Cards d'actions rapides affichées sur l'accueil
  const QUICK_ACTIONS = [
    {
      icon: 'send-outline',
      title: t('send.new_transfer'),
      description: t('send.subtitle'),
      route: '/send',
      color: colors.primary,
    },
    {
      icon: 'download-outline',
      title: t('home.receive'),
      description: t('send.scan'),
      route: '/receive',
      color: colors.primary,
    },
    {
      icon: 'repeat-outline',
      title: t('home.convert'),
      description: t('home.convert_desc'),
      route: '/convert',
      color: colors.primary,
    },
  ];

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
                  <Ionicons name="close-outline" size={24} color={colors.text} />
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
                        <Ionicons name={item.icon as any} size={24} color={hovered ? colors.primary : colors.textMuted} />
                        <Text style={[styles.menuLabel, hovered && { color: colors.text }]}>{item.label}</Text>
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
              <Ionicons name="menu-outline" size={32} color={colors.primary} />
            </Pressable>
          )}

          {/* Bouton hamburger — mobile uniquement */}
          {!isTablet && (
            <Pressable
              style={styles.hamburgerButton}
              onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu-outline" size={32} color={colors.primary} />
            </Pressable>
          )}

          {/* ── Titre de l'app ── */}
          <View style={styles.hero}>
            <View style={styles.titleRow}>
              <Text style={styles.appName}>FaaS</Text>
              <Text style={styles.appNameAccent}>Transfer</Text>
            </View>
            <Text style={styles.appTagline}>
              {t('home.subtitle')}
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
                style={styles.actionCard} 
                compact={true} 
              />
            ))}
          </View>

          {/* ── Section bienvenue / fichiers récents ── */}
          <Pressable 
            style={({ pressed, hovered }: any) => [
                styles.welcomeContainer,
                (pressed || hovered) && styles.welcomeContainerHovered
            ]}
            onPress={() => router.push('/send' as any)}>
            {({ pressed, hovered }: any) => (
              <>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="folder-open-outline" size={40} color={colors.primary} />
                </View>

                <Text style={styles.welcomeTitle}>{t('home.welcome_title')}</Text>
                <Text style={styles.welcomeSubtitle}>
                  {t('home.welcome_subtitle')}
                </Text>

                <View style={[
                  styles.ctaButton, 
                  (pressed || hovered) && styles.ctaButtonHovered
                ]}>
                  <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                  <Text style={[styles.ctaButtonText, (pressed || hovered) && { color: '#ffffff' }]}>
                    {t('home.welcome_cta')}
                  </Text>
                </View>
              </>
            )}
          </Pressable>

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
                  color={colors.primary}
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, 
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280, 
    backgroundColor: isDark ? '#060709' : '#FFFFFF', 
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderRightWidth: 1,
    borderRightColor: colors.border, 
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  logoText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },
  logoTextHighlight: {
    color: colors.primary,
  },
  sidebarTitle: {
    color: colors.textSubtle,
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
    borderLeftColor: 'transparent', 
  },
  menuItemHovered: {
    backgroundColor: colors.glow, 
    borderLeftColor: colors.primary, 
  },
  menuItemPressed: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  menuLabel: {
    color: colors.textMuted, 
    fontSize: 16,
    fontWeight: '600',
  },
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
    backgroundColor: colors.glow,
    shadowColor: colors.primary,
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
    flexGrow: 1,            
    justifyContent: 'center'
  },
  hamburgerButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.glow,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
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
    color: colors.text,
    letterSpacing: -2,
  },
  appNameAccent: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.primary, 
    letterSpacing: -2,
  },
  appTagline: {
    fontSize: 18,
    color: colors.textMuted, 
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: 340,
  },
  welcomeContainer: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.primary,
    shadowColor: isDark ? '#000000' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    transitionDuration: '0.2s',
  },
  welcomeContainerHovered: {
    borderColor: colors.primary,
    borderTopColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    transform: [{ translateY: -2 }],
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.glow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardHovered, 
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaButtonHovered: {
    backgroundColor: colors.primary, 
  },
  ctaButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
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
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 48,
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
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
    backgroundColor: colors.glow, 
    borderWidth: 1,
    borderColor: colors.border,
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
