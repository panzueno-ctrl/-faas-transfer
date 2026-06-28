/**
 * app/_layout.tsx
 *
 * Point d'entrée de l'application — chef d'orchestre.
 * Configure le thème global (clair/sombre) et lance la navigation.
 * Le composant Toast est placé ici pour être disponible
 * dans tous les écrans de l'app.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
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

      {/* Animation au démarrage de l'app */}
      <AnimatedSplashOverlay />

      {/* Navigation principale avec la tab bar */}
      <AppTabs />

      {/* Toast doit être placé en dernier pour s'afficher par dessus tout */}
      <Toast />

    </ThemeProvider>
  );
}


