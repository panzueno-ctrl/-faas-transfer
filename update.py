import re

# Update OrganizeEditor.tsx
with open('mobile/src/components/OrganizeEditor.tsx', 'r') as f:
    text = f.read()
text = text.replace('originalIndex: number;', 'originalIndex: number;\n    pageCount?: number;')
with open('mobile/src/components/OrganizeEditor.tsx', 'w') as f:
    f.write(text)

# Update MergeEditor.tsx
with open('mobile/src/components/MergeEditor.tsx', 'r') as f:
    text = f.read()
text = text.replace('const pageCount = pages.filter(p => p.fileIndex === file.originalIndex).length;',
                    'const pageCount = file.pageCount || pages.filter(p => p.fileIndex === file.originalIndex).length;')
with open('mobile/src/components/MergeEditor.tsx', 'w') as f:
    f.write(text)

# Update convert.tsx
with open('mobile/src/app/convert.tsx', 'r') as f:
    text = f.read()

# Add pageCount to newOrganizeFiles.push
text = text.replace('newOrganizeFiles.push({ name: file.name, color, originalIndex: fileIndex, buffer: arrayBuffer });',
                    'newOrganizeFiles.push({ name: file.name, color, originalIndex: fileIndex, buffer: arrayBuffer, pageCount: undefined });')

# Replace the loop with async loading
old_code = '''const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const pdf = await loadingTask.promise;
                            
                            for (let j = 1; j <= pdf.numPages; j++) {
                                const page = await pdf.getPage(j);
                                const viewport = page.getViewport({ scale: 1.0 }); // Résolution standard pour miniatures
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                canvas.width = viewport.width;
                                canvas.height = viewport.height;
                                
                                if (ctx) {
                                    await page.render({ canvasContext: ctx, viewport }).promise;
                                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                    newOrganizePages.push({
                                        id: \\\\-\\-\\\\,
                                        fileIndex: fileIndex,
                                        fileName: file.name,
                                        pageIndex: j-1,
                                        imageUri: dataUrl
                                    });
                                }
                            }
                            continue; // On passe au fichier suivant sans appeler le backend'''

new_code = '''const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const pdf = await loadingTask.promise;
                            
                            // Set page count on the file
                            const f_obj = newOrganizeFiles.find(f => f.originalIndex === fileIndex);
                            if (f_obj) f_obj.pageCount = pdf.numPages;
                            
                            // Generate ONLY the first page immediately
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
                                        id: \\\\-0-\\\\,
                                        fileIndex: fileIndex,
                                        fileName: file.name,
                                        pageIndex: 0,
                                        imageUri: dataUrl
                                    });
                                }
                            }

                            // Generate the rest asynchronously
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
                                                
                                                setOrganizePages((prev) => [...prev, {
                                                    id: \\\\-\\-\\\\,
                                                    fileIndex: fileIndex,
                                                    fileName: file.name,
                                                    pageIndex: j-1,
                                                    imageUri: dataUrl
                                                }]);
                                            }
                                        } catch (e) {
                                            console.warn('Async thumbnail error', e);
                                        }
                                    }
                                })();
                            }
                            continue; // On passe au fichier suivant sans appeler le backend'''

text = text.replace(old_code, new_code)
with open('mobile/src/app/convert.tsx', 'w') as f:
    f.write(text)
