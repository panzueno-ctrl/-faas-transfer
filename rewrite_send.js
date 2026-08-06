const fs = require('fs');

let content = fs.readFileSync('mobile/src/app/send.tsx', 'utf8');

// Remove JSZip import
content = content.replace("import JSZip from 'jszip';\n", "");

// Replace uploadMultipleFiles function
const targetStart = "    const uploadMultipleFiles = async (files: any[]) => {";
const targetEnd = "    const copyLink = () => {";

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
    const newFunction = `    const uploadMultipleFiles = async (files: any[]) => {
        setStep('uploading');
        setProgress(0);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            // 1. Demander les tickets pour tous les fichiers
            const filePayload = files.map(f => ({
                fileName: f.name,
                contentType: f.mimeType || 'application/octet-stream'
            }));

            const reqUrlResponse = await fetch(\`\${SERVER_URL}/upload/request-urls\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filePayload })
            });

            if (!reqUrlResponse.ok) {
                throw new Error('Erreur lors de la demande de tickets au serveur');
            }

            const { batchId, uploadTickets } = await reqUrlResponse.json();

            // 2. Préparer le suivi de progression
            const progressMap = new Array(files.length).fill(0);
            const totalFiles = files.length;

            const updateGlobalProgress = () => {
                const totalProgress = progressMap.reduce((acc, curr) => acc + curr, 0);
                setProgress(Math.round(totalProgress / totalFiles));
            };

            // 3. Upload en parallèle (limité à 5 en même temps)
            const CONCURRENCY_LIMIT = 5;
            let currentIndex = 0;

            const uploadTaskWorker = async () => {
                while (currentIndex < files.length) {
                    const i = currentIndex++;
                    const file = files[i];
                    const ticket = uploadTickets[i];

                    if (Platform.OS === 'web') {
                        const xhr = new XMLHttpRequest();
                        xhr.open('PUT', ticket.signedUrl);
                        xhr.setRequestHeader('Content-Type', file.mimeType || 'application/octet-stream');
                        
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                progressMap[i] = (event.loaded / event.total) * 100;
                                updateGlobalProgress();
                            }
                        };
                        
                        let blob;
                        if (file.file instanceof Blob) {
                            blob = file.file;
                        } else {
                            const response_file = await fetch(file.uri);
                            blob = await response_file.blob();
                        }

                        await new Promise((resolve, reject) => {
                            xhr.onload = () => {
                                if (xhr.status >= 200 && xhr.status < 300) {
                                    progressMap[i] = 100;
                                    updateGlobalProgress();
                                    resolve(xhr.response);
                                } else reject(new Error('Erreur upload R2: ' + xhr.status));
                            };
                            xhr.onerror = () => reject(new Error('Erreur réseau'));
                            xhr.send(blob); 
                        });

                    } else {
                        const uploadTask = FileSystem.createUploadTask(
                            ticket.signedUrl,
                            file.uri,
                            {
                                httpMethod: 'PUT',
                                headers: {
                                    'Content-Type': file.mimeType || 'application/octet-stream'
                                }
                            },
                            (progressData) => {
                                progressMap[i] = (progressData.totalBytesSent / progressData.totalBytesExpectedToSend) * 100;
                                updateGlobalProgress();
                            }
                        );
                        
                        const uploadResult = await uploadTask.uploadAsync();
                        if (uploadResult?.status !== 200) {
                            throw new Error('Erreur upload Cloudflare R2 (Mobile)');
                        }
                        progressMap[i] = 100;
                        updateGlobalProgress();
                    }
                }
            };

            const workers = Array(Math.min(CONCURRENCY_LIMIT, files.length)).fill(null).map(() => uploadTaskWorker());
            await Promise.all(workers);

            setProgress(100);

            // 4. Confirmation finale
            const confirmResponse = await fetch(\`\${SERVER_URL}/upload/confirm\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: batchId,
                    files: uploadTickets.map((t: any) => ({
                        originalName: t.originalName,
                        storageName: t.storageName
                    })),
                    userId: session?.user?.id || null
                })
            });

            if (!confirmResponse.ok) {
                throw new Error('Erreur lors de la confirmation serveur');
            }

            const data = await confirmResponse.json();
            
            // Simulation d'un fichier fictif pour afficher le nom du lot sur l'écran "done"
            setSelectedFile({ name: \`Lot de \${files.length} fichiers\` });
            setResult(data);

            const transfer = {
                id: data.id,
                fileName: \`Lot de \${files.length} fichiers\`,
                downloadUrl: data.downloadUrl,
                sentAt: new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                status: 'pending',
            };

            const existing = await AsyncStorage.getItem('faas_history');
            const history = existing ? JSON.parse(existing) : [];
            history.unshift(transfer);
            await AsyncStorage.setItem('faas_history', JSON.stringify(history));

            setStep('done');

        } catch (error) {
            console.error(error);
            if (Platform.OS === 'web') window.alert(t('common.error') + '\\nImpossible d\\'envoyer le lot.');
            else Alert.alert(t('common.error'), 'Impossible d\\'envoyer le lot.');
            setStep('category');
        }
    };

`;

    const newContent = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
    fs.writeFileSync('mobile/src/app/send.tsx', newContent);
    console.log("send.tsx successfully updated!");
} else {
    console.log("Could not find uploadMultipleFiles or copyLink functions.");
}
