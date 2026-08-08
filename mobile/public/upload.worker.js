// upload.worker.js

// L'API XMLHttpRequest et fetch sont disponibles dans un Web Worker.
// FileReader et File API (Blob, ReadableStream) sont également disponibles.

self.onmessage = async (e) => {
    const { 
        file, 
        storageName, 
        uploadId, 
        presignedUrls, 
        chunkSize, 
        maxConcurrency 
    } = e.data;

    try {
        const stream = file.stream();
        const reader = stream.getReader();
        const totalBytes = file.size;
        
        let partNumber = 1;
        let isStreamDone = false;
        let uploadedBytes = 0;
        const uploadedParts = []; // { PartNumber, ETag }
        
        const activeUploads = [];
        const allUploads = [];

        // Fonction d'upload optimisée sans appel serveur (les signatures sont déjà là)
        const uploadChunk = async (chunkBuffer, currentPartNumber) => {
            const signedUrl = presignedUrls[currentPartNumber];
            if (!signedUrl) {
                throw new Error('URL signée introuvable pour le morceau ' + currentPartNumber);
            }

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedUrl);
                
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const eTag = xhr.getResponseHeader('ETag');
                        if (eTag) {
                            uploadedParts.push({ PartNumber: currentPartNumber, ETag: eTag.replace(/"/g, '') });
                        }
                        uploadedBytes += chunkBuffer.byteLength;
                        
                        // Informer le Main Thread de la progression
                        const progress = Math.round((uploadedBytes / totalBytes) * 100);
                        self.postMessage({ type: 'progress', progress });
                        resolve(true);
                    } else {
                        reject(new Error('Erreur de transmission (Morceau ' + currentPartNumber + ')'));
                    }
                };
                
                xhr.onerror = () => reject(new Error('Coupure réseau détectée (Morceau ' + currentPartNumber + ')'));
                xhr.send(chunkBuffer);
            });
        };

        // Boucle Robinet
        let currentBuffer = new Uint8Array(chunkSize);
        let currentBufferLength = 0;

        while (!isStreamDone) {
            const { done, value } = await reader.read();
            
            if (value) {
                let valueOffset = 0;
                while (valueOffset < value.length) {
                    const spaceLeft = chunkSize - currentBufferLength;
                    const chunkToCopy = value.subarray(valueOffset, valueOffset + spaceLeft);
                    
                    currentBuffer.set(chunkToCopy, currentBufferLength);
                    currentBufferLength += chunkToCopy.length;
                    valueOffset += chunkToCopy.length;

                    if (currentBufferLength === chunkSize) {
                        const bufferToSend = currentBuffer;
                        const partNumToSend = partNumber++;
                        
                        currentBuffer = new Uint8Array(chunkSize);
                        currentBufferLength = 0;

                        const uploadPromise = uploadChunk(bufferToSend, partNumToSend);
                        
                        // Backpressure
                        const p = uploadPromise.then(() => {
                            activeUploads.splice(activeUploads.indexOf(p), 1);
                        });
                        activeUploads.push(p);
                        allUploads.push(p);

                        if (activeUploads.length >= maxConcurrency) {
                            await Promise.race(activeUploads);
                        }
                    }
                }
            }

            if (done) {
                isStreamDone = true;
                if (currentBufferLength > 0) {
                    const bufferToSend = currentBuffer.subarray(0, currentBufferLength);
                    const partNumToSend = partNumber++;
                    const uploadPromise = uploadChunk(bufferToSend, partNumToSend);
                    allUploads.push(uploadPromise);
                }
            }
        }

        // Attendre la fin
        await Promise.all(allUploads);
        
        // Trier les morceaux
        uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

        // Envoyer le succès au Main Thread
        self.postMessage({ type: 'success', uploadedParts });

    } catch (error) {
        // En cas d'erreur
        self.postMessage({ type: 'error', message: error.message });
    }
};
