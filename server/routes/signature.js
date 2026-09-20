const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialisation de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Anon key is fine if RLS allows inserts
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration de Nodemailer (SMTP)
// On utilise les variables d'environnement que l'utilisateur devra rajouter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Mot de passe d'application Gmail
    },
});

// Middleware Multer pour l'upload temporaire en mémoire
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

/**
 * POST /signature/send-requests
 * Reçoit un fichier PDF et une liste d'adresses e-mails
 * Uploade le fichier sur Supabase et génère des liens uniques
 */
router.post('/send-requests', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        let signers;
        
        try {
            signers = JSON.parse(req.body.signers); // [{ name: "Alice", email: "alice@test.com" }]
        } catch (e) {
            return res.status(400).json({ error: "Format des signataires invalide." });
        }

        if (!file || !signers || signers.length === 0) {
            return res.status(400).json({ error: "Fichier et signataires requis." });
        }

        // 1. Uploader le document sur Supabase Storage (bucket: signatures)
        const fileName = `doc_${Date.now()}_${uuidv4()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('signatures')
            .upload(fileName, file.buffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            console.error("Erreur upload Supabase:", uploadError);
            return res.status(500).json({ error: "Erreur lors de l'upload du document." });
        }

        // Récupérer l'URL publique
        const { data: publicUrlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(fileName);
        
        const originalFileUrl = publicUrlData.publicUrl;

        // 2. Créer l'entrée dans signature_documents
        const { data: docData, error: docError } = await supabase
            .from('signature_documents')
            .insert([{ original_file_url: originalFileUrl, status: 'pending' }])
            .select()
            .single();

        if (docError) {
            console.error("Erreur DB:", docError);
            return res.status(500).json({ error: "Erreur BDD." });
        }

        const documentId = docData.id;

        // 3. Créer les requêtes de signature pour chaque signataire
        const requestsToInsert = signers.map(s => ({
            document_id: documentId,
            signer_email: s.email,
            signer_name: s.name,
            status: 'pending',
            token: uuidv4() // Lien unique
        }));

        const { data: requestsData, error: requestsError } = await supabase
            .from('signature_requests')
            .insert(requestsToInsert)
            .select();

        if (requestsError) {
            console.error("Erreur DB:", requestsError);
            return res.status(500).json({ error: "Erreur BDD signataires." });
        }

        // 4. Envoyer les e-mails
        const frontUrl = process.env.FRONTEND_URL || 'http://localhost:8081'; // URL de l'app mobile/web
        
        for (const reqData of requestsData) {
            const signLink = `${frontUrl}/sign/${reqData.token}`;
            const mailOptions = {
                from: `"FaaS Transfer Signature" <${process.env.SMTP_USER}>`,
                to: reqData.signer_email,
                subject: "Demande de signature de document",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #3b82f6;">Demande de signature</h2>
                        <p>Bonjour ${reqData.signer_name},</p>
                        <p>On vous a envoyé un document à signer de toute urgence.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${signLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Examiner et signer le document</a>
                        </div>
                        <p style="color: #666; font-size: 12px;">Ce lien est unique et sécurisé. Ne le partagez pas avec d'autres personnes.</p>
                    </div>
                `
            };

            // On essaie d'envoyer, mais on ne bloque pas si le SMTP n'est pas configuré
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                try {
                    await transporter.sendMail(mailOptions);
                } catch (err) {
                    console.error("Erreur envoi email à", reqData.signer_email, err);
                }
            } else {
                console.log(`[SMTP non configuré] Simulation d'envoi à ${reqData.signer_email} : ${signLink}`);
            }
        }

        return res.json({ success: true, documentId, message: "Demandes envoyées avec succès." });

    } catch (error) {
        console.error('SIGNATURE_ERROR:', error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

module.exports = router;
