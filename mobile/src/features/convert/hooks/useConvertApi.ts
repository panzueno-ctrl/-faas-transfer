import { useState } from 'react';
import { Platform, Alert } from 'react-native';

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';

export function useConvertApi({ 
    setStep, setResultUrl, setLocalError, t, 
    selectedService, selectedFiles, options 
}: any) {
    const [processingTime, setProcessingTime] = useState(0);

    const processFiles = async (
        passwordOverride?: string, 
        filesOverride?: any[], 
        compressionLevelOverride?: string
    ) => {
        const targetFiles = filesOverride || selectedFiles;
        if (!targetFiles || targetFiles.length === 0) return;
        
        setStep('processing');
        setProcessingTime(0);

        if (Platform.OS === 'web') {
            (window as any)._processingTimer = setInterval(() => {
                setProcessingTime((prev: number) => prev + 1);
            }, 1000);
        }

        try {
            const formData = new FormData();
            
            for (let i = 0; i < targetFiles.length; i++) {
                const file = targetFiles[i];
                let blob;
                if (Platform.OS === 'web' && file.file) {
                    blob = file.file;
                } else {
                    const response_file = await fetch(file.uri);
                    blob = await response_file.blob();
                }
                
                const fieldName = selectedService?.multiple ? 'files' : 'file';
                formData.append(fieldName, blob, file.name);
                
                if (!selectedService?.multiple) break; 
            }

            if (selectedService?.id === 'protect-pdf') {
                formData.append('password', passwordOverride || options?.pdfPassword || 'faas2024');
            }
            if (selectedService?.id === 'compress-pdf') {
                formData.append('compressionLevel', compressionLevelOverride || options?.compressionLevel || 'recommended');
            }
            if (selectedService?.id === 'number-pdf') {
                formData.append('position', options?.numberingConfig?.position || 'bottom-center');
                formData.append('format', options?.numberingConfig?.format || 'total');
            }
            if (selectedService?.id === 'ocr-pdf') {
                formData.append('lang', options?.ocrLang || 'fra');
            }
            if (selectedService?.id === 'pdf-to-image' || selectedService?.id === 'image-to-pdf') {
                formData.append('quality', options?.conversionQuality || 'standard');
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); 

            const response = await fetch(`${SERVER_URL}${selectedService?.endpoint}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('NotImplemented');
                }
                const errorText = await response.text();
                throw new Error(errorText || 'Erreur serveur');
            }

            let resultBlob;
            
            if (selectedService?.id === 'compress-pdf') {
                const data = await response.json();
                if (!data.jobId) throw new Error('Erreur serveur (pas de jobId)');
                
                const jobId = data.jobId;
                
                let pollingSeconds = 0;
                while (true) {
                    await new Promise(r => setTimeout(r, 3000));
                    pollingSeconds += 3;
                    
                    if (pollingSeconds >= 30) {
                        throw new Error("Délai dépassé (30s) : Fichier trop lourd pour notre serveur gratuit. Veuillez utiliser un fichier de moins de 10 Mo.");
                    }

                    const statusRes = await fetch(`${SERVER_URL}/convert/status/${jobId}`);
                    if (!statusRes.ok) throw new Error('Erreur serveur');
                    
                    const statusData = await statusRes.json();
                    
                    if (statusData.status === 'done') {
                        const blobRes = await fetch(`${SERVER_URL}/convert/download/${jobId}`);
                        if (!blobRes.ok) throw new Error('Erreur serveur au téléchargement');
                        resultBlob = await blobRes.blob();
                        break;
                    } else if (statusData.status === 'error') {
                        throw new Error(statusData.error || 'La compression a échoué.');
                    }
                }
            } else {
                resultBlob = await response.blob();
            }

            const url = URL.createObjectURL(resultBlob);
            setResultUrl(url);
            setStep('done');
            if ((window as any)._processingTimer) {
                clearInterval((window as any)._processingTimer);
            }

        } catch (error: any) {
            if ((window as any)._processingTimer) {
                clearInterval((window as any)._processingTimer);
            }
            console.error('CONVERT_ERROR:', error);
            let errorMsg = error.message && error.message !== 'Erreur serveur' && error.message !== 'Failed to fetch' ? error.message : 'Le traitement a échoué. Vérifiez vos fichiers et réessayez.';
            if (error.name === 'AbortError' || (error.message && error.message.includes('aborted'))) {
                errorMsg = 'Le serveur (hébergement gratuit) met trop de temps à répondre pour ce fichier lourd. Le délai a expiré.';
            } else if (error.message === 'NotImplemented') {
                errorMsg = 'Cette fonctionnalité est en cours de développement et sera disponible prochainement !';
            }

            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert(t('common.error'), errorMsg);
            }
            setStep('staging');
        }
    };

    return {
        processingTime,
        processFiles
    };
}
