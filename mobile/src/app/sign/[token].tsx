import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Platform, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import PdfEditor from '../../features/convert/ui/PdfEditor';
import { loadPdfJs } from '../../features/convert/hooks/usePdfEngine';
import { Ionicons } from '@expo/vector-icons';
import JSZip from 'jszip';

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

export default function SignTokenScreen() {
    const { token } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    
    const [loading, setLoading] = useState(true);
    const [requestData, setRequestData] = useState<any>(null);
    const [pdfPages, setPdfPages] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [finalFileUrl, setFinalFileUrl] = useState<string | null>(null);

    // Multi-signers management
    const [allSigners, setAllSigners] = useState<any[]>([]);
    const [signedCount, setSignedCount] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(1);
    const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

    useEffect(() => {
        if (!token) return;
        fetchRequestData();
    }, [token]);

    const fetchRequestData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${SERVER_URL}/signature/request/${token}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Demande introuvable");
            }
            const resData = await res.json();
            const request = resData.request || resData;

            if (!request) {
                throw new Error("Données de la demande introuvables.");
            }

            if (resData.allSigners) setAllSigners(resData.allSigners);
            if (resData.signedCount !== undefined) setSignedCount(resData.signedCount);
            if (resData.totalCount !== undefined) setTotalCount(resData.totalCount);

            if (request.signature_documents && request.signature_documents.final_file_url) {
                setFinalFileUrl(request.signature_documents.final_file_url);
            }

            setRequestData(request);
            
            if (request.status === 'signed') {
                setDone(true);
                setLoading(false);
                return;
            }
            
            const doc = request.signature_documents;
            const pdfUrl = doc?.original_file_url;
            if (!pdfUrl) {
                throw new Error("URL du document original introuvable.");
            }

            // Generate PDF images for PdfEditor
            await loadPdfImages(pdfUrl);
            
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    const loadPdfImages = async (pdfUrl: string) => {
        try {
            // 1. Download PDF arrayBuffer
            const pdfRes = await fetch(pdfUrl);
            if (!pdfRes.ok) throw new Error("Impossible de télécharger le PDF");
            const arrayBuffer = await pdfRes.arrayBuffer();

            let pages: string[] = [];

            // Fast client-side rendering via pdf.js on web
            if (Platform.OS === 'web') {
                try {
                    const pdfjsLib = await loadPdfJs();
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                    const pdf = await loadingTask.promise;
                    for (let j = 1; j <= pdf.numPages; j++) {
                        const page = await pdf.getPage(j);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            await page.render({ canvasContext: ctx, viewport }).promise;
                            pages.push(canvas.toDataURL('image/jpeg', 0.85));
                        }
                    }
                } catch (pdfJsErr) {
                    console.warn("Client-side PDF.js rendering failed, falling back to server:", pdfJsErr);
                }
            }

            // Fallback to backend /convert/pdf-to-image if needed
            if (pages.length === 0) {
                const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const formData = new FormData();
                formData.append('file', pdfBlob, 'document.pdf');
                
                const convRes = await fetch(`${SERVER_URL}/convert/pdf-to-image`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!convRes.ok) throw new Error("Erreur de conversion");
                
                const contentType = convRes.headers.get('content-type');
                const blob = await convRes.blob();
                
                if (contentType?.includes('zip')) {
                    const zip = new JSZip();
                    const unzipped = await zip.loadAsync(blob);
                    const fileNames = Object.keys(unzipped.files).sort();
                    for (const filename of fileNames) {
                        const f = unzipped.files[filename];
                        if (!f.dir) {
                            const imgBlob = await f.async('blob');
                            pages.push(URL.createObjectURL(imgBlob));
                        }
                    }
                } else {
                    pages.push(URL.createObjectURL(blob));
                }
            }
            
            setPdfPages(pages);
        } catch (err: any) {
            console.error(err);
            throw new Error("Erreur lors de l'initialisation du document: " + err.message);
        }
    };

    const handleComplete = async (edits: any[]) => {
        // We only care about signatures
        const signatures = edits.filter(e => e.type === 'signature' && e.signatureData);
        if (signatures.length === 0) {
            const msg = "Veuillez ajouter votre signature avant de valider.";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Erreur", msg);
            return;
        }

        setSubmitting(true);
        try {
            // Take the first signature
            const sig = signatures[0];
            
            // Inject box width and height into signatureData
            const signaturePayload = {
                ...sig.signatureData,
                boxWidth: sig.width || 20,
                boxHeight: sig.height || 10
            };
            const signatureStr = JSON.stringify(signaturePayload);

            const res = await fetch(`${SERVER_URL}/signature/complete-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    signatureBase64: signatureStr,
                    x: sig.x || 0,
                    y: sig.y || 0,
                    pageIndex: sig.pageIndex || 0
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erreur de validation");
            }
            
            const resData = await res.json();
            if (resData.finalFileUrl) {
                setFinalFileUrl(resData.finalFileUrl);
            }
            if (resData.signedCount !== undefined) setSignedCount(resData.signedCount);
            if (resData.totalCount !== undefined) setTotalCount(resData.totalCount);
            
            setDone(true);
            await fetchRequestData();
        } catch (err: any) {
            console.error(err);
            if (Platform.OS === 'web') window.alert(err.message);
            else Alert.alert("Erreur", err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalizeEarly = async () => {
        const confirmMsg = "Voulez-vous clôturer le document maintenant avec les signatures actuelles ? Un document final sera généré sans attendre les autres signataires.";
        if (Platform.OS === 'web') {
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            setIsFinalizing(true);
            const res = await fetch(`${SERVER_URL}/signature/finalize-early`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erreur lors de la clôture");
            }

            const data = await res.json();
            if (data.finalFileUrl) {
                setFinalFileUrl(data.finalFileUrl);
                if (Platform.OS === 'web') {
                    window.open(data.finalFileUrl, '_blank');
                }
            }
            await fetchRequestData();
        } catch (e: any) {
            console.error(e);
            if (Platform.OS === 'web') window.alert(e.message);
            else Alert.alert("Erreur", e.message);
        } finally {
            setIsFinalizing(false);
        }
    };

    if (loading || submitting) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: 16 }}>
                    {submitting ? "Enregistrement de la signature..." : "Chargement du document..."}
                </Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.danger} style={{ marginBottom: 16 }} />
                <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center' }}>{error}</Text>
            </SafeAreaView>
        );
    }

    if (done) {
        const isCompleted = (signedCount > 0 && signedCount === totalCount) || (requestData?.signature_documents?.status === 'completed');

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Ionicons name="checkmark-circle" size={44} color={colors.success} />
                </View>
                
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                    {isCompleted ? "Document entièrement signé !" : "Votre signature est validée !"}
                </Text>
                
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 460, marginBottom: 20, lineHeight: 20 }}>
                    {isCompleted 
                        ? "Tous les participants ont signé le document. Vous pouvez télécharger la version officielle ci-dessous." 
                        : "Votre signature a été apposée sur le document avec succès. Vous pouvez télécharger dès maintenant la version signée disponible."}
                </Text>

                {/* Checklist des signataires */}
                {totalCount > 1 && (
                    <View style={{ width: '100%', maxWidth: 480, backgroundColor: colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="people-outline" size={18} color={colors.text} />
                                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                                    Signataires ({signedCount}/{totalCount})
                                </Text>
                            </View>
                            <View style={{ backgroundColor: isCompleted ? colors.success + '20' : colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                <Text style={{ color: isCompleted ? colors.success : colors.primary, fontSize: 12, fontWeight: '700' }}>
                                    {isCompleted ? "Complet" : `${signedCount} sur ${totalCount}`}
                                </Text>
                            </View>
                        </View>

                        {allSigners && allSigners.map((s: any, idx: number) => {
                            const isSigned = s.status === 'signed';
                            return (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: colors.border + '40' }}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                                            {s.signer_name || s.signer_email}
                                        </Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                                            {s.signer_email}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isSigned ? colors.success + '15' : '#f59e0b15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                        <Ionicons 
                                            name={isSigned ? "checkmark-circle" : "time-outline"} 
                                            size={14} 
                                            color={isSigned ? colors.success : "#f59e0b"} 
                                        />
                                        <Text style={{ color: isSigned ? colors.success : "#f59e0b", fontSize: 11, fontWeight: '600' }}>
                                            {isSigned ? "Signé" : "En attente"}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Téléchargement immédiat du PDF signé */}
                {finalFileUrl && (
                    <a 
                        href={finalFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                            backgroundColor: '#10b981',
                            padding: '14px 26px',
                            borderRadius: '12px',
                            color: 'white',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: 14,
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                        }}
                    >
                        <Ionicons name="download-outline" size={20} color="white" />
                        {isCompleted ? "Télécharger le document final" : "Télécharger la version signée actuelle"}
                    </a>
                )}

                {/* Option de clôture anticipée si des signataires sont en attente */}
                {!isCompleted && totalCount > 1 && (
                    <View style={{ alignItems: 'center', marginTop: 6, maxWidth: 460 }}>
                        <Pressable 
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                borderRadius: 10,
                                backgroundColor: colors.card,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                            onPress={handleFinalizeEarly}
                            disabled={isFinalizing}
                        >
                            {isFinalizing ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="flash-outline" size={16} color={colors.primary} />
                            )}
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                                {isFinalizing ? "Clôture en cours..." : "Clôturer le document maintenant (sans attendre)"}
                            </Text>
                        </Pressable>
                        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 6, lineHeight: 16 }}>
                            Un participant tarde ou a une adresse e-mail erronée ? Vous pouvez clôturer le document maintenant avec les signatures déjà apposées.
                        </Text>
                    </View>
                )}
            </SafeAreaView>
        );
    }

    if (pdfPages.length > 0) {
        return (
            <PdfEditor
                pages={pdfPages}
                onComplete={handleComplete}
                onCancel={() => {
                    const msg = "Êtes-vous sûr de vouloir annuler ?";
                    if (Platform.OS === 'web') {
                        if (window.confirm(msg)) window.close();
                    } else {
                        Alert.alert("Annuler", msg, [
                            { text: "Non" },
                            { text: "Oui", style: "destructive", onPress: () => router.back() }
                        ]);
                    }
                }}
                colors={colors}
                autoOpenSignTool={true}
                restrictedMode={true}
            />
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
