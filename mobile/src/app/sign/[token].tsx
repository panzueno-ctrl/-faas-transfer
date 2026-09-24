import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import PdfEditor from '../../components/PdfEditor';
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
            const { request } = await res.json();
            
            if (request.status === 'signed') {
                setDone(true);
                setLoading(false);
                return;
            }

            setRequestData(request);
            
            // Generate PDF images for PdfEditor
            await loadPdfImages(request.signature_documents.original_file_url);
            
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    const loadPdfImages = async (pdfUrl: string) => {
        try {
            // 1. Download PDF
            const pdfRes = await fetch(pdfUrl);
            if (!pdfRes.ok) throw new Error("Impossible de télécharger le PDF");
            const pdfBlob = await pdfRes.blob();
            
            // 2. Convert to images via backend
            const formData = new FormData();
            formData.append('file', pdfBlob, 'document.pdf');
            
            const convRes = await fetch(`${SERVER_URL}/convert/pdf-to-image`, {
                method: 'POST',
                body: formData
            });
            
            if (!convRes.ok) throw new Error("Erreur de conversion");
            
            const contentType = convRes.headers.get('content-type');
            const blob = await convRes.blob();
            const pages: string[] = [];
            
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
            
            setPdfPages(pages);
        } catch (err: any) {
            console.error(err);
            throw new Error("Erreur lors de l'initialisation du document: " + err.message);
        }
    };

    const handleComplete = async (edits: any[]) => {
        // We only care about signatures
        const signatures = edits.filter(e => e.type === 'signature' && e.image);
        if (signatures.length === 0) {
            const msg = "Veuillez ajouter votre signature avant de valider.";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Erreur", msg);
            return;
        }

        setSubmitting(true);
        try {
            // Take the first signature (or send all if needed, but let's assume 1)
            const sig = signatures[0];
            
            // Remove data:image/png;base64, prefix if present
            const base64Data = sig.image.split(',')[1] || sig.image;

            const res = await fetch(`${SERVER_URL}/signature/complete-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    signatureBase64: base64Data,
                    x: sig.x || 0,
                    y: sig.y || 0,
                    pageIndex: sig.pageIndex || 0
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erreur de validation");
            }
            
            setDone(true);
        } catch (err: any) {
            console.error(err);
            if (Platform.OS === 'web') window.alert(err.message);
            else Alert.alert("Erreur", err.message);
        } finally {
            setSubmitting(false);
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
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                </View>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>C'est tout bon !</Text>
                <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', maxWidth: 400 }}>
                    Votre signature a été enregistrée avec succès. Vous pouvez maintenant fermer cette page.
                </Text>
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
