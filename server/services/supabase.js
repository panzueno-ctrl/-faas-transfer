/**
 * services/supabase.js
 * 
 * Crée et exporte la connexion à Supabase.
 * Ce fichier est le point d'entrée unique pour communiquer
 * avec la base de données et le stockage Supabase.
 * Les autres fichiers importent cette connexion sans la recréer.
 */




// On importe la fonction createClient depuis le package supabase
// Ce package a été installé via npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');



// On récupère l'URL et la KEY depuis config/env.js
// qui lui les lit depuis le fichier .env
const { supabaseUrl, supabaseKey } = require('../config/env');



// On crée la connexion Supabase avec nos credentials
// supabase est maintenant un objet connecté qu'on peut utiliser
// pour lire, écrire, stocker des fichiers
const supabase = createClient(supabaseUrl, supabaseKey);



// On exporte la connexion pour que les autres fichiers
// puissent l'utiliser sans recréer une connexion à chaque fois
module.exports = supabase;
