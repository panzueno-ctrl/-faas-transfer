/**
 * middlewares/fileHandler.js
 *
 * Middleware de validation des fichiers uploadés.
 * Vérifie la taille et le type du fichier avant
 * de le laisser passer vers l'endpoint /upload.
 * Les erreurs sont retournées en messages simples
 * pour l'utilisateur — pas de messages techniques.
 */

// Taille maximale autorisée — 10 GB en bytes
// 10 * 1024 * 1024 * 1024 = 10 737 418 240 bytes
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;

// Types de fichiers autorisés
// On accepte tout type de fichier pour le transfert
// Seule la taille est vérifiée pour la V1
const validateFile = (req, res, next) => {

    // Si aucun fichier reçu → on laisse l'endpoint gérer cette erreur
    if (!req.file) {
        return next();
    }

    // On vérifie la taille du fichier
    if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
            message: 'Ce fichier est trop volumineux. La taille maximale est de 50 MB.'
        });
    }

    // Tout est bon → on passe au prochain middleware ou à l'endpoint
    next();

};

// On exporte le middleware
module.exports = validateFile;