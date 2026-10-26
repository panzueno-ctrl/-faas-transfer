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
 * Compile le document PDF en y incrustant toutes les signatures actuellement disponibles
 * dans Supabase.
 * @param {string} documentId - ID du document
 * @param {boolean} markCompleted - Si true, marque le document comme 'completed'
 * @returns {Promise<string>} URL publique du document signé généré
 */
async function compileAndSaveSignedPdf(documentId, markCompleted = false) {
    // 1. Récupérer le document
    const { data: docData, error: docErr } = await supabase
        .from('signature_documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (docErr || !docData) throw new Error("Document introuvable");

    // 2. Télécharger le PDF original
    const origRes = await fetch(docData.original_file_url);
    if (!origRes.ok) throw new Error("Impossible de charger le document PDF original.");
    const origBuffer = await origRes.arrayBuffer();
    const pdfDoc = await PDFDocument.load(origBuffer);
    const pages = pdfDoc.getPages();

    // 3. Récupérer toutes les signatures existantes pour ce document
    const { data: allSigsData } = await supabase
        .from('signatures_data')
        .select('*, signature_requests!inner(document_id)')
        .eq('signature_requests.document_id', documentId);

    if (allSigsData && allSigsData.length > 0) {
        for (const sig of allSigsData) {
            const page = pages[sig.page_index || 0];
            if (!page) continue;

            const { width, height } = page.getSize();
            const xPos = (sig.x / 100) * width;
            const yPos = height - ((sig.y / 100) * height);

            let sigObj;
            try { sigObj = JSON.parse(sig.image_base64); } catch(e) {}

            const boxWidthPct = (sigObj && sigObj.boxWidth) ? sigObj.boxWidth : 20;
            const sigWidth = (boxWidthPct / 100) * width;

            if (sigObj && sigObj.type === 'path') {
                const canvasW = sigObj.width || 460;
                const scale = sigWidth / canvasW;

                page.drawSvgPath(sigObj.data, {
                    x: xPos,
                    y: yPos,
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

    // 4. Sauvegarder et uploader le PDF sur Supabase Storage
    const finalPdfBytes = await pdfDoc.save();
    const finalFileName = `signed_${documentId}_${Date.now()}.pdf`;

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

    // 5. Mettre à jour l'entrée signature_documents
    const updatePayload = { final_file_url: finalFileUrl };
    if (markCompleted) {
        updatePayload.status = 'completed';
    }

    await supabase
        .from('signature_documents')
        .update(updatePayload)
        .eq('id', documentId);

    return finalFileUrl;
}

/**
 * GET /signature/request/:token
 * Récupère les infos d'une demande de signature via son token unique,
 * ainsi que l'état d'avancement de l'ensemble des signataires.
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
                    final_file_url,
                    status
                )
            `)
            .eq('token', token)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: "Demande introuvable ou invalide." });
        }

        // Récupérer l'état de l'ensemble des signataires pour ce document
        const { data: allSigners } = await supabase
            .from('signature_requests')
            .select('signer_name, signer_email, status')
            .eq('document_id', data.document_id);

        const totalCount = allSigners ? allSigners.length : 1;
        const signedCount = allSigners ? allSigners.filter(s => s.status === 'signed').length : (data.status === 'signed' ? 1 : 0);
        const allSigned = (totalCount > 0 && signedCount === totalCount) || (data.signature_documents?.status === 'completed');

        return res.json({ 
            request: data, 
            ...data,
            allSigners: allSigners || [],
            totalCount,
            signedCount,
            allSigned
        });

    } catch (error) {
        console.error('SIGNATURE_ERROR:', error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * POST /signature/complete-request
 * Enregistre la signature apposée par l'utilisateur (dessin ou image)
 * et génère immédiatement le document PDF mis à jour avec les signatures disponibles.
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

        // 4. Calculer le progrès de signature
        const { data: allRequests } = await supabase
            .from('signature_requests')
            .select('status, signer_email, signer_name')
            .eq('document_id', requestData.document_id);

        const totalCount = allRequests ? allRequests.length : 1;
        const signedCount = allRequests ? allRequests.filter(r => r.status === 'signed').length : 1;
        const allSigned = totalCount > 0 && signedCount === totalCount;

        // 5. Générer IMMÉDIATEMENT le PDF avec les signatures disponibles !
        const finalFileUrl = await compileAndSaveSignedPdf(requestData.document_id, allSigned);

        if (allSigned) {
            // Envoyer l'email final à tous les signataires
            const allEmails = allRequests.map(r => r.signer_email);
            const htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Document signé avec succès !</h2>
                    <p>Bonjour,</p>
                    <p>Tous les signataires ont terminé de signer le document. Vous pouvez télécharger le document final signé en cliquant sur le lien ci-dessous :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${finalFileUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Télécharger le document final</a>
                    </div>
                    <p style="color: #666; font-size: 12px;">Merci d'utiliser Fast Transfer.</p>
                </div>
            `;

            Promise.allSettled(allEmails.map(email => sendSignatureEmail({
                to_email: email,
                to_name: 'Signataire',
                signLink: finalFileUrl,
                subject: "Votre document a été entièrement signé",
                htmlContent: htmlContent
            }))).catch(err => console.error("Erreur envoi email final:", err));
        }

        return res.json({ 
            success: true, 
            message: "Signature enregistrée avec succès.", 
            finalFileUrl,
            allSigned,
            signedCount,
            totalCount
        });

    } catch (error) {
        console.error('SIGNATURE_ERROR:', error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * POST /signature/finalize-early
 * Permet de clôturer le document avec les signatures actuellement recueillies,
 * sans attendre les signataires manquants ou injoignables.
 */
router.post('/finalize-early', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: "Token requis." });
        }

        const { data: requestData, error: reqError } = await supabase
            .from('signature_requests')
            .select('id, document_id')
            .eq('token', token)
            .single();

        if (reqError || !requestData) {
            return res.status(404).json({ error: "Demande introuvable." });
        }

        // Forcer la compilation et marquer le document comme terminé
        const finalFileUrl = await compileAndSaveSignedPdf(requestData.document_id, true);

        // Envoyer l'e-mail final aux signataires ayant déjà signé
        const { data: allRequests } = await supabase
            .from('signature_requests')
            .select('status, signer_email')
            .eq('document_id', requestData.document_id);

        const signedEmails = allRequests ? allRequests.filter(r => r.status === 'signed').map(r => r.signer_email) : [];
        if (signedEmails.length > 0) {
            const htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Document clôturé et disponible</h2>
                    <p>Bonjour,</p>
                    <p>Le document a été clôturé avec les signatures validées. Vous pouvez télécharger votre document signé en cliquant sur le lien ci-dessous :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${finalFileUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Télécharger le document final</a>
                    </div>
                    <p style="color: #666; font-size: 12px;">Merci d'utiliser Fast Transfer.</p>
                </div>
            `;

            Promise.allSettled(signedEmails.map(email => sendSignatureEmail({
                to_email: email,
                to_name: 'Signataire',
                signLink: finalFileUrl,
                subject: "Votre document signé est prêt",
                htmlContent: htmlContent
            }))).catch(err => console.error("Erreur envoi email final:", err));
        }

        return res.json({ 
            success: true, 
            message: "Document clôturé avec succès.", 
            finalFileUrl 
        });

    } catch (error) {
        console.error('FINALIZE_EARLY_ERROR:', error);
        return res.status(500).json({ error: error.message || "Erreur lors de la clôture du document." });
    }
});

module.exports = router;
