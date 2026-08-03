/**
 * app/_layout.tsx
 *
 * Point d'entrée de l'application — chef d'orchestre.
 * Configure le thème global (clair/sombre) et lance la navigation.
 * Le composant Toast est placé ici pour être disponible
 * dans tous les écrans de l'app.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

// On importe Toast pour afficher des messages temporaires dans toute l'app
import Toast from 'react-native-toast-message';

export default function TabLayout() {

  // On détecte si l'utilisateur est en mode clair ou sombre
  const colorScheme = useColorScheme();

  return (
    // ThemeProvider applique le bon thème à toute l'app automatiquement
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Balises SEO pour le référencement Google et le partage sur les réseaux */}
      <Head>
        <title>FaaS Transfer - Partage de fichiers instantané</title>
        <meta name="description" content="Envoyez et recevez vos fichiers instantanément, gratuitement et sans création de compte. La solution la plus simple pour partager vos documents et images." />
        <meta property="og:title" content="FaaS Transfer - Partage de fichiers instantané" />
        <meta property="og:description" content="Envoyez et recevez vos fichiers instantanément, gratuitement et sans création de compte. La solution la plus simple pour partager vos documents et images." />
        <meta name="theme-color" content={colorScheme === 'dark' ? '#000000' : '#ffffff'} />
      </Head>

      {/* Animation au démarrage de l'app */}
      <AnimatedSplashOverlay />

      {/* Navigation principale avec la tab bar */}
      <AppTabs />

      {/* Toast doit être placé en dernier pour s'afficher par dessus tout */}
      <Toast />

    </ThemeProvider>
  );
}


