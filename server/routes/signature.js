const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialisation de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Anon key is fine if RLS allows inserts
const supabase = createClient(supabaseUrl, supabaseKey);

// Email service configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_mt7zage';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_9rqclwh';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'wfUH1ka4iCmVHAT0V';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || 'MZhB82OiQppd-fZyGpXTK';

const createTransporter = () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000
    });
};

/**
 * Envoie un email de manière résiliente :
 * 1. EmailJS via HTTPS (Port 443, non bloqué par les hébergeurs cloud comme Render)
 * 2. Repli automatique sur Nodemailer SMTP (si disponible)
 */
async function sendSignatureEmail({ to_email, to_name, signLink, subject, htmlContent }) {
    // 1. Essai EmailJS (HTTPS REST API - hautement fiable en environnement Cloud)
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: EMAILJS_SERVICE_ID,
                    template_id: EMAILJS_TEMPLATE_ID,
                    user_id: EMAILJS_PUBLIC_KEY,
                    accessToken: EMAILJS_PRIVATE_KEY,
                    template_params: {
                        to_email: to_email,
                        to_name: to_name || 'Signataire',
                        signer_name: to_name || 'Signataire',
                        sign_link: signLink || '',
                        subject: subject || 'Demande de signature',
                        htmlContent: htmlContent
                    }
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                console.log(`[EmailJS] Email envoyé avec succès à ${to_email}`);
                return { success: true, provider: 'emailjs' };
            } else {
                const errText = await response.text();
                console.warn(`[EmailJS] Échec HTTP (${response.status}) pour ${to_email}:`, errText);
            }
        } catch (e) {
            console.warn(`[EmailJS] Erreur réseau pour ${to_email}:`, e.message);
        }
    }

    // 2. Repli Nodemailer SMTP
    const transporter = createTransporter();
    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"Fast Transfer" <${process.env.SMTP_USER}>`,
                to: to_email,
                subject: subject,
                html: htmlContent
            });
            console.log(`[SMTP] Email envoyé avec succès à ${to_email}`);
            return { success: true, provider: 'smtp' };
        } catch (err) {
            console.error(`[SMTP] Erreur envoi SMTP à ${to_email}:`, err.message);
        }
    }

    console.log(`[Simulation] Aucun service email n'a pu joindre ${to_email}. Lien: ${signLink}`);
    return { success: false, error: 'No email service succeeded' };
}

router.get('/test-email', async (req, res) => {
    const to = req.query.to || 'panzueno@gmail.com';
    const start = Date.now();
    const result = await sendSignatureEmail({
        to_email: to,
        to_name: 'Enoch Test',
        signLink: 'https://faas-transfer.vercel.app/convert',
        subject: 'Test Diagnostic Fast Transfer',
        htmlContent: '<p>Test de connectivité email Fast Transfer.</p>'
    });
    return res.json({
        duration: Date.now() - start,
        result,
        envEmailJS: !!EMAILJS_SERVICE_ID,
        envSMTP: !!process.env.SMTP_USER
    });
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

        // 4. Envoyer les e-mails en parallèle
        const frontUrl = process.env.FRONTEND_URL || 'https://faas-transfer.vercel.app';

        const sendAllEmails = async () => {
            await Promise.allSettled(requestsData.map(async (reqData) => {
                const signLink = `${frontUrl}/sign/${reqData.token}`;
                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #3b82f6;">Demande de signature</h2>
                        <p>Bonjour ${reqData.signer_name},</p>
                        <p>On vous a envoyé un document à signer de toute urgence.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${signLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Examiner et signer le document</a>
                        </div>
                        <p style="color: #666; font-size: 12px;">Ce lien est unique et sécurisé. Ne le partagez pas avec d'autres personnes.</p>
                    </div>
                `;

                return sendSignatureEmail({
                    to_email: reqData.signer_email,
                    to_name: reqData.signer_name,
                    signLink: signLink,
                    subject: "Demande de signature de document",
                    htmlContent: htmlContent
                });
            }));
        };

        // On attend au maximum 3.5 secondes pour expédier immédiatement les emails sans faire poireauter le client
        await Promise.race([
            sendAllEmails(),
            new Promise(resolve => setTimeout(resolve, 3500))
        ]);

        return res.json({ success: true, documentId, message: "Demandes envoyées avec succès." });

    } catch (error) {
        console.error('SIGNATURE_ERROR:', error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * GET /signature/request/:token
 * Récupère les infos d'une demande de signature via son token unique
 */
router.get('/request/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Récupérer la requête et les infos du document
        const { data, error } = await supabase
            .from('signature_requests')
            .select(`
                id,
                signer_email,
                signer_name,
                status,
                document_id,
                signature_documents (
                    id,
                    original_file_url,
                    status
                )
            `)
            .eq('token', token)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: "Demande introuvable ou invalide." });
        }

        if (data.status === 'signed') {
            return res.status(400).json({ error: "Ce document a déjà été signé par vos soins.", alreadySigned: true });
        }

        return res.json(data);

    } catch (error) {
        console.error('SIGNATURE_ERROR:', error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * POST /signature/complete-request
 * Enregistre la signature apposée par l'utilisateur (dessin ou image)
 */
router.post('/complete-request', async (req, res) => {
    try {
        const { token, signatureBase64, pageIndex, x, y } = req.body;

        if (!token || !signatureBase64) {
            return res.status(400).json({ error: "Token et signature requis." });
        }

        // 1. Récupérer la requête associée
        const { data: requestData, error: reqError } = await supabase
            .from('signature_requests')
            .select(`
                id,
                status,
                document_id,
                signature_documents (
                    id,
                    original_file_url
                )
            `)
            .eq('token', token)
            .single();

        if (reqError || !requestData) {
            return res.status(404).json({ error: "Demande introuvable." });
        }

        if (requestData.status === 'signed') {
            return res.status(400).json({ error: "Ce document a déjà été signé." });
        }

        // 2. Enregistrer la signature dans `signatures_data`
        const { error: dataError } = await supabase
            .from('signatures_data')
            .insert([{
                request_id: requestData.id,
                page_index: pageIndex || 0,
                x: x || 0,
                y: y || 0,
                image_base64: signatureBase64
            }]);

        if (dataError) {
            console.error("Erreur DB:", dataError);
            return res.status(500).json({ error: "Erreur lors de la sauvegarde de la signature." });
        }

        // 3. Mettre à jour le statut de la requête
        await supabase
            .from('signature_requests')
            .update({ status: 'signed' })
            .eq('id', requestData.id);

        // 4. (Optionnel) Vérifier si tous les signataires ont signé pour marquer le document complet
        const { data: allRequests } = await supabase
            .from('signature_requests')
            .select('status, signer_email')
            .eq('document_id', requestData.document_id);

        const allSigned = allRequests && allRequests.every(r => r.status === 'signed');

        if (allSigned) {
            // 1. Download original PDF
            const origRes = await fetch(requestData.signature_documents.original_file_url);
            const origBuffer = await origRes.arrayBuffer();
            const pdfDoc = await PDFDocument.load(origBuffer);
            const pages = pdfDoc.getPages();

            // 2. Fetch all signatures_data for this document
            const { data: allSigsData } = await supabase
                .from('signatures_data')
                .select('*, signature_requests!inner(document_id)')
                .eq('signature_requests.document_id', requestData.document_id);

            if (allSigsData) {
                for (const sig of allSigsData) {
                    const page = pages[sig.page_index || 0];
                    if (!page) continue;

                    const { width, height } = page.getSize();
                    const xPos = (sig.x / 100) * width;
                    const yPos = height - ((sig.y / 100) * height);
                    
                    let sigObj;
                    try { sigObj = JSON.parse(sig.image_base64); } catch(e) {}
                    
                    // Use dynamic width from frontend, fallback to 20%
                    const boxWidthPct = (sigObj && sigObj.boxWidth) ? sigObj.boxWidth : 20;
                    const sigWidth = (boxWidthPct / 100) * width;
                    
                    if (sigObj && sigObj.type === 'path') {
                        const canvasW = sigObj.width || 460;
                        const scale = sigWidth / canvasW;
                        
                        // drawSvgPath uses top-left origin just like SVG
                        page.drawSvgPath(sigObj.data, { 
                            x: xPos, 
                            y: yPos, // Y is top-left for drawSvgPath
                            scale: scale, 
                            borderColor: require('pdf-lib').rgb(0, 0, 0),
                            borderWidth: 2
                        });
                    } else if (sigObj && sigObj.type === 'text') {
                        page.drawText(sigObj.data, { 
                            x: xPos, 
                            y: yPos - 20, 
                            size: 24, 
                            color: require('pdf-lib').rgb(0, 0, 0) 
                        });
                    } else {
                        // Legacy base64 or image object
                        let base64Data = sig.image_base64;
                        if (sigObj && sigObj.type === 'image') {
                            base64Data = sigObj.data;
                        }
                        base64Data = base64Data.split(',')[1] || base64Data;
                        const imgBuffer = Buffer.from(base64Data, 'base64');
                        let pdfImage;
                        try {
                            pdfImage = await pdfDoc.embedPng(imgBuffer);
                        } catch (e) {
                            try {
                                pdfImage = await pdfDoc.embedJpg(imgBuffer);
                            } catch (err) {
                                console.error("Could not embed image", err);
                                continue;
                            }
                        }
                        const sigHeight = (pdfImage.height / pdfImage.width) * sigWidth;
                        page.drawImage(pdfImage, {
                            x: xPos,
                            y: yPos - sigHeight,
                            width: sigWidth,
                            height: sigHeight
                        });
                    }
                }
            }

            // 3. Save final PDF
            const finalPdfBytes = await pdfDoc.save();
            const finalFileName = `final_${Date.now()}_${uuidv4()}.pdf`;

            await supabase.storage
                .from('signatures')
                .upload(finalFileName, finalPdfBytes, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            const { data: finalPublicUrlData } = supabase.storage
                .from('signatures')
                .getPublicUrl(finalFileName);

            const finalFileUrl = finalPublicUrlData.publicUrl;

            // 4. Update document status
            await supabase
                .from('signature_documents')
                .update({ status: 'completed', final_file_url: finalFileUrl })
                .eq('id', requestData.document_id);

            // Envoyer l'email final à tous les signataires
            const allEmails = allRequests.map(r => r.signer_email);
            const htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Document signé avec succès !</h2>
                    <p>Bonjour,</p>
                    <p>Tous les signataires ont terminé de signer le document. Vous pouvez télécharger le document final signé en cliquant sur le lien ci-dessous :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${finalFileUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Télécharger le document</a>
                    </div>
                    <p style="color: #666; font-size: 12px;">Merci d'utiliser Fast Transfer.</p>
                </div>
            `;

            // Envoi asynchrone sans bloquer la complétion
            Promise.allSettled(allEmails.map(email => sendSignatureEmail({
                to_email: email,
                to_name: 'Signataire',
                signLink: finalFileUrl,
                subject: "Votre document a été entièrement signé",
                htmlContent: htmlContent
            }))).catch(err => console.error("Erreur envoi email final:", err));

            return res.json({ success: true, message: "Signature enregistrée avec succès.", finalFileUrl });
        }

        return res.json({ success: true, message: "Signature enregistrée avec succès." });

    } catch (error) {
        console.error('SIGNATURE_ERROR:', error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

module.exports = router;
