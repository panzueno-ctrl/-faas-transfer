/**
 * app/_layout.tsx
 *
 * Point d'entrée de l'application — chef d'orchestre.
 * Configure le thème global (clair/sombre) et lance la navigation.
 * Le composant Toast est placé ici pour être disponible
 * dans tous les écrans de l'app.
 */

import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import Head from 'expo-router/head';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import Toast from 'react-native-toast-message';

import { ThemeProvider, useTheme } from '../context/ThemeContext';
import '../lib/i18n';

function RootContent() {
  const { isDark } = useTheme();

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Head>
        <title>FaaS Transfer - Partage de fichiers instantané</title>
        <meta name="description" content="Envoyez et recevez vos fichiers instantanément, gratuitement et sans création de compte. La solution la plus simple pour partager vos documents et images." />
        <meta property="og:title" content="FaaS Transfer - Partage de fichiers instantané" />
        <meta property="og:description" content="Envoyez et recevez vos fichiers instantanément, gratuitement et sans création de compte. La solution la plus simple pour partager vos documents et images." />
        <meta property="og:image" content="https://faas-transfer.vercel.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="theme-color" content={isDark ? '#0B0C10' : '#F8FAFC'} />
        <meta name="google-site-verification" content="5QQjlFYYE2uBKBIyS4rk2fbbXgjY2ehB7B5JN63Cp2w" />
        <meta name="google" content="notranslate" />
        <meta name="keywords" content="transfert de fichier, envoyer gros fichiers gratuit, convertisseur pdf en ligne, wetransfer alternatif, partage de document sans compte, hebergement fichier ephemere, convertir image en pdf" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "FaaS Transfer",
            "url": "https://faas-transfer.vercel.app/",
            "description": "Envoyez, recevez et convertissez vos fichiers instantanément, gratuitement et sans création de compte.",
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "All",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            }
          })}
        </script>
      </Head>

      <AnimatedSplashOverlay />
      <AppTabs />
      <Toast />
    </NavigationThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}


