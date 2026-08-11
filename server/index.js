/**
 * index.js
 * 
 * Point d'entrée du serveur Express.
 * C'est ici que le serveur démarre et écoute les requêtes HTTP.
 * On y connecte toutes les routes de l'application.
 

 
 * Ce que ce fichier fait concrètement :
 *  - Crée le serveur Express
 *  - Le configure pour lire le JSON
 *  - Ajoute une route de test
 *  - Le démarre sur le port 3000
 */




// On importe Express — le framework qui gère les requêtes HTTP
const express = require('express');

// On importe cors — permet aux autres origines (l'app mobile)
// de communiquer avec le serveur sans être bloquées par le navigateur
const cors = require('cors');

// On importe le port depuis notre fichier de configuration
const { port } = require('./config/env');

// On crée l'application Express
const app = express();

// On configure CORS avant toutes les routes
// Sans ça le navigateur bloque les réponses du serveur
// origin: '*' autorise toutes les origines — à restreindre en production
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// On dit à Express de lire le JSON dans les requêtes
// Sans ça on ne peut pas lire le body d'une requête POST
app.use(express.json({ limit: '50mb' }));

// --- SECURITY: Rate Limiting & Basic Headers ---
const requestCounts = new Map();
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const max = 150; // 150 requêtes par minute max

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
        const data = requestCounts.get(ip);
        if (now > data.resetTime) {
            data.count = 1;
            data.resetTime = now + windowMs;
        } else {
            data.count++;
            if (data.count > max) {
                return res.status(429).json({ message: "Trop de requêtes, veuillez patienter." });
            }
        }
    }
    
    // Equivalent basique de Helmet pour contrer certaines attaques
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
});
// ----------------------------------------------

// Route de test pour vérifier que le serveur tourne
// Quand tu vas sur http://localhost:3000 tu vois "Serveur FaaS actif"
app.get('/', (req, res) => {
    res.send('Serveur FaaS actif ✅');
});

// On importe le router upload et on l'assigne à la route /upload
const uploadRouter = require('./routes/upload');
app.use('/upload', uploadRouter);

// On importe le router download et on l'assigne à la route /download
const downloadRouter = require('./routes/download');
app.use('/download', downloadRouter);

// On importe le router expire et on l'assigne à la route /expire
const expireRouter = require('./routes/expire');
app.use('/expire', expireRouter);

// On importe le router convert et on l'assigne à la route /convert
const convertRouter = require('./routes/convert');
app.use('/convert', convertRouter);

// On importe et démarre le job de nettoyage automatique
// Ce job tourne en arrière plan et nettoie les fichiers expirés chaque jour
require('./services/cleanup');

// On démarre le serveur sur le port défini dans .env
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});

// --- GESTION GLOBALE DES ERREURS ---
// Empêche le serveur de crasher complètement en cas d'erreur asynchrone non gérée
process.on('unhandledRejection', (reason, promise) => {
    console.error('Erreur non gérée (Unhandled Rejection):', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Erreur fatale (Uncaught Exception):', error);
});
// -----------------------------------
