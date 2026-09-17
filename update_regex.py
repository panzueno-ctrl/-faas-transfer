import re

with open('mobile/src/app/convert.tsx', 'r') as f:
    text = f.read()

pattern = r'const loadingTask = pdfjsLib\.getDocument\(\{ data: arrayBuffer \}\);\s*const pdf = await loadingTask\.promise;\s*for \(let j = 1; j <= pdf\.numPages; j\+\+\) \{.*?(?:continue; // On passe au fichier suivant sans appeler le backend)'

new_code = '''const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const pdf = await loadingTask.promise;
                            
                            const fileObj = newOrganizeFiles.find(f => f.originalIndex === fileIndex);
                            if (fileObj) fileObj.pageCount = pdf.numPages;
                            
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
                                        id: \\-0-\\,
                                        fileIndex: fileIndex,
                                        fileName: file.name,
                                        pageIndex: 0,
                                        imageUri: dataUrl
                                    });
                                }
                            }

                            if (pdf.numPages > 1) {
                                setTimeout(async () => {
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
                                                    id: \\-\-\\,
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
                                }, 100);
                            }
                            continue; // On passe au fichier suivant sans appeler le backend'''

text = re.sub(pattern, new_code.replace('\\', '').replace('\\$', '$'), text, flags=re.DOTALL)

with open('mobile/src/app/convert.tsx', 'w') as f:
    f.write(text)
