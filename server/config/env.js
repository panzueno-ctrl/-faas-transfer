/**
 * config/env.js
 * 
 * Centralise toutes les variables d'environnement du projet.
 * Les valeurs sensibles (clés, URLs) sont stockées dans le fichier .env
 * et ne sont jamais exposées dans le code ou sur GitHub.
 */




// On exporte la connexion pour que les autres fichiers
// puissent l'utiliser sans recréer une connexion à chaque fois
require('dotenv').config();



// On exporte un objet qui centralise toutes les variables d'environnement
// Comme ça tous les autres fichiers importent depuis ici
// au lieu d'appeler process.env directement partout
module.exports = {
  // L'URL de ton projet Supabase — l'adresse du serveur Supabase 
  supabaseUrl: process.env.SUPABASE_URL,


  // La clé publique Supabase — le badge d'accès à ton projet
  supabaseKey: process.env.SUPABASE_KEY,



  // Le port sur lequel Express va écouter les requêtes
  // Si PORT n'est pas défini dans .env, on utilise 3000 par défaut
  port: process.env.PORT || 3000
};
