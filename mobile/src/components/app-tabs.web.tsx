/**
 * components/app-tabs.web.tsx
 *
 * Version web de la tab bar — s'affiche en haut sur navigateur.
 * Même logique que app-tabs.tsx mais adaptée pour le web.
 * 6 onglets : Accueil, Envoyer, Recevoir, Convertir, Historique, Paramètres
 */

import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

// On importe Dimensions pour détecter la taille de l'écran
import { Dimensions } from 'react-native';

// On récupère la largeur actuelle de l'écran
const { width } = Dimensions.get('window');

// Si la largeur est >= 768px c'est une tablette ou un écran web
// Sur mobile la largeur est généralement < 768px
const isTablet = width >= 768;

export default function AppTabs() {
  return (
    <Tabs>
      {/* Contenu de l'écran actif */}
      <TabSlot style={{ height: '100%' }} />

      {/* Barre de navigation en haut sur web */}
      <TabList asChild>
        <CustomTabList>

          {/* Onglet Accueil → src/app/index.tsx */}
          <TabTrigger name="home" href="/" asChild>
            <TabButton>🏠 Accueil</TabButton>
          </TabTrigger>

          {/* Onglet Envoyer → src/app/send.jsx */}
          <TabTrigger name="send" href="/send" asChild>
            <TabButton>📤 Envoyer</TabButton>
          </TabTrigger>

          {/* Onglet Recevoir → src/app/receive.jsx */}
          <TabTrigger name="receive" href="/receive" asChild>
            <TabButton>📥 Recevoir</TabButton>
          </TabTrigger>

          {/* Onglet Convertir → src/app/convert.jsx */}
          <TabTrigger name="convert" href="/convert" asChild>
            <TabButton>🔄 Convertir</TabButton>
          </TabTrigger>

          {/* Onglet Historique → src/app/history.jsx */}
          <TabTrigger name="history" href="/history" asChild>
            <TabButton>🕐 Historique</TabButton>
          </TabTrigger>

          {/* Onglet Paramètres → src/app/settings.jsx */}
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>⚙️ Paramètres</TabButton>
          </TabTrigger>

        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// Composant bouton d'onglet — s'affiche différemment selon si actif ou pas
export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

// Conteneur de toute la tab list — barre en haut de l'écran
export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>

        {/* Nom de l'application */}
        <ThemedText type="smallBold" style={styles.brandText}>
          FaaS Transfer
        </ThemedText>

        {/* Les onglets */}
        {props.children}

      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    height: isTablet ? 0 : 'auto',
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: isTablet ? 0 : Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});










