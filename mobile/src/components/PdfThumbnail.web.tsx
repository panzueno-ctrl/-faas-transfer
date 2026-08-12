import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

let pdfjsLib: any = null;

const initPdfJs = async () => {
    if (pdfjsLib) return pdfjsLib;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => {
            const pdfjs = (window as any).pdfjsLib;
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            pdfjsLib = pdfjs;
            resolve(pdfjs);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export default function PdfThumbnail({ fileUri, pageIndex, style }: { fileUri: string, pageIndex: number, style?: any }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        
        const renderPage = async () => {
            try {
                const pdfjs = await initPdfJs();
                
                const loadingTask = pdfjs.getDocument(fileUri);
                const pdf = await loadingTask.promise;
                
                if (!active) return;
                
                const page = await pdf.getPage(pageIndex + 1);
                if (!active) return;
                
                const viewport = page.getViewport({ scale: 0.5 });
                
                const canvas = canvasRef.current;
                if (!canvas) return;
                
                const context = canvas.getContext('2d');
                if (!context) return;
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
                if (active) {
                    setLoading(false);
                }
            } catch (e) {
                console.error("Erreur thumbnail PDF:", e);
                if (active) {
                    setError(true);
                    setLoading(false);
                }
            }
        };
        
        renderPage();
        
        return () => { active = false; };
    }, [fileUri, pageIndex]);

    return (
        <View style={[{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }, style]}>
            {/* @ts-ignore */}
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: loading || error ? 'none' : 'block' }} />
            {loading && <ActivityIndicator size="small" color="#4F46E5" />}
            {error && <View style={{ width: 24, height: 24, backgroundColor: '#ff4444', borderRadius: 12 }} />}
        </View>
    );
}
