import re

with open('/home/daven/faas-transfer/mobile/src/app/convert.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """                                if (pdf.numPages > 1) {
                                    for (let j = 2; j <= pdf.numPages; j++) {
                                        if (sessionId !== currentRenderSession.current) break;
                                        try {
                                            const page = await pdf.getPage(j);
                                            const viewport = page.getViewport({ scale: 0.4 });
                                            const canvas = document.createElement('canvas');
                                            const ctx = canvas.getContext('2d');
                                            canvas.width = viewport.width;
                                            canvas.height = viewport.height;
                                            if (ctx) {
                                                await page.render({ canvasContext: ctx, viewport }).promise;
                                                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                                
                                                if (sessionId === currentRenderSession.current) {
                                                    setOrganizePages(prev => {
                                                        const next = [...prev];
                                                        const targetIdx = next.findIndex(p => p.fileIndex === fileIndex && p.pageIndex === j - 1);
                                                        if (targetIdx !== -1) {
                                                            next[targetIdx] = { ...next[targetIdx], imageUri: dataUrl };
                                                        }
                                                        return next;
                                                    });
                                                }
                                            }
                                            page.cleanup();
                                        } catch (e) {
                                            console.warn('Async thumbnail error', e);
                                        }
                                    }
                                }
                                loadingTask.destroy();"""

new_block = """                                const processRemainingPages = async (pdfDoc: any, fIndex: number, sId: number, lTask: any) => {
                                    try {
                                        if (pdfDoc.numPages > 1) {
                                            for (let j = 2; j <= pdfDoc.numPages; j++) {
                                                if (sId !== currentRenderSession.current) break;
                                                if (j % 5 === 0) await new Promise(r => setTimeout(r, 15));
                                                try {
                                                    const page = await pdfDoc.getPage(j);
                                                    const viewport = page.getViewport({ scale: 0.4 });
                                                    const canvas = document.createElement('canvas');
                                                    const ctx = canvas.getContext('2d');
                                                    canvas.width = viewport.width;
                                                    canvas.height = viewport.height;
                                                    if (ctx) {
                                                        await page.render({ canvasContext: ctx, viewport }).promise;
                                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                                        if (sId === currentRenderSession.current) {
                                                            setOrganizePages(prev => {
                                                                const next = [...prev];
                                                                const targetIdx = next.findIndex(p => p.fileIndex === fIndex && p.pageIndex === j - 1);
                                                                if (targetIdx !== -1) {
                                                                    next[targetIdx] = { ...next[targetIdx], imageUri: dataUrl };
                                                                }
                                                                return next;
                                                            });
                                                        }
                                                    }
                                                    page.cleanup();
                                                } catch (e) {
                                                    console.warn('Async thumbnail error', e);
                                                }
                                            }
                                        }
                                    } finally {
                                        lTask.destroy();
                                    }
                                };
                                processRemainingPages(pdf, fileIndex, sessionId, loadingTask);"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('/home/daven/faas-transfer/mobile/src/app/convert.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('OLD BLOCK NOT FOUND')
