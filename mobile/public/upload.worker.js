// upload.worker.js

// Ce Worker ne fait QUE gérer les uploads réseau.
// Il reçoit les morceaux (Uint8Array) du Main Thread pour éviter le bug de lecture de File sous Android.

const activeUploads = new Map(); // partNumber -> Promise
const uploadedParts = []; 

self.onmessage = async (e) => {
    const { type } = e.data;

    if (type === 'upload_chunk') {
        const { chunkBuffer, partNumber, signedUrl } = e.data;

        const uploadPromise = new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', signedUrl);
            
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const eTag = xhr.getResponseHeader('ETag');
                    if (eTag) {
                        uploadedParts.push({ PartNumber: partNumber, ETag: eTag.replace(/"/g, '') });
                    }
                    // Informer le Main Thread que CE morceau est fini
                    self.postMessage({ type: 'chunk_success', partNumber, byteLength: chunkBuffer.byteLength });
                    resolve(true);
                } else {
                    reject(new Error('Erreur serveur HTTP ' + xhr.status + ' (Morceau ' + partNumber + ')'));
                }
            };
            
            xhr.onerror = () => reject(new Error('Coupure réseau détectée (Morceau ' + partNumber + ')'));
            
            try {
                xhr.send(chunkBuffer);
            } catch (err) {
                reject(new Error('XHR Send Error: ' + err.message));
            }
        });

        activeUploads.set(partNumber, uploadPromise);

        try {
            await uploadPromise;
        } catch (error) {
            self.postMessage({ type: 'error', message: 'WORKER_NETWORK_ERROR: ' + error.message });
        } finally {
            activeUploads.delete(partNumber);
        }
    } 
    else if (type === 'finish') {
        // Le Main Thread nous dit qu'il a tout envoyé. On attend la fin des uploads en cours.
        try {
            await Promise.all(activeUploads.values());
            uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);
            self.postMessage({ type: 'success', uploadedParts });
        } catch (error) {
            self.postMessage({ type: 'error', message: 'WORKER_FINISH_ERROR: ' + error.message });
        }
    }
};
