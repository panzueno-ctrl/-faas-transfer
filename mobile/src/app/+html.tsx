// Learn more https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {

  // This is only required for server-side rendering.
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="fr" translate="no" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* --- BALISES SEO PRINCIPALES (Placées en premier pour les robots Google) --- */}
        <title>Fast Transfer (FaaS Transfer) - Partage &amp; Conversion de Fichiers Gratuit</title>
        <link rel="canonical" href="https://faas-transfer.vercel.app/" />
        <meta name="description" content="Fast Transfer (anciennement FaaS Transfer) est l'application gratuite et sécurisée pour envoyer de gros fichiers instantanément et convertir tous vos documents en ligne (47 outils PDF, compression vidéo FFmpeg, audio, images). Sans inscription." />
        <meta name="keywords" content="fast transfer, fast transfer app, faas transfer, faas-transfer, fast-transfer, application transfert de fichiers, envoyer gros fichiers gratuit, convertisseur pdf, compresser video mp4, couper video, fusionner pdf, signer pdf en ligne, alternative wetransfer" />
        <meta name="author" content="Fast Transfer" />
        <meta name="google-site-verification" content="3cf30b6634371ac0" />
        <meta name="google-site-verification" content="google3cf30b6634371ac0" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://faas-transfer.vercel.app/" />
        <meta property="og:title" content="Fast Transfer (FaaS Transfer) - Partage &amp; Conversion de Fichiers" />
        <meta property="og:description" content="Envoyez vos fichiers volumineux rapidement (Fast Transfer) et profitez de 47 outils professionnels de conversion PDF, vidéo et audio gratuits." />
        <meta property="og:image" content="https://faas-transfer.vercel.app/og-image.png" />
        <meta property="og:image:alt" content="Fast Transfer - Application de partage et conversion de fichiers" />
        <meta property="og:site_name" content="Fast Transfer" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://faas-transfer.vercel.app/" />
        <meta property="twitter:title" content="Fast Transfer (FaaS Transfer) - Partage &amp; Conversion de Fichiers" />
        <meta property="twitter:description" content="Envoyez de gros fichiers et convertissez vos documents gratuitement en un éclair avec Fast Transfer." />
        <meta property="twitter:image" content="https://faas-transfer.vercel.app/og-image.png" />

        {/* Structured Data / JSON-LD (Schema.org WebApplication & Organization) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Fast Transfer",
              "alternateName": [
                "Fast Transfer App",
                "FaaS Transfer",
                "faas-transfer",
                "FastTransfer",
                "Fast-Transfer"
              ],
              "url": "https://faas-transfer.vercel.app/",
              "applicationCategory": "UtilitiesApplication",
              "operatingSystem": "All",
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "description": "Fast Transfer (anciennement FaaS Transfer) est une plateforme web moderne et gratuite d'envoi de fichiers volumineux et de traitement documentaire tout-en-un (47 outils PDF, compression et découpage vidéo FFmpeg, compression audio, signatures collaboratives).",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              },
              "featureList": [
                "Envoi instantané de gros fichiers avec code à 6 chiffres",
                "Boîte à outils de 47 convertisseurs (PDF, Word, Excel, Images)",
                "Compression vidéo H.264 et audio MP3 avec FFmpeg",
                "Signature électronique collaborative multi-signataires"
              ]
            })
          }}
        />

        {/* Reset Expo ScrollView */}
        <ScrollViewStyleReset />

        {/* Nœuds de tête injectés dynamiquement par Expo */}
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {/* Contenu sémantique accessible et indexable dès le premier passage des robots */}
        <div
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
          aria-hidden="true"
        >
          <h1>Fast Transfer - Application de Partage et Conversion de Fichiers (anciennement FaaS Transfer)</h1>
          <p>
            Fast Transfer est la solution en ligne rapide, sécurisée et gratuite pour envoyer de gros fichiers
            et convertir tous types de médias (PDF, vidéo, audio, bureautique).
          </p>
          <nav>
            <a href="/send">Envoyer un gros fichier</a>
            <a href="/receive">Recevoir et télécharger un fichier</a>
            <a href="/convert">Convertisseur PDF, Vidéo et Audio (47 outils gratuits)</a>
          </nav>
        </div>

        <noscript>
          <div style={{ padding: '24px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h2>Fast Transfer (FaaS Transfer)</h2>
            <p>Pour utiliser pleinement toutes les fonctionnalités de Fast Transfer, veuillez activer JavaScript.</p>
            <p><a href="/convert">Accéder au convertisseur de fichiers</a></p>
          </div>
        </noscript>

        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
