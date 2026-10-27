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
        
        <AuthScreen />
        <Toast />
      </NavigationThemeProvider>
    );
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      

      <AnimatedSplashOverlay />
      <AppTabs />
      <Toast />
    </NavigationThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <Head>
        <title>Fast Transfer (FaaS Transfer) - Partage &amp; Conversion de Fichiers Gratuit</title>
        <meta name="description" content="Fast Transfer (anciennement FaaS Transfer) : envoyez, recevez et convertissez vos fichiers (47 outils PDF, vidéos, audio, images) instantanément et gratuitement. Alternative rapide à WeTransfer." />
        <meta property="og:title" content="Fast Transfer (FaaS Transfer) - Partage &amp; Conversion de Fichiers" />
        <meta property="og:description" content="Fast Transfer (anciennement FaaS Transfer) : envoyez, recevez et convertissez vos fichiers instantanément et gratuitement." />
        <meta property="og:image" content="https://faas-transfer.vercel.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="theme-color" content="#208AEF" />
        <meta name="google-site-verification" content="5QQjlFYYE2uBKBIyS4rk2fbbXgjY2ehB7B5JN63Cp2w" />
        <meta name="google" content="notranslate" />
        <meta name="keywords" content="fast transfer, fast transfer app, faas transfer, faas-transfer, fast-transfer, transfert de fichiers, envoyer de gros fichiers, conversion pdf, compresser pdf, fusionner pdf, wetransfer alternatif, smallpdf gratuit, ocr gratuit, partager fichier en ligne, envoi lourd" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Fast Transfer",
            "alternateName": ["Fast Transfer App", "FaaS Transfer", "faas-transfer", "FastTransfer"],
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
      <RootContent />
    </ThemeProvider>
  );
}


