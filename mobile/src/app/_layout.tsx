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

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import AuthScreen from './auth';

function RootContent() {
  const { isDark, colors } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Si on revient d'une connexion OAuth (Google/Microsoft), l'URL contient un token.
    // Il faut attendre que Supabase parse ce token et déclenche onAuthStateChange
    // avant d'arrêter le loader, sinon la page de connexion flashe à l'écran.
    const isOAuthRedirect = typeof window !== 'undefined' && 
      (window.location.hash.includes('access_token=') || window.location.hash.includes('error='));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // On arrête le loader uniquement si ce n'est pas un retour OAuth
      // ou si on a déjà une session valide.
      if (!isOAuthRedirect || session) {
        setIsCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Quand l'événement est reçu (ex: SIGNED_IN après OAuth), on arrête le loader
      setIsCheckingAuth(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Head>
          <title>FaaS Transfer - Connexion</title>
        </Head>
        <AuthScreen />
        <Toast />
      </NavigationThemeProvider>
    );
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Head>
        <title>FaaS Transfer - Partage & Conversion de Fichiers Instantané</title>
        <meta name="description" content="Envoyez, recevez et convertissez vos fichiers (PDF, Vidéos, Audio, Images) instantanément et gratuitement. La solution tout-en-un pour vos transferts et traitements de documents." />
        <meta property="og:title" content="FaaS Transfer - Partage & Conversion de Fichiers Instantané" />
        <meta property="og:description" content="Envoyez, recevez et convertissez vos fichiers (PDF, Vidéos, Audio, Images) instantanément et gratuitement. La solution tout-en-un pour vos transferts et traitements de documents." />
        <meta property="og:image" content="https://faas-transfer.vercel.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="theme-color" content={isDark ? '#0B0C10' : '#F8FAFC'} />
        <meta name="google-site-verification" content="5QQjlFYYE2uBKBIyS4rk2fbbXgjY2ehB7B5JN63Cp2w" />
        <meta name="google" content="notranslate" />
        <meta name="keywords" content="faas transfer, faas transfers, fast transfer, we transfer, application pour transférer des fichiers, application pour envoyer des fichiers, application pour envoyer un fichier d'un téléphone vers un autre, application pour convertir des fichiers, convertisseur de fichier, app to transfer files, app to send files, app to send files from phone to phone, app to convert files, file converter app, app per trasferire file, app per inviare file, app per convertire file, convertitore di file, transfert de fichier, envoyer gros fichiers gratuit, wetransfer alternatif" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "FaaS Transfer",
            "url": "https://faas-transfer.vercel.app/",
            "description": "Envoyez, recevez et convertissez vos fichiers (PDF, Vidéos, Audio, Images) instantanément, gratuitement et sans création de compte.",
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


