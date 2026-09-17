const fs = require('fs');
let convert = fs.readFileSync('mobile/src/app/convert.tsx', 'utf8');

// Update to set pageCount
convert = convert.replace(
  /newOrganizeFiles\\.push\\(\\{ name: file\\.name, color, originalIndex: fileIndex, buffer: arrayBuffer, pageCount: undefined \\}\\);/,
  'newOrganizeFiles.push({ name: file.name, color, originalIndex: fileIndex, buffer: arrayBuffer, pageCount: undefined }); // temp placeholder'
);

convert = convert.replace(
  /const loadingTask = pdfjsLib\\.getDocument\\(\\{ data: arrayBuffer \\}\\);\\s*const pdf = await loadingTask\\.promise;/g,
  \const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const pdf = await loadingTask.promise;
                            
                            // Mettre à jour pageCount pour le fichier
                            const fileObj = newOrganizeFiles.find(f => f.originalIndex === fileIndex);
                            if (fileObj) fileObj.pageCount = pdf.numPages;
                            
                            // Générer UNIQUEMENT la première page pour affichage immédiat
                            if (pdf.numPages >= 1) {
                                const page = await pdf.getPage(1);
                                const viewport = page.getViewport({ scale: 1.0 });
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                canvas.width = viewport.width;
                                canvas.height = viewport.height;
                                if (ctx) {
                                    await page.render({ canvasContext: ctx, viewport }).promise;
                                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                    newOrganizePages.push({
                                        id: \\\\\\-0-\\\\\\,
                                        fileIndex: fileIndex,
                                        fileName: file.name,
                                        pageIndex: 0,
                                        imageUri: dataUrl
                                    });
                                }
                            }

                            // Générer le reste des pages en asynchrone (ne bloque pas le UI)
                            if (pdf.numPages > 1) {
                                (async () => {
                                    for (let j = 2; j <= pdf.numPages; j++) {
                                        try {
                                            const page = await pdf.getPage(j);
                                            const viewport = page.getViewport({ scale: 1.0 });
                                            const canvas = document.createElement('canvas');
                                            const ctx = canvas.getContext('2d');
                                            canvas.width = viewport.width;
                                            canvas.height = viewport.height;
                                            if (ctx) {
                                                await page.render({ canvasContext: ctx, viewport }).promise;
                                                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                                
                                                setOrganizePages((prev: any) => [...prev, {
                                                    id: \\\\\\-\\\-\\\\\\,
                                                    fileIndex: fileIndex,
                                                    fileName: file.name,
                                                    pageIndex: j-1,
                                                    imageUri: dataUrl
                                                }]);
                                            }
                                        } catch (e) {
                                            console.warn(\\\
