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

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {headNodes}

        {/* --- DÉBUT SEO PROFESSIONNEL FAAS TRANSFER --- */}
        <title>FaaS Transfer - Partage & Conversion de Fichiers Rapide</title>
        <meta name="description" content="FaaS Transfer est la solution gratuite et sécurisée pour envoyer de gros fichiers (fast transfer) et convertir ou éditer vos documents (PDF, images, audio, vidéo). Alternative rapide et sans limite." />
        <meta name="keywords" content="faas transfer, fast transfer, fast transfer app, transfert de fichiers, envoyer de gros fichiers, conversion pdf, compresser pdf, fusionner pdf, wetransfer alternatif, smallpdf gratuit, ocr gratuit, partager fichier en ligne, envoi lourd" />
        <meta name="author" content="FaaS Transfer" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://faas-transfer.vercel.app/" />
        <meta property="og:title" content="FaaS Transfer - Partage & Conversion de Fichiers" />
        <meta property="og:description" content="Envoyez vos fichiers volumineux rapidement (fast transfer) et utilisez nos outils PDF professionnels gratuitement." />
        <meta property="og:image" content="https://faas-transfer.vercel.app/og-image.png" />
        <meta property="og:site_name" content="FaaS Transfer" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://faas-transfer.vercel.app/" />
        <meta property="twitter:title" content="FaaS Transfer - Partage & Conversion de Fichiers" />
        <meta property="twitter:description" content="Envoyez de gros fichiers et convertissez vos documents gratuitement en un éclair." />
        <meta property="twitter:image" content="https://faas-transfer.vercel.app/og-image.png" />

        {/* Structured Data / JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "FaaS Transfer",
              "alternateName": ["Fast Transfer", "FaaS Transfer App"],
              "url": "https://faas-transfer.vercel.app/",
              "description": "Plateforme gratuite pour envoyer des fichiers volumineux et convertir des PDF ou médias en ligne.",
              "applicationCategory": "UtilitiesApplication",
              "operatingSystem": "All"
            })
          }}
        />
        {/* --- FIN SEO PROFESSIONNEL --- */}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
